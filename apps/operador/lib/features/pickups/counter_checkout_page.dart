import 'package:built_collection/built_collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/device.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/models.dart' show newUuid;
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/features/pickups/handover_status_page.dart';
import 'package:volti_operador/features/pickups/handover_ui.dart';
import 'package:volti_operador/features/tasks/task_ui.dart' show formatBrl, parseReaisToCents;
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Quantidade maxima por plano do balcao (diaria 1–30, semana 1–4, mes 1–3), como na API.
const counterQuantityMax = <CounterPlanCode, int>{
  CounterPlanCode.day: 30,
  CounterPlanCode.weekly: 4,
  CounterPlanCode.monthly: 3,
};

/// Fotos do contrato assinado: 1 a 4.
const maxContractPhotos = 4;

/// Caucao maxima aceita pela API (R$ 10.000,00).
const maxCounterDepositCents = 1000000;

/// Metodos de pagamento do balcao, na ordem da tela, com o nome do contrato (chaves dos testes).
const counterMethods = <(CounterPaymentMethod, String)>[
  (CounterPaymentMethod.counterCard, 'counter_card'),
  (CounterPaymentMethod.counterPix, 'counter_pix'),
  (CounterPaymentMethod.cash, 'cash'),
];

String counterMethodLabel(AppLocalizations t, CounterPaymentMethod m) => switch (m) {
      CounterPaymentMethod.counterCard => t.counterMethodCard,
      CounterPaymentMethod.counterPix => t.counterMethodPix,
      _ => t.counterMethodCash,
    };

String? _trimmed(String s) => s.trim().isEmpty ? null : s.trim();

/// "Contrato e pagamento" no balcao, depois da vistoria de saida: plano e quantidade,
/// seguro, valor calculado pela API, fotos do contrato, metodo e referencia do
/// pagamento (nunca dados do cartao) e caucao opcional. "Iniciar aluguel" envia
/// `POST /handovers/{id}/counter-checkout` com uma `Idempotency-Key` por tentativa
/// (a mesma enquanto os dados nao mudam). So com rede.
class CounterCheckoutPage extends ConsumerStatefulWidget {
  const CounterCheckoutPage({super.key, required this.handover, this.popOnSuccess = false});

  final Handover handover;

  /// Aberta pelo estado da entrega: devolve o [Rental] com `pop` em vez de abrir outro estado.
  final bool popOnSuccess;

  @override
  ConsumerState<CounterCheckoutPage> createState() => _CounterCheckoutPageState();
}

class _CounterCheckoutPageState extends ConsumerState<CounterCheckoutPage> {
  CounterPlanCode _plan = CounterPlanCode.day;
  int _quantity = 1;
  InsuranceCoverage _coverage = InsuranceCoverage.basic;

  CounterQuote? _quote;
  bool _quoting = false;
  bool _quoteFailed = false;
  int _quoteSeq = 0;

  final _photos = <String>[];
  final _uploaded = <String, String>{};
  CounterPaymentMethod? _method;
  final _reference = TextEditingController();
  final _depositAmount = TextEditingController();
  final _depositReference = TextEditingController();
  CounterPaymentMethod? _depositMethod;

  bool _sending = false;
  String? _error;
  NoticeTone _errorTone = NoticeTone.danger;

  /// Ultimo pedido enviado e a sua chave: reenvio igual reusa a chave.
  CounterCheckoutRequest? _lastRequest;
  String _key = newUuid();

  @override
  void initState() {
    super.initState();
    _loadQuote();
  }

  @override
  void dispose() {
    _reference.dispose();
    _depositAmount.dispose();
    _depositReference.dispose();
    super.dispose();
  }

  Future<void> _loadQuote() async {
    final seq = ++_quoteSeq;
    setState(() {
      _quoting = true;
      _quoteFailed = false;
    });
    try {
      final q = await ref.read(fieldRepositoryProvider).getCounterQuote(widget.handover.id,
          plan: _plan, coverage: _coverage, quantity: _quantity);
      if (!mounted || seq != _quoteSeq) return;
      setState(() => _quote = q);
    } on RepositoryException {
      if (!mounted || seq != _quoteSeq) return;
      setState(() {
        _quote = null;
        _quoteFailed = true;
      });
    } finally {
      if (mounted && seq == _quoteSeq) setState(() => _quoting = false);
    }
  }

  void _clearError() {
    if (_error != null) setState(() => _error = null);
  }

  void _selectPlan(CounterPlanCode p) {
    setState(() {
      _plan = p;
      _quantity = _quantity.clamp(1, counterQuantityMax[p]!);
      _error = null;
    });
    _loadQuote();
  }

  void _setQuantity(int n) {
    setState(() {
      _quantity = n.clamp(1, counterQuantityMax[_plan]!);
      _error = null;
    });
    _loadQuote();
  }

  void _selectCoverage(InsuranceCoverage c) {
    if (c == _coverage) return;
    setState(() {
      _coverage = c;
      _error = null;
    });
    _loadQuote();
  }

  Future<void> _takePhoto() async {
    final path = await ref.read(photoPickerProvider).take();
    if (path == null || !mounted) return;
    setState(() {
      _photos.add(path);
      _error = null;
    });
  }

  void _removePhoto(int i) => setState(() {
        _photos.removeAt(i);
        _error = null;
      });

  /// Caucao digitada: `null` = sem caucao; `-1` = valor invalido.
  int? get _depositCents {
    final text = _depositAmount.text.trim();
    if (text.isEmpty) return null;
    final cents = parseReaisToCents(text);
    if (cents == null || cents > maxCounterDepositCents) return -1;
    return cents == 0 ? null : cents;
  }

  /// O valor mostrado e o da selecao atual (nao uma cotacao antiga).
  bool get _quoteCurrent =>
      _quote != null &&
      !_quoting &&
      _quote!.planCode == _plan &&
      _quote!.quantity == _quantity &&
      _quote!.coverage == _coverage;

  List<String> _missing(AppLocalizations t) {
    final deposit = _depositCents;
    return [
      if (_photos.isEmpty) t.counterMissingPhoto,
      if (_method == null) t.counterMissingMethod,
      if (deposit != null && deposit > 0 && _depositMethod == null) t.counterMissingDepositMethod,
      if (!_quoteCurrent) t.counterMissingQuote,
    ];
  }

  bool get _canStart {
    final deposit = _depositCents;
    return !_sending &&
        _quoteCurrent &&
        _photos.isNotEmpty &&
        _method != null &&
        deposit != -1 &&
        (deposit == null || _depositMethod != null);
  }

  CounterCheckoutRequest _request(List<String> photoKeys, CounterQuote quote) {
    final deposit = _depositCents;
    return CounterCheckoutRequest((b) => b
      ..planCode = _plan
      ..quantity = _quantity
      ..coverage = _coverage
      ..contractPhotoKeys = ListBuilder<String>(photoKeys)
      ..payment.replace(CounterPaymentInput((p) => p
        ..method = _method
        ..amountCents = quote.totalCents
        ..reference = _trimmed(_reference.text)))
      ..deposit = deposit == null
          ? null
          : (CounterDepositInputBuilder()
            ..method = _depositMethod
            ..amountCents = deposit
            ..reference = _trimmed(_depositReference.text)));
  }

  /// Mesmo pedido = mesma tentativa (mesma chave); qualquer dado mudou = nova chave.
  String _keyFor(CounterCheckoutRequest r) {
    if (_lastRequest != null && r != _lastRequest) _key = newUuid();
    _lastRequest = r;
    return _key;
  }

  void _fail(String message, {NoticeTone tone = NoticeTone.danger}) => setState(() {
        _error = message;
        _errorTone = tone;
      });

  Future<void> _start() async {
    if (!_canStart) return;
    final t = AppLocalizations.of(context);
    final online = ref.read(onlineProvider).value ?? true;
    if (!online) return _fail(t.counterOffline, tone: NoticeTone.warning);
    final quote = _quote!;
    setState(() {
      _sending = true;
      _error = null;
    });
    final repo = ref.read(fieldRepositoryProvider);
    try {
      final keys = <String>[];
      for (final path in _photos) {
        // Foto ja enviada nao sobe de novo na proxima tentativa.
        final key = _uploaded[path] ?? await repo.uploadContractPhoto(path);
        _uploaded[path] = key;
        keys.add(key);
      }
      final req = _request(keys, quote);
      final rental =
          await repo.counterCheckout(widget.handover.id, req, idempotencyKey: _keyFor(req));
      if (!mounted) return;
      VoltiHaptics.success();
      if (widget.popOnSuccess) return Navigator.of(context).pop(rental);
      final started = widget.handover.rebuild((b) => b
        ..status = HandoverStatus.accepted
        ..rentalId = rental.id
        ..lastError = null);
      await Navigator.of(context).pushReplacement(MaterialPageRoute<void>(
          builder: (_) => HandoverStatusPage(handoverId: started.id, initial: started)));
    } on RepositoryException catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      switch (e.slug) {
        case 'counter-amount-mismatch':
          _fail(t.counterAmountChanged, tone: NoticeTone.warning);
          await _loadQuote();
        case 'location-consent-required':
          _fail(t.counterConsentRequired, tone: NoticeTone.warning);
        case 'handover-not-pending':
          // A entrega mudou (cancelada, disputada ou ja iniciada): mostra o estado atual.
          await Navigator.of(context).pushReplacement(MaterialPageRoute<void>(
              builder: (_) => HandoverStatusPage(handoverId: widget.handover.id)));
        default:
          _fail(e.kind == FailureKind.network && e.status == null ? t.counterOffline : e.message,
              tone: e.kind == FailureKind.network ? NoticeTone.warning : NoticeTone.danger);
      }
    } on Exception {
      if (!mounted) return;
      setState(() => _sending = false);
      _fail(t.errorGeneric);
    } finally {
      if (mounted && _sending) setState(() => _sending = false);
    }
  }

  String _quantityLabel(AppLocalizations t) => switch (_plan) {
        CounterPlanCode.weekly => t.counterQuantityWeeks(_quantity),
        CounterPlanCode.monthly => t.counterQuantityMonths(_quantity),
        _ => t.counterQuantityDays(_quantity),
      };

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final max = counterQuantityMax[_plan]!;
    final deposit = _depositCents;
    final missing = _missing(t);
    final quote = _quote;
    return Scaffold(
      body: Column(
        children: [
          OperatorTopBar(title: t.counterTitle),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
              children: [
                const ConnectivityBanner(padding: EdgeInsets.only(bottom: VoltiSpacing.s10)),
                Text(t.counterBody, style: VoltiTypography.body),
                if (widget.handover.vehicleCode != null) ...[
                  const SizedBox(height: VoltiSpacing.s6),
                  Text(t.handoverVehicle(widget.handover.vehicleCode!),
                      style: VoltiTypography.body.copyWith(fontFamily: VoltiTypography.fontMono)),
                ],
                SectionLabel(t.counterPlan),
                VoltiSegmentedControl<CounterPlanCode>(
                  key: const Key('counter-plan'),
                  options: [
                    VoltiSegment(value: CounterPlanCode.day, label: t.counterPlanDay),
                    VoltiSegment(value: CounterPlanCode.weekly, label: t.counterPlanWeekly),
                    VoltiSegment(value: CounterPlanCode.monthly, label: t.counterPlanMonthly),
                  ],
                  value: _plan,
                  onChanged: _sending ? null : _selectPlan,
                ),
                const SizedBox(height: VoltiSpacing.s12),
                SectionCard(
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(t.counterQuantity, style: VoltiTypography.label),
                            Text(_quantityLabel(t),
                                style: VoltiTypography.caption
                                    .copyWith(color: VoltiColors.textSecondary)),
                          ],
                        ),
                      ),
                      VoltiIconButton(
                        key: const Key('counter-quantity-minus'),
                        icon: LucideIcons.minus,
                        label: t.counterQuantityLess,
                        onPressed: _quantity > 1 && !_sending ? () => _setQuantity(_quantity - 1) : null,
                      ),
                      SizedBox(
                        width: 48,
                        child: Text(
                          '$_quantity',
                          key: const Key('counter-quantity'),
                          textAlign: TextAlign.center,
                          style: VoltiTypography.heading
                              .copyWith(fontFamily: VoltiTypography.fontMono),
                        ),
                      ),
                      VoltiIconButton(
                        key: const Key('counter-quantity-plus'),
                        icon: LucideIcons.plus,
                        label: t.counterQuantityMore,
                        onPressed:
                            _quantity < max && !_sending ? () => _setQuantity(_quantity + 1) : null,
                      ),
                    ],
                  ),
                ),
                SectionLabel(t.counterCoverage),
                for (final (c, title, note) in [
                  (InsuranceCoverage.basic, t.counterCoverageBasic, t.counterCoverageBasicNote),
                  (InsuranceCoverage.full, t.counterCoverageFull, t.counterCoverageFullNote),
                ])
                  Padding(
                    padding: const EdgeInsets.only(bottom: VoltiSpacing.s8),
                    child: OptionCard(
                      key: Key('counter-coverage-${c.name}'),
                      title: title,
                      badge: note,
                      icon: LucideIcons.shieldCheck,
                      selected: _coverage == c,
                      onTap: _sending ? null : () => _selectCoverage(c),
                    ),
                  ),
                const SizedBox(height: VoltiSpacing.s4),
                SectionCard(
                  key: const Key('counter-total'),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(t.counterTotal, style: VoltiTypography.label),
                      const SizedBox(height: VoltiSpacing.s4),
                      if (quote != null)
                        Text(formatBrl(quote.totalCents),
                            style: VoltiTypography.heading.copyWith(
                                fontFamily: VoltiTypography.fontMono,
                                color: _quoteCurrent ? null : VoltiColors.textTertiary))
                      else if (_quoting)
                        Text(t.counterQuoteLoading, style: VoltiTypography.body),
                      if (quote != null)
                        Text(
                            t.counterQuoteBreakdown(
                                formatBrl(quote.planCents), formatBrl(quote.insuranceCents)),
                            style: VoltiTypography.caption
                                .copyWith(color: VoltiColors.textSecondary)),
                      if (_quoteFailed) ...[
                        Text(t.counterQuoteError,
                            style: VoltiTypography.body.copyWith(color: VoltiColors.dangerInk)),
                        const SizedBox(height: VoltiSpacing.s8),
                        VoltiButton(
                          key: const Key('counter-quote-retry'),
                          label: t.counterQuoteRetry,
                          icon: LucideIcons.refreshCw,
                          variant: VoltiButtonVariant.secondary,
                          onPressed: _loadQuote,
                        ),
                      ],
                    ],
                  ),
                ),
                SectionLabel(t.counterContractPhotos, hint: t.counterContractPhotosHint),
                if (_photos.length < maxContractPhotos)
                  SectionCard(
                    padding: 4,
                    child: KeyedSubtree(
                      key: const Key('counter-contract-photo'),
                      child: ListRow(
                        icon: LucideIcons.fileSignature,
                        title: t.counterContractPhotoAdd,
                        trailing: ListRowTrailing.none,
                        onTap: _sending ? null : _takePhoto,
                      ),
                    ),
                  ),
                if (_photos.isNotEmpty) ...[
                  const SizedBox(height: VoltiSpacing.s10),
                  PhotoThumbnails(paths: _photos, onRemove: _sending ? (_) {} : _removePhoto),
                ],
                SectionLabel(t.counterMethod),
                _MethodChoice(
                  keyPrefix: 'counter-method',
                  value: _method,
                  onChanged: _sending
                      ? null
                      : (m) => setState(() {
                            _method = m;
                            _error = null;
                          }),
                ),
                const SizedBox(height: VoltiSpacing.s12),
                TextField(
                  key: const Key('counter-reference'),
                  controller: _reference,
                  maxLength: 64,
                  enabled: !_sending,
                  decoration: InputDecoration(
                    labelText: t.counterReference,
                    helperText: t.counterReferenceHelp,
                    helperMaxLines: 2,
                    counterText: '',
                  ),
                  onChanged: (_) => _clearError(),
                ),
                SectionLabel(t.counterDeposit),
                TextField(
                  key: const Key('counter-deposit-amount'),
                  controller: _depositAmount,
                  enabled: !_sending,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: t.counterDepositAmount,
                    errorText: deposit == -1 ? t.counterAmountInvalid : null,
                    errorMaxLines: 2,
                  ),
                  onChanged: (_) => setState(() => _error = null),
                ),
                if (deposit != null && deposit > 0) ...[
                  const SizedBox(height: VoltiSpacing.s12),
                  _MethodChoice(
                    keyPrefix: 'counter-deposit-method',
                    value: _depositMethod,
                    onChanged: _sending
                        ? null
                        : (m) => setState(() {
                              _depositMethod = m;
                              _error = null;
                            }),
                  ),
                  const SizedBox(height: VoltiSpacing.s12),
                  TextField(
                    key: const Key('counter-deposit-reference'),
                    controller: _depositReference,
                    maxLength: 64,
                    enabled: !_sending,
                    decoration: InputDecoration(
                      labelText: t.counterDepositReference,
                      counterText: '',
                    ),
                    onChanged: (_) => _clearError(),
                  ),
                ],
              ],
            ),
          ),
          SubmitBar(
            hint: missing.isEmpty ? null : t.counterMissing(_join(missing)),
            notice: _error == null
                ? null
                : Notice(
                    key: const Key('counter-error'),
                    tone: _errorTone,
                    icon: _errorTone == NoticeTone.warning
                        ? LucideIcons.triangleAlert
                        : LucideIcons.circleAlert,
                    title: _error!,
                  ),
            button: VoltiButton(
              key: const Key('counter-start'),
              label: t.counterStart,
              icon: LucideIcons.keyRound,
              fullWidth: true,
              size: VoltiButtonSize.lg,
              loading: _sending,
              onPressed: _canStart ? _start : null,
            ),
          ),
        ],
      ),
    );
  }
}

String _join(List<String> parts) => parts.length <= 1
    ? parts.join()
    : '${parts.sublist(0, parts.length - 1).join(', ')} e ${parts.last}';

/// Escolha do metodo do balcao (Maquininha, Pix no balcao, Dinheiro).
class _MethodChoice extends StatelessWidget {
  const _MethodChoice({required this.keyPrefix, required this.value, required this.onChanged});

  final String keyPrefix;
  final CounterPaymentMethod? value;
  final ValueChanged<CounterPaymentMethod>? onChanged;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Wrap(
      spacing: VoltiSpacing.s8,
      runSpacing: VoltiSpacing.s8,
      children: [
        for (final (m, wire) in counterMethods)
          VoltiChip(
            key: Key('$keyPrefix-$wire'),
            label: counterMethodLabel(t, m),
            selected: value == m,
            enabled: onChanged != null,
            onTap: onChanged == null ? null : () => onChanged!(m),
          ),
      ],
    );
  }
}
