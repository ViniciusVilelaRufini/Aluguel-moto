import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/widgets.dart';
import 'account_common.dart';

/// Limites de `TopUpRequest.amountCents` no contrato (R$ 10 a R$ 1.000).
const kTopUpMinCents = 1000;
const kTopUpMaxCents = 100000;

/// Cria a recarga Pix (valor livre ou pacote), mostra o QR e acompanha ate `paid`.
/// Atualiza saldo e extrato no fim. Devolve `true` quando o Pix foi pago.
Future<bool> runWalletTopUp(BuildContext context, WidgetRef ref, {String? packageId, int? amountCents}) async {
  final l = context.l;
  final attempt = ref.read(topUpAttemptProvider);
  // Mesma recarga repetida depois de falha de rede reusa a chave (sem cobranca dupla).
  final key = attempt.keyFor(('top-up', packageId, amountCents));
  final TopUp t;
  try {
    t = await ref.read(backendProvider).topUp(packageId: packageId, amountCents: amountCents, idempotencyKey: key);
    attempt.settle();
  } catch (e) {
    if (AttemptKeys.isDefinitive(e)) attempt.settle();
    if (context.mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    return false;
  }
  if (!context.mounted) return false;
  final paid = await VoltiBottomSheet.show<bool>(
    context,
    isDismissible: true,
    builder: (_) => TopUpPixSheet(topUp: t),
  );
  // "Pagar depois" ou sheet fechado: a Carteira continua conferindo o Pix em baixa frequencia.
  ref.read(pendingTopUpProvider.notifier).set(paid == true || t.status != TopUpStatus.pending ? null : t);
  ref.invalidate(walletProvider);
  ref.invalidate(ledgerProvider);
  if (paid == true && context.mounted) VoltiToast.show(context, l.topUpDone, tone: VoltiToastTone.success);
  return paid == true;
}

/// Abre a escolha do valor e, confirmado, segue para o Pix.
Future<void> openTopUp(BuildContext context, WidgetRef ref) async {
  final amount = await VoltiBottomSheet.show<int>(context, isDismissible: true, builder: (_) => const TopUpAmountSheet());
  if (amount == null || !context.mounted) return;
  await runWalletTopUp(context, ref, amountCents: amount);
}

// ---------------------------------------------------------------------------
// Carteira de creditos
// ---------------------------------------------------------------------------

class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});
  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen> {
  Timer? _pendingTimer;
  bool _checking = false;

  @override
  void initState() {
    super.initState();
    // Pix pago depois de "Pagar depois": confere em baixa frequencia enquanto a Carteira esta aberta.
    _pendingTimer = Timer.periodic(ref.read(pendingTopUpPollProvider), (_) => _checkPending());
  }

  @override
  void dispose() {
    _pendingTimer?.cancel();
    super.dispose();
  }

  Future<void> _checkPending() async {
    final pending = ref.read(pendingTopUpProvider);
    if (pending == null || _checking) return;
    final notifier = ref.read(pendingTopUpProvider.notifier);
    final exp = pending.pix?.expiresAt;
    if (exp != null && DateTime.now().toUtc().isAfter(exp.toUtc())) {
      notifier.set(null);
      return;
    }
    _checking = true;
    try {
      final t = await ref.read(backendProvider).topUpStatus(pending.id);
      if (!mounted) return;
      switch (t.status) {
        case TopUpStatus.paid:
          notifier.set(null);
          ref.invalidate(walletProvider);
          ref.invalidate(ledgerProvider);
          VoltiToast.show(context, context.l.topUpDone, tone: VoltiToastTone.success);
        case TopUpStatus.failed:
        case TopUpStatus.expired:
          notifier.set(null);
        default:
          break;
      }
    } catch (_) {
      // rede instavel: confere de novo no proximo ciclo
    } finally {
      _checking = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final pending = ref.watch(pendingTopUpProvider);
    return VoltiScaffold(
      title: l.wallet,
      body: VoltiRefresh(
        onRefresh: () async {
          ref.invalidate(packagesProvider);
          ref.invalidate(ledgerProvider);
          ref.invalidate(walletProvider);
          await _checkPending();
          await ref.read(walletProvider.future);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
          children: [
            if (pending != null) ...[
              NoticeBanner(
                key: const Key('pending-topup'),
                icon: LucideIcons.clock,
                title: l.pendingTopUpTitle(money(pending.amountCents)),
                message: l.pendingTopUpText,
              ),
              const SizedBox(height: VoltiSpacing.s12),
            ],
            AsyncView<Wallet>(
              value: ref.watch(walletProvider),
              onRetry: () => ref.invalidate(walletProvider),
              loading: (_) => VoltiSkeleton.card(height: 96, label: l.loading),
              data: (w) => Semantics(
                container: true,
                label: '${l.walletBalanceTitle}: ${money(w.balanceCents)}, ${l.minutesBalance(w.minutesBalance)}',
                excludeSemantics: true,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(VoltiSpacing.s16),
                  decoration: BoxDecoration(color: VoltiColors.ink900, borderRadius: VoltiRadii.rLg),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(l.walletBalanceTitle, style: VoltiTypography.caption.copyWith(color: Colors.white70)),
                    VoltiCountUp(value: w.balanceCents, format: money, style: VoltiTypography.title.copyWith(color: Colors.white)),
                    Text(l.minutesBalance(w.minutesBalance), style: VoltiTypography.caption.copyWith(color: Colors.white70)),
                  ]),
                ),
              ),
            ),
            const SizedBox(height: VoltiSpacing.s10),
            VoltiButton(
              label: l.topUpWallet,
              icon: LucideIcons.plus,
              variant: VoltiButtonVariant.secondary,
              fullWidth: true,
              onPressed: () => openTopUp(context, ref),
            ),
            SectionTitle(l.minutePackages),
            AsyncView<List<MinutePackage>>(
              value: ref.watch(packagesProvider),
              onRetry: () => ref.invalidate(packagesProvider),
              loading: (_) => VoltiSkeleton.list(rows: 3, label: l.loading),
              data: (list) {
                final active = list.where((p) => p.active).toList();
                if (active.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: VoltiSpacing.s12),
                    child: Text(l.packagesEmpty, style: VoltiTypography.body),
                  );
                }
                return Column(children: [
                  for (final p in active)
                    ListRow(
                      title: p.name,
                      icon: LucideIcons.timer,
                      iconTone: ListRowTone.brand,
                      subtitle: l.minutesBalance(p.minutes),
                      value: money(p.priceCents),
                      trailing: ListRowTrailing.chevron,
                      onTap: () => _buyPackage(context, ref, p),
                    ),
                ]);
              },
            ),
            SectionTitle(l.walletLedgerTitle),
            AsyncView<List<WalletEntry>>(
              value: ref.watch(ledgerProvider),
              onRetry: () => ref.invalidate(ledgerProvider),
              loading: (_) => VoltiSkeleton.list(rows: 3, label: l.loading),
              data: (list) => list.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: VoltiSpacing.s12),
                      child: Text(l.walletLedgerEmpty, style: VoltiTypography.body),
                    )
                  : Column(children: [for (final e in list) _LedgerRow(entry: e)]),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _buyPackage(BuildContext context, WidgetRef ref, MinutePackage p) async {
    final l = context.l;
    final ok = await VoltiDialog.show<bool>(
      context,
      title: l.buyPackageTitle(p.name),
      message: Text(l.buyPackageText(p.minutes, money(p.priceCents))),
      actions: [
        VoltiButton(label: l.payWithPix, icon: LucideIcons.qrCode, fullWidth: true, onPressed: () => Navigator.of(context).pop(true)),
        VoltiButton(label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
      ],
    );
    if (ok == true && context.mounted) await runWalletTopUp(context, ref, packageId: p.id);
  }
}

class _LedgerRow extends StatelessWidget {
  const _LedgerRow({required this.entry});
  final WalletEntry entry;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final credit = entry.amountCents >= 0;
    final amount = entry.amountCents == 0 && (entry.minutes ?? 0) != 0
        ? l.minutesDelta(entry.minutes!)
        : '${credit ? '+' : ''}${money(entry.amountCents)}';
    return ListRow(
      title: entry.description,
      icon: credit ? LucideIcons.arrowDownLeft : LucideIcons.arrowUpRight,
      iconTone: credit ? ListRowTone.brand : ListRowTone.neutral,
      subtitle: formatDateTimeSp(entry.createdAt),
      value: amount,
      trailing: ListRowTrailing.none,
    );
  }
}

// ---------------------------------------------------------------------------
// Valor da recarga
// ---------------------------------------------------------------------------

/// "50" ou "50,90" -> centavos; invalido -> null.
int? parseReaisToCents(String text) {
  final t = text.trim().replaceAll('.', '').replaceAll(' ', '');
  if (t.isEmpty) return null;
  final m = RegExp(r'^(\d{1,6})(?:,(\d{1,2}))?$').firstMatch(t);
  if (m == null) return null;
  final cents = (m.group(2) ?? '0').padRight(2, '0');
  return int.parse(m.group(1)!) * 100 + int.parse(cents);
}

/// Escolha do valor da recarga: atalhos (R$ 20/50/100) ou valor livre de R$ 10 a R$ 1.000.
class TopUpAmountSheet extends StatefulWidget {
  const TopUpAmountSheet({super.key});
  @override
  State<TopUpAmountSheet> createState() => _TopUpAmountSheetState();
}

class _TopUpAmountSheetState extends State<TopUpAmountSheet> {
  static const _presets = [2000, 5000, 10000];
  final _ctrl = TextEditingController();
  int? _cents = 5000;

  @override
  void initState() {
    super.initState();
    _ctrl.text = '50';
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  bool get _valid => _cents != null && _cents! >= kTopUpMinCents && _cents! <= kTopUpMaxCents;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final showError = _ctrl.text.trim().isNotEmpty && !_valid;
    return SingleChildScrollView(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(header: true, child: Text(l.topUpWallet, style: VoltiTypography.title)),
          const SizedBox(height: VoltiSpacing.s8),
          Text(l.topUpAmountHint, style: VoltiTypography.body),
          const SizedBox(height: VoltiSpacing.s12),
          Wrap(spacing: 8, runSpacing: 4, children: [
            for (final p in _presets)
              VoltiChip(
                label: money(p),
                selected: _cents == p,
                onTap: () => setState(() {
                  _cents = p;
                  _ctrl.text = (p ~/ 100).toString();
                }),
              ),
          ]),
          const SizedBox(height: VoltiSpacing.s12),
          TextField(
            key: const Key('topup-amount'),
            controller: _ctrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d,]'))],
            onChanged: (v) => setState(() => _cents = parseReaisToCents(v)),
            decoration: InputDecoration(
              labelText: l.topUpAmountLabel,
              prefixText: 'R\$ ',
              errorText: showError ? l.topUpAmountError : null,
            ),
          ),
          const SizedBox(height: VoltiSpacing.s16),
          VoltiButton(
            label: _valid ? l.topUpGeneratePix(money(_cents!)) : l.topUpGeneratePixDisabled,
            icon: LucideIcons.qrCode,
            size: VoltiButtonSize.lg,
            fullWidth: true,
            onPressed: _valid ? () => Navigator.of(context).pop(_cents) : null,
          ),
          const SizedBox(height: VoltiSpacing.s8),
          VoltiButton(
              label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop()),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Pix da recarga
// ---------------------------------------------------------------------------

/// Recarga via Pix: QR + copia e cola, acompanha `/wallet/top-ups/{id}` ate `paid`.
/// Devolve `true` quando pago.
class TopUpPixSheet extends ConsumerStatefulWidget {
  const TopUpPixSheet({super.key, required this.topUp, this.pollInterval = const Duration(seconds: 3)});
  final TopUp topUp;
  final Duration pollInterval;

  @override
  ConsumerState<TopUpPixSheet> createState() => _TopUpPixSheetState();
}

class _TopUpPixSheetState extends ConsumerState<TopUpPixSheet> {
  Timer? _timer;
  Timer? _close;
  /// Fim sem pagamento (`failed` ou `expired`).
  TopUpStatus? _ended;
  bool _paid = false;
  bool _polling = false;

  bool get _expiredLocally {
    final exp = widget.topUp.pix?.expiresAt;
    return exp != null && DateTime.now().toUtc().isAfter(exp.toUtc());
  }

  @override
  void initState() {
    super.initState();
    final s = widget.topUp.status;
    if (s == TopUpStatus.paid) {
      _paid = true;
    } else if (s == TopUpStatus.failed || s == TopUpStatus.expired) {
      _ended = s;
    } else if (_expiredLocally) {
      _ended = TopUpStatus.expired;
    } else {
      _timer = Timer.periodic(widget.pollInterval, (_) => _poll());
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _close?.cancel();
    super.dispose();
  }

  Future<void> _poll() async {
    if (_paid || _polling) return;
    // O QR venceu: para de consultar (o servidor marca `expired` depois).
    if (_expiredLocally) {
      _timer?.cancel();
      setState(() => _ended = TopUpStatus.expired);
      return;
    }
    _polling = true;
    try {
      final t = await ref.read(backendProvider).topUpStatus(widget.topUp.id);
      if (!mounted || _paid) return;
      switch (t.status) {
        case TopUpStatus.paid:
          _timer?.cancel();
          VoltiHaptics.success();
          setState(() => _paid = true);
          final wait = VoltiMotion.reduced(context) ? Duration.zero : const Duration(milliseconds: 1400);
          _close = Timer(wait, () {
            if (mounted) Navigator.of(context).pop(true);
          });
        case TopUpStatus.failed:
        case TopUpStatus.expired:
          _timer?.cancel();
          setState(() => _ended = t.status);
        default:
          break;
      }
    } catch (_) {
      // rede instavel: tenta de novo no proximo ciclo
    } finally {
      _polling = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final t = widget.topUp;
    final pix = t.pix;
    final failed = switch (_ended) {
      TopUpStatus.failed => l.pixFailed,
      TopUpStatus.expired => l.pixExpired,
      _ => null,
    };
    if (_paid) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: VoltiSpacing.s24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const VoltiSuccessCheck(delay: Duration.zero),
          const SizedBox(height: VoltiSpacing.s16),
          Semantics(liveRegion: true, child: Text(l.topUpPaid, style: VoltiTypography.title, textAlign: TextAlign.center)),
          const SizedBox(height: VoltiSpacing.s8),
          Text(
            t.minutes != null && t.minutes! > 0 ? l.topUpPaidMinutes(t.minutes!) : l.topUpPaidAmount(money(t.amountCents)),
            style: VoltiTypography.body,
            textAlign: TextAlign.center,
          ),
        ]),
      );
    }
    Widget? qr;
    final b64 = pix?.qrCodeBase64;
    if (b64 != null && b64.isNotEmpty) {
      try {
        qr = Image.memory(
          base64Decode(b64.contains(',') ? b64.split(',').last : b64),
          key: const Key('topup-qr'),
          width: 200,
          height: 200,
          semanticLabel: l.pixQrLabel,
          errorBuilder: (_, _, _) => const SizedBox.shrink(),
        );
      } catch (_) {
        qr = null;
      }
    }
    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(header: true, child: Text(l.pixTitle, style: VoltiTypography.title)),
          const SizedBox(height: VoltiSpacing.s8),
          Text(l.topUpPixText(money(t.amountCents)), style: VoltiTypography.body),
          const SizedBox(height: VoltiSpacing.s16),
          if (qr != null) Center(child: qr),
          if (pix != null) ...[
            const SizedBox(height: VoltiSpacing.s12),
            Container(
              padding: const EdgeInsets.all(VoltiSpacing.s12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: VoltiRadii.rMd,
              ),
              child: SelectableText(
                pix.copyPaste,
                key: const Key('topup-copy-paste'),
                maxLines: 3,
                style: VoltiTypography.caption.copyWith(fontFamily: VoltiTypography.fontMono),
              ),
            ),
            const SizedBox(height: VoltiSpacing.s8),
            VoltiButton(
              label: l.copyPixCode,
              icon: LucideIcons.copy,
              variant: VoltiButtonVariant.secondary,
              fullWidth: true,
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: pix.copyPaste));
                VoltiHaptics.tap();
                if (context.mounted) VoltiToast.show(context, l.pixCopied);
              },
            ),
            const SizedBox(height: VoltiSpacing.s4),
            Text(l.pixExpiresAt(formatDateTimeSp(pix.expiresAt)), style: VoltiTypography.caption),
          ],
          const SizedBox(height: VoltiSpacing.s16),
          if (failed != null)
            NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: failed)
          else
            Semantics(
              liveRegion: true,
              child: Row(children: [
                const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                const SizedBox(width: 10),
                Expanded(child: Text(l.pixWaiting, style: VoltiTypography.caption)),
              ]),
            ),
          const SizedBox(height: VoltiSpacing.s12),
          VoltiButton(
              label: failed != null ? l.close : l.pixPayLater,
              variant: VoltiButtonVariant.ghost,
              fullWidth: true,
              onPressed: () => Navigator.of(context).pop(false)),
        ],
      ),
    );
  }
}
