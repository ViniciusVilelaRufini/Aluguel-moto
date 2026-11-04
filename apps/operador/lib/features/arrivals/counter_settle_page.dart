import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/models.dart' show newUuid;
import 'package:volti_operador/features/pickups/counter_checkout_page.dart'
    show counterMethodLabel, counterMethods;
import 'package:volti_operador/features/pickups/handover_ui.dart' show SectionLabel;
import 'package:volti_operador/features/tasks/task_ui.dart'
    show formatBrl, formatDayTime, parseReaisToCents;
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Aluguel ainda nao encerrado: o acerto espera o fim.
const _openRentalStatuses = {RentalStatus.active, RentalStatus.paused, RentalStatus.ending};

String _depositMethodLabel(AppLocalizations t, DepositMethod m) => switch (m) {
      DepositMethod.counterCard => t.counterMethodCard,
      DepositMethod.counterPix => t.counterMethodPix,
      DepositMethod.cash => t.counterMethodCash,
      DepositMethod.pix => t.settleDepositPix,
      _ => t.settleDepositCard,
    };

/// "Acerto no balcao" na chegada (`GET /rentals/{id}/counter-balance`): recebe os
/// debitos (excedente) em dinheiro, maquininha ou Pix do galpao, abate da caucao
/// e devolve o resto da caucao. Uma `Idempotency-Key` por acao; o saldo e relido
/// depois de cada uma. Valores digitados em reais viram centavos inteiros.
class CounterSettlePage extends ConsumerStatefulWidget {
  const CounterSettlePage({super.key, required this.rentalId});

  final String rentalId;

  @override
  ConsumerState<CounterSettlePage> createState() => _CounterSettlePageState();
}

class _CounterSettlePageState extends ConsumerState<CounterSettlePage> {
  CounterBalance? _balance;
  bool _loading = true;
  bool _loadFailed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadFailed = false;
    });
    try {
      final b = await ref.read(fieldRepositoryProvider).getCounterBalance(widget.rentalId);
      if (mounted) setState(() => _balance = b);
    } on RepositoryException {
      if (mounted) setState(() => _loadFailed = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Abre a folha da acao e relê o saldo sempre que ela fecha (sucesso, desistencia
  /// ou valor divergente): uma resposta perdida pode ter sido registrada no servidor.
  Future<void> _act(_SettleAction action) async {
    final result = await VoltiBottomSheet.show<_SheetResult>(
      context,
      builder: (_) => _SettleSheet(action: action),
    );
    if (!mounted) return;
    if (result != null) VoltiToast.show(context, result.message, tone: result.tone);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final b = _balance;
    return Scaffold(
      body: Column(
        children: [
          OperatorTopBar(title: t.settleTitle),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
              children: [
                const ConnectivityBanner(padding: EdgeInsets.only(bottom: VoltiSpacing.s10)),
                if (b == null && _loading)
                  const Center(child: CircularProgressIndicator())
                else if (b != null)
                  ..._content(t, b),
                if (_loadFailed) ...[
                  const SizedBox(height: VoltiSpacing.s12),
                  Notice(
                    key: const Key('settle-load-error'),
                    tone: NoticeTone.neutral,
                    icon: LucideIcons.cloudOff,
                    title: t.settleLoadError,
                  ),
                ],
                const SizedBox(height: VoltiSpacing.s20),
                VoltiButton(
                  key: const Key('settle-refresh'),
                  label: t.settleRefresh,
                  icon: LucideIcons.refreshCw,
                  variant: VoltiButtonVariant.secondary,
                  fullWidth: true,
                  loading: _loading,
                  onPressed: _loading ? null : _load,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _content(AppLocalizations t, CounterBalance b) {
    final name = b.customerFirstName?.trim();
    final header = [
      if (name != null && name.isNotEmpty)
        Text(t.settleCustomer(name), style: VoltiTypography.bodyStrong),
    ];
    if (_openRentalStatuses.contains(b.rentalStatus)) {
      return [
        ...header,
        const SizedBox(height: VoltiSpacing.s12),
        Notice(
          key: const Key('settle-waiting'),
          tone: NoticeTone.info,
          icon: LucideIcons.hourglass,
          title: t.settleWaitingRental,
          body: t.settleWaitingRentalBody,
        ),
      ];
    }
    final debts = b.debts.where((d) => d.outstandingCents > 0).toList();
    final deposits = b.deposits.where((d) => d.availableCents > 0).toList();
    if (debts.isEmpty && deposits.isEmpty) {
      return [
        ...header,
        const SizedBox(height: VoltiSpacing.s12),
        Notice(
          key: const Key('settle-nothing'),
          tone: NoticeTone.success,
          icon: LucideIcons.circleCheck,
          title: t.settleNothing,
        ),
      ];
    }
    return [
      ...header,
      if (debts.isNotEmpty) ...[
        SectionLabel(t.settleDebts, hint: t.settleDebtTotal(formatBrl(b.debtTotalCents))),
        for (final d in debts)
          Padding(
            padding: const EdgeInsets.only(bottom: VoltiSpacing.s8),
            child: SectionCard(
              key: Key('debt-${d.paymentId}'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                          child: Text(t.settleDebtRow(formatDayTime(d.createdAt)),
                              style: VoltiTypography.body)),
                      Text(formatBrl(d.outstandingCents),
                          style: VoltiTypography.bodyStrong
                              .copyWith(fontFamily: VoltiTypography.fontMono)),
                    ],
                  ),
                  const SizedBox(height: VoltiSpacing.s10),
                  Wrap(
                    spacing: VoltiSpacing.s8,
                    runSpacing: VoltiSpacing.s8,
                    children: [
                      VoltiButton(
                        key: Key('settle-receive-${d.paymentId}'),
                        label: t.settleReceive,
                        icon: LucideIcons.banknote,
                        size: VoltiButtonSize.sm,
                        onPressed: () => _act(_SettleAction.receive(d)),
                      ),
                      if (deposits.isNotEmpty)
                        VoltiButton(
                          key: Key('settle-from-deposit-${d.paymentId}'),
                          label: t.settleFromDeposit,
                          icon: LucideIcons.wallet,
                          size: VoltiButtonSize.sm,
                          variant: VoltiButtonVariant.secondary,
                          onPressed: () => _act(_SettleAction.fromDeposit(d, deposits)),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
      ],
      if (deposits.isNotEmpty) ...[
        SectionLabel(t.settleDeposits),
        for (final d in deposits)
          Padding(
            padding: const EdgeInsets.only(bottom: VoltiSpacing.s8),
            child: SectionCard(
              key: Key('deposit-${d.depositId}'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(t.settleDepositRow(_depositMethodLabel(t, d.method)),
                      style: VoltiTypography.body),
                  Text(t.settleDepositAvailable(formatBrl(d.availableCents)),
                      style: VoltiTypography.bodyStrong
                          .copyWith(fontFamily: VoltiTypography.fontMono)),
                  const SizedBox(height: VoltiSpacing.s10),
                  VoltiButton(
                    key: Key('refund-${d.depositId}'),
                    label: t.settleRefund,
                    icon: LucideIcons.undo2,
                    size: VoltiButtonSize.sm,
                    variant: VoltiButtonVariant.secondary,
                    onPressed: () => _act(_SettleAction.refund(d)),
                  ),
                ],
              ),
            ),
          ),
      ],
    ];
  }
}

enum _Kind { receive, fromDeposit, refund }

/// Como a folha fechou: texto e tom do aviso.
typedef _SheetResult = ({String message, VoltiToastTone tone});

/// Uma acao do acerto: receber, abater da caucao ou devolver a caucao.
class _SettleAction {
  _SettleAction.receive(CounterDebt this.debt)
      : kind = _Kind.receive,
        deposits = const [],
        refundDeposit = null;
  _SettleAction.fromDeposit(CounterDebt this.debt, this.deposits)
      : kind = _Kind.fromDeposit,
        refundDeposit = null;
  _SettleAction.refund(CounterDepositBalance this.refundDeposit)
      : kind = _Kind.refund,
        debt = null,
        deposits = const [];

  final _Kind kind;
  final CounterDebt? debt;
  final List<CounterDepositBalance> deposits;
  final CounterDepositBalance? refundDeposit;
}

class _SettleSheet extends ConsumerStatefulWidget {
  const _SettleSheet({required this.action});

  final _SettleAction action;

  @override
  ConsumerState<_SettleSheet> createState() => _SettleSheetState();
}

class _SettleSheetState extends ConsumerState<_SettleSheet> {
  late final TextEditingController _amount;
  final _reference = TextEditingController();
  CounterPaymentMethod? _method;
  late CounterDepositBalance? _deposit =
      widget.action.deposits.isEmpty ? null : widget.action.deposits.first;
  bool _sending = false;
  String? _error;

  /// Uma chave por acao: o reenvio do mesmo pedido (falha de rede) reusa a chave.
  Object? _lastRequest;
  String _key = newUuid();

  _SettleAction get _a => widget.action;

  @override
  void initState() {
    super.initState();
    _amount = TextEditingController(text: _centsText(_max));
  }

  @override
  void dispose() {
    _amount.dispose();
    _reference.dispose();
    super.dispose();
  }

  static String _centsText(int cents) =>
      '${cents ~/ 100},${(cents % 100).toString().padLeft(2, '0')}';

  /// Teto do valor: saldo do debito, disponivel da caucao, ou o menor dos dois.
  int get _max => switch (_a.kind) {
        _Kind.receive => _a.debt!.outstandingCents,
        _Kind.fromDeposit => _a.debt!.outstandingCents < (_deposit?.availableCents ?? 0)
            ? _a.debt!.outstandingCents
            : (_deposit?.availableCents ?? 0),
        _Kind.refund => _a.refundDeposit!.availableCents,
      };

  /// Excedente que limita o teto: o saldo (receber) ou o disponivel da caucao.
  bool get _limitedByDeposit =>
      _a.kind == _Kind.refund ||
      (_a.kind == _Kind.fromDeposit && (_deposit?.availableCents ?? 0) < _a.debt!.outstandingCents);

  String? _amountError(AppLocalizations t, int? cents) {
    if (_amount.text.trim().isEmpty) return null;
    if (cents == null || cents <= 0) return t.counterAmountInvalid;
    if (cents > _max) {
      return _limitedByDeposit
          ? t.settleAmountOverAvailable(formatBrl(_max))
          : t.settleAmountOverBalance(formatBrl(_max));
    }
    return null;
  }

  String? get _referenceValue => _reference.text.trim().isEmpty ? null : _reference.text.trim();

  Future<void> _confirm(int cents) async {
    final t = AppLocalizations.of(context);
    final repo = ref.read(fieldRepositoryProvider);
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final String done;
      if (_a.kind == _Kind.refund) {
        final req = CounterRefundRequest((b) => b
          ..amountCents = cents
          ..reference = _referenceValue);
        await repo.counterRefund(_a.refundDeposit!.depositId, req, idempotencyKey: _keyFor(req));
        done = t.settleDoneRefund;
      } else {
        final req = CounterSettleRequest((b) => b
          ..amountCents = cents
          ..method = _a.kind == _Kind.receive ? _method : null
          ..fromDepositId = _a.kind == _Kind.fromDeposit ? _deposit!.depositId : null
          ..reference = _referenceValue);
        await repo.counterSettle(_a.debt!.paymentId, req, idempotencyKey: _keyFor(req));
        done = _a.kind == _Kind.receive ? t.settleDoneReceive : t.settleDoneFromDeposit;
      }
      if (mounted) {
        Navigator.of(context).pop<_SheetResult>((message: done, tone: VoltiToastTone.success));
      }
    } on RepositoryException catch (e) {
      if (!mounted) return;
      if (e.slug == 'counter-amount-mismatch') {
        // Saldo mudou no servidor: fecha a folha e a tela relê o saldo.
        Navigator.of(context).pop<_SheetResult>(
            (message: t.settleAmountChanged(formatBrl(cents)), tone: VoltiToastTone.warning));
        return;
      }
      setState(() {
        _sending = false;
        _error = e.kind == FailureKind.network && e.status == null ? t.offlineAction : e.message;
      });
    }
  }

  String _keyFor(Object request) {
    if (_lastRequest != null && request != _lastRequest) _key = newUuid();
    _lastRequest = request;
    return _key;
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final cents = parseReaisToCents(_amount.text);
    final amountError = _amountError(t, cents);
    final ready = !_sending &&
        cents != null &&
        cents > 0 &&
        amountError == null &&
        (_a.kind != _Kind.receive || _method != null) &&
        (_a.kind != _Kind.fromDeposit || _deposit != null);
    final (title, confirm) = switch (_a.kind) {
      _Kind.receive => (t.settleReceive, t.settleConfirmReceive),
      _Kind.fromDeposit => (t.settleFromDeposit, t.settleConfirmFromDeposit),
      _Kind.refund => (t.settleRefund, t.settleConfirmRefund),
    };
    return VoltiBottomSheet(
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Semantics(header: true, child: Text(title, style: VoltiTypography.heading)),
            const SizedBox(height: VoltiSpacing.s12),
            if (_a.kind == _Kind.fromDeposit && _a.deposits.length > 1) ...[
              Text(t.settleDepositPick, style: VoltiTypography.label),
              const SizedBox(height: VoltiSpacing.s8),
              Wrap(
                spacing: VoltiSpacing.s8,
                runSpacing: VoltiSpacing.s8,
                children: [
                  for (final d in _a.deposits)
                    VoltiChip(
                      key: Key('settle-deposit-${d.depositId}'),
                      label: '${_depositMethodLabel(t, d.method)} · ${formatBrl(d.availableCents)}',
                      selected: _deposit?.depositId == d.depositId,
                      onTap: _sending ? null : () => setState(() => _deposit = d),
                    ),
                ],
              ),
              const SizedBox(height: VoltiSpacing.s12),
            ],
            TextField(
              key: const Key('settle-amount'),
              controller: _amount,
              enabled: !_sending,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: t.settleAmount,
                helperText: t.settleAmountMax(formatBrl(_max)),
                errorText: amountError,
                errorMaxLines: 2,
              ),
              onChanged: (_) => setState(() => _error = null),
            ),
            if (_a.kind == _Kind.receive) ...[
              const SizedBox(height: VoltiSpacing.s12),
              Text(t.counterMethod, style: VoltiTypography.label),
              const SizedBox(height: VoltiSpacing.s8),
              Wrap(
                spacing: VoltiSpacing.s8,
                runSpacing: VoltiSpacing.s8,
                children: [
                  for (final (m, wire) in counterMethods)
                    VoltiChip(
                      key: Key('settle-method-$wire'),
                      label: counterMethodLabel(t, m),
                      selected: _method == m,
                      enabled: !_sending,
                      onTap: _sending
                          ? null
                          : () => setState(() {
                                _method = m;
                                _error = null;
                              }),
                    ),
                ],
              ),
            ],
            const SizedBox(height: VoltiSpacing.s12),
            TextField(
              key: const Key('settle-reference'),
              controller: _reference,
              maxLength: 64,
              enabled: !_sending,
              decoration: InputDecoration(
                labelText: _a.kind == _Kind.receive ? t.counterReference : t.settleReference,
                helperText: _a.kind == _Kind.receive ? t.counterReferenceHelp : null,
                helperMaxLines: 2,
                counterText: '',
              ),
              onChanged: (_) => setState(() => _error = null),
            ),
            if (_error != null) ...[
              const SizedBox(height: VoltiSpacing.s8),
              Notice(
                key: const Key('settle-error'),
                tone: NoticeTone.danger,
                icon: LucideIcons.circleAlert,
                title: _error!,
              ),
            ],
            const SizedBox(height: VoltiSpacing.s16),
            VoltiButton(
              key: const Key('settle-confirm'),
              label: confirm,
              fullWidth: true,
              loading: _sending,
              onPressed: ready ? () => _confirm(cents) : null,
            ),
          ],
        ),
      ),
    );
  }
}
