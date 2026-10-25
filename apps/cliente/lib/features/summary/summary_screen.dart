import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/breakdown.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/flash.dart';
import '../../core/launcher.dart';
import '../../core/widgets.dart';
import '../payments/debt_pix_sheet.dart';
import '../ride/ride_screen.dart';

final receiptProvider = FutureProvider.autoDispose.family<Receipt, String>((ref, id) => ref.watch(backendProvider).receipt(id));

/// Recibo com trajeto, avaliacao e contestacao. Nunca mostra km rodados.
class SummaryScreen extends ConsumerStatefulWidget {
  const SummaryScreen({super.key, required this.rentalId});
  final String rentalId;
  @override
  ConsumerState<SummaryScreen> createState() => _SummaryScreenState();
}

class _SummaryScreenState extends ConsumerState<SummaryScreen> {
  int _stars = 0;
  bool _rated = false;
  final _comment = TextEditingController();

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _rate() async {
    final l = context.l;
    final comment = _comment.text.trim();
    try {
      await ref.read(backendProvider).rate(widget.rentalId, _stars, comment.isEmpty ? null : comment);
      VoltiHaptics.tap();
      if (mounted) setState(() => _rated = true);
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    }
  }

  Future<void> _dispute() async {
    final l = context.l;
    final ctrl = TextEditingController();
    final reason = await VoltiDialog.show<String>(
      context,
      title: l.disputeTitle,
      message: TextField(controller: ctrl, maxLines: 3, decoration: InputDecoration(hintText: l.disputeHint)),
      actions: [
        VoltiButton(label: l.send, fullWidth: true, onPressed: () => Navigator.of(context).pop(ctrl.text.trim())),
        VoltiButton(label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop()),
      ],
    );
    ctrl.dispose();
    if (reason == null || reason.isEmpty || !mounted) return;
    try {
      await ref.read(backendProvider).dispute(widget.rentalId, reason, null);
      if (mounted) VoltiToast.show(context, l.disputeSent);
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    }
  }

  /// O link do PDF expira em 15 min: busca um novo antes de abrir.
  Future<void> _openPdf(Receipt current) async {
    final l = context.l;
    // R2-01: o PDF so existe com o pagamento recebido.
    if (!_isPaid(current)) {
      VoltiToast.show(context, l.receiptPdfAfterPayment);
      return;
    }
    var url = current.pdfUrl;
    try {
      url = (await ref.read(backendProvider).receipt(widget.rentalId)).pdfUrl ?? url;
    } catch (_) {}
    if (url == null) {
      if (mounted) VoltiToast.show(context, l.receiptPdfPending);
      return;
    }
    var ok = false;
    try {
      ok = await ref.read(inAppUrlLauncherProvider)(Uri.parse(url));
    } catch (_) {
      // URL invalida ou nenhum app para abrir: cai no aviso abaixo.
    }
    if (!ok && mounted) VoltiToast.show(context, l.receiptOpenError, tone: VoltiToastTone.danger);
  }

  /// Recibo pago (ou de uma API sem `paymentStatus`, que so devolvia recibo pago).
  bool _isPaid(Receipt r) => r.paymentStatus == null || r.paymentStatus == ReceiptPaymentStatus.paid;

  Future<void> _payNow(Receipt r) async {
    final id = r.paymentId;
    if (id == null) return;
    final paid = await payDebtWithPix(context, ref, paymentId: id, amountCents: r.amountDueCents ?? 0);
    if (paid && mounted) ref.invalidate(receiptProvider(widget.rentalId));
  }

  /// Texto sob "Corrida finalizada": caucao liberada, usada, pagamento pendente ou em processamento.
  String _finishedText(Receipt r) {
    final l = context.l;
    return switch (r.paymentStatus) {
      ReceiptPaymentStatus.pending => l.rideFinishedPending(money(r.amountDueCents ?? 0)),
      ReceiptPaymentStatus.processing => l.rideFinishedProcessing,
      _ => (r.depositUsedCents ?? 0) > 0 ? l.rideFinishedDepositUsed(money(r.depositUsedCents!)) : l.rideFinishedText,
    };
  }

  Widget? _statusBadge(Receipt r) {
    final l = context.l;
    return switch (r.paymentStatus) {
      ReceiptPaymentStatus.paid => VoltiBadge(l.receiptStatusPaid, key: const Key('receipt-status'), tone: VoltiBadgeTone.success),
      ReceiptPaymentStatus.pending => VoltiBadge(l.receiptStatusPending, key: const Key('receipt-status'), tone: VoltiBadgeTone.danger),
      ReceiptPaymentStatus.processing => VoltiBadge(l.receiptStatusProcessing, key: const Key('receipt-status'), tone: VoltiBadgeTone.warning),
      _ => null,
    };
  }

  /// "Cartao •••• 4821 · NFS-e 2026-77" (ou o numero do recibo).
  String _paymentLine(Receipt r) {
    final l = context.l;
    if (!_isPaid(r)) return '${l.receiptAwaitingPayment} · ${l.receiptNumber(r.number)}';
    final parts = <String>[
      if (r.cardLast4 != null)
        l.paidWithCard(r.cardLast4!)
      else if (r.paymentMethod == PaymentMethod.pix)
        l.paidWithPix
      else if (r.paymentMethod == PaymentMethod.wallet)
        l.paidWithWallet,
      r.invoiceNumber != null ? l.invoiceNumberLabel(r.invoiceNumber!) : l.receiptNumber(r.number),
    ];
    return parts.join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final receipt = ref.watch(receiptProvider(widget.rentalId));
    // Haptica de sucesso junto com o check, uma vez quando o recibo chega.
    ref.listen(receiptProvider(widget.rentalId), (prev, next) {
      if (prev?.hasValue != true && next.hasValue) VoltiHaptics.success();
    });
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: false, title: Text(l.summaryTitle, style: VoltiTypography.heading)),
      // Concluir fixo no rodape: os toasts (SnackBar) ficam acima dele, nunca sobre o botao.
      bottomNavigationBar: receipt.hasValue
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s8, VoltiSpacing.screenGutter, VoltiSpacing.s12),
                child: VoltiButton(
                  key: const Key('summary-finish'),
                  label: l.finishSummary,
                  size: VoltiButtonSize.lg,
                  fullWidth: true,
                  onPressed: () {
                    // O mapa mostra o agradecimento (design: toast no mapa, H8).
                    ref.read(flashProvider.notifier).show(l.thanksForRiding);
                    context.go('/home');
                  },
                ),
              ),
            )
          : null,
      body: SafeArea(
        child: AsyncView<Receipt>(
          value: receipt,
          onRetry: () => ref.invalidate(receiptProvider(widget.rentalId)),
          data: (r) {
            final pts = [for (final p in r.track ?? const <TrackPoint>[]) LatLng(p.lat, p.lng)];
            final mapOn = ref.watch(mapEnabledProvider);
            return ListView(
              padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
              children: VoltiStagger.wrap([
                Row(children: [
                  const VoltiSuccessCheck(size: 56),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Semantics(header: true, child: Text(l.rideFinished, style: VoltiTypography.title)),
                      Text(_finishedText(r),
                          key: const Key('receipt-finished-text'),
                          style: VoltiTypography.body.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                    ]),
                  ),
                ]),
                const SizedBox(height: VoltiSpacing.s16),
                if (mapOn && pts.isNotEmpty)
                  Builder(builder: (context) {
                    // Trajeto enquadrado, com pins de inicio e fim; moto parada (< 20 m)
                    // mostra so o pin, em zoom de rua.
                    final cam = trackCamera(pts);
                    return ClipRRect(
                      borderRadius: VoltiRadii.rLg,
                      child: SizedBox(
                        key: const Key('receipt-map'),
                        height: 200,
                        child: VoltiMap(
                          center: cam.center,
                          zoom: cam.zoom,
                          interactive: false,
                          embedded: true,
                          layers: [
                            if (cam.path) DrawnPolyline(points: pts, color: VoltiColors.brand),
                            MarkerLayer(markers: [
                              if (cam.path) Marker(key: const Key('receipt-start'), point: pts.first, width: 20, height: 20, child: const _TrackPin(VoltiColors.brand)),
                              Marker(key: const Key('receipt-end'), point: pts.last, width: 24, height: 24, child: const _TrackPin(VoltiColors.ink900)),
                            ]),
                          ],
                        ),
                      ),
                    );
                  }),
                const SizedBox(height: VoltiSpacing.s16),
                Container(
                  padding: const EdgeInsets.all(VoltiSpacing.s16),
                  decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: VoltiRadii.rMd),
                  child: Column(children: [
                    _Line(l.duration, durationLabel(r.durationSeconds)),
                    for (final row in breakdownRows(
                      r.breakdown,
                      insuranceLabel: r.coverage == InsuranceCoverage.full ? l.coverageFullLong : l.coverageBasicLong,
                      feesLabel: l.fees,
                      discountLabel: l.coupon,
                    ))
                      _Line(row.label, money(row.cents)),
                    const Divider(),
                    // O total conta depois do check (300 ms + 600 ms de pop).
                    _Line(l.total, money(r.breakdown.totalCents),
                        strong: true,
                        value: VoltiCountUp(
                          key: const Key('receipt-total'),
                          value: r.breakdown.totalCents,
                          format: money,
                          delay: const Duration(milliseconds: 700),
                          style: VoltiTypography.bodyStrong,
                        )),
                    // R2-01: como o total foi pago (caucao usada/devolvida, saldo a pagar e situacao).
                    if ((r.depositUsedCents ?? 0) > 0) _Line(l.receiptDepositUsed, money(r.depositUsedCents!)),
                    if (r.paymentStatus != null && r.paymentStatus != ReceiptPaymentStatus.pending && (r.depositReleasedCents ?? 0) > 0)
                      _Line(l.receiptDepositReleased, money(r.depositReleasedCents!)),
                    if (r.paymentStatus == ReceiptPaymentStatus.pending && r.amountDueCents != null)
                      _Line(l.receiptAmountDue, money(r.amountDueCents!), strong: true),
                    if (_statusBadge(r) case final badge?)
                      _Line(l.receiptPaymentLabel, '', value: badge),
                  ]),
                ),
                if (r.paymentStatus == ReceiptPaymentStatus.pending) ...[
                  const SizedBox(height: VoltiSpacing.s10),
                  NoticeBanner(danger: true, icon: LucideIcons.circleAlert, title: l.paymentPendingTitle, message: l.receiptPendingText(money(r.amountDueCents ?? 0))),
                  const SizedBox(height: VoltiSpacing.s8),
                  VoltiButton(
                    key: const Key('receipt-pay-now'),
                    label: l.payNow,
                    icon: LucideIcons.qrCode,
                    size: VoltiButtonSize.lg,
                    fullWidth: true,
                    onPressed: r.paymentId == null ? null : () => _payNow(r),
                  ),
                ] else if (r.paymentStatus == ReceiptPaymentStatus.processing) ...[
                  const SizedBox(height: VoltiSpacing.s10),
                  NoticeBanner(icon: LucideIcons.clock, message: l.receiptProcessingText),
                ],
                const SizedBox(height: VoltiSpacing.s10),
                Container(
                  decoration: BoxDecoration(borderRadius: VoltiRadii.rMd, boxShadow: VoltiShadows.shadow1),
                  child: ListRow(
                    key: const Key('receipt-invoice'),
                    icon: LucideIcons.receipt,
                    iconTone: ListRowTone.brand,
                    title: l.receiptAndInvoice,
                    subtitle: _paymentLine(r),
                    trailing: ListRowTrailing.chevron,
                    onTap: () => _openPdf(r),
                  ),
                ),
                SectionTitle(l.rateRideTrip),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 1; i <= 5; i++)
                      IconButton(
                        tooltip: l.starsLabel(i),
                        onPressed: _rated
                            ? null
                            : () {
                                VoltiHaptics.selection();
                                setState(() => _stars = i);
                              },
                        icon: i <= _stars
                            // Estrelas marcadas fazem pop em cascata (50 ms entre elas).
                            ? VoltiCheckPop(
                                key: ValueKey('star-$i'),
                                delay: Duration(milliseconds: (i - 1) * 50),
                                duration: const Duration(milliseconds: 380),
                                child: const Icon(Icons.star_rounded, size: 36, color: VoltiColors.sun400),
                              )
                            : const Icon(Icons.star_outline_rounded, size: 36, color: VoltiColors.ink300),
                      ),
                  ],
                ),
                if (_stars > 0 && !_rated) ...[
                  TextField(
                    controller: _comment,
                    maxLength: 500,
                    maxLines: 2,
                    minLines: 1,
                    decoration: InputDecoration(hintText: l.ratingCommentHint, counterText: ''),
                  ),
                  const SizedBox(height: VoltiSpacing.s8),
                  VoltiButton(label: l.sendRating, variant: VoltiButtonVariant.secondary, fullWidth: true, onPressed: _rate),
                ],
                if (_rated)
                  Center(
                    child: VoltiEnter.pop(
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(LucideIcons.circleCheck, size: 18, color: VoltiColors.successInk),
                        const SizedBox(width: 6),
                        Flexible(child: Text(l.thanksRating, style: VoltiTypography.bodyStrong.copyWith(color: VoltiColors.successInk))),
                      ]),
                    ),
                  ),
                const SizedBox(height: VoltiSpacing.s16),
                VoltiButton(label: l.disputeCharge, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: _dispute),
              ]),
            );
          },
        ),
      ),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line(this.a, this.b, {this.strong = false, this.value});
  final String a, b;
  final bool strong;

  /// Substitui o texto do valor (ex.: total contando).
  final Widget? value;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: Text(a, style: strong ? VoltiTypography.bodyStrong : VoltiTypography.body)),
          const SizedBox(width: VoltiSpacing.s12),
          value ?? Text(b, style: strong ? VoltiTypography.bodyStrong : VoltiTypography.body),
        ]),
      );
}

/// Pino redondo de inicio/fim do trajeto no recibo.
class _TrackPin extends StatelessWidget {
  const _TrackPin(this.color);
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(color: color, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 3), boxShadow: VoltiShadows.shadow2),
      );
}
