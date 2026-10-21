import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/widgets.dart';
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

  Future<void> _rate() async {
    final l = context.l;
    try {
      await ref.read(backendProvider).rate(widget.rentalId, _stars, null);
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

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final receipt = ref.watch(receiptProvider(widget.rentalId));
    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: false, title: Text(l.summaryTitle, style: VoltiTypography.heading)),
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
                const Center(child: VoltiSuccessCheck()),
                const SizedBox(height: 8),
                Center(child: Semantics(header: true, child: Text(l.lockedBye, style: VoltiTypography.title, textAlign: TextAlign.center))),
                const SizedBox(height: 4),
                Center(child: Text(l.receiptNumber(r.number), style: VoltiTypography.caption)),
                const SizedBox(height: VoltiSpacing.s16),
                if (mapOn && pts.length >= 2)
                  ClipRRect(
                    borderRadius: VoltiRadii.rLg,
                    child: SizedBox(
                      height: 200,
                      child: VoltiMap(
                        center: pts.first,
                        zoom: 15,
                        interactive: false,
                        layers: [DrawnPolyline(points: pts, color: VoltiColors.brand)],
                      ),
                    ),
                  ),
                const SizedBox(height: VoltiSpacing.s16),
                Container(
                  padding: const EdgeInsets.all(VoltiSpacing.s16),
                  decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: VoltiRadii.rMd),
                  child: Column(children: [
                    _Line(l.duration, clock(r.durationSeconds)),
                    for (final line in r.breakdown.lines) _Line(line.description, money(line.amountCents)),
                    if (r.breakdown.insuranceCents > 0) _Line(l.insurance, money(r.breakdown.insuranceCents)),
                    if (r.breakdown.feesCents > 0) _Line(l.fees, money(r.breakdown.feesCents)),
                    if (r.breakdown.discountCents > 0) _Line(l.discount, money(-r.breakdown.discountCents)),
                    const Divider(),
                    _Line(l.total, money(r.breakdown.totalCents), strong: true),
                  ]),
                ),
                SectionTitle(l.rateRide),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 1; i <= 5; i++)
                      IconButton(
                        tooltip: l.starsLabel(i),
                        onPressed: _rated ? null : () => setState(() => _stars = i),
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
                if (_stars > 0 && !_rated)
                  VoltiButton(label: l.sendRating, variant: VoltiButtonVariant.secondary, fullWidth: true, onPressed: _rate),
                if (_rated) Center(child: Text(l.thanksRating, style: VoltiTypography.caption)),
                const SizedBox(height: VoltiSpacing.s16),
                VoltiButton(label: l.disputeCharge, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: _dispute),
                const SizedBox(height: VoltiSpacing.s8),
                VoltiButton(label: l.backToMap, size: VoltiButtonSize.lg, fullWidth: true, onPressed: () => context.go('/home')),
              ]),
            );
          },
        ),
      ),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line(this.a, this.b, {this.strong = false});
  final String a, b;
  final bool strong;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Expanded(child: Text(a, style: strong ? VoltiTypography.bodyStrong : VoltiTypography.body)),
          Text(b, style: strong ? VoltiTypography.bodyStrong : VoltiTypography.body),
        ]),
      );
}
