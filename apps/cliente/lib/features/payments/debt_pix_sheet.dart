import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/pix_charge_panel.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';

/// Dividas em aberto do cliente (R2-01). Falha (rede, teste sem backend) = sem aviso.
final openDebtsProvider = FutureProvider.autoDispose<List<Payment>>((ref) => ref.watch(backendProvider).openDebts());

/// Abre o "Pagar agora" da divida [paymentId] ([amountCents] = saldo devedor). Devolve `true`
/// quando o Pix foi pago; atualiza as dividas e o perfil (flag de inadimplencia) no fim.
Future<bool> payDebtWithPix(BuildContext context, WidgetRef ref, {required String paymentId, required int amountCents}) async {
  final paid = await VoltiBottomSheet.show<bool>(
    context,
    builder: (_) => DebtPixSheet(paymentId: paymentId, amountCents: amountCents),
  );
  ref.invalidate(openDebtsProvider);
  if (paid == true) unawaited(ref.read(sessionProvider.notifier).refresh().catchError((_) {}));
  return paid == true;
}

/// Quitacao por Pix (`POST /payments/{id}/retry`): QR + copia e cola (mesmo componente da
/// recarga) e acompanha `GET /payments/{id}` da quitacao ate `paid`. Devolve `true` quando pago.
class DebtPixSheet extends ConsumerStatefulWidget {
  const DebtPixSheet({super.key, required this.paymentId, required this.amountCents, this.pollInterval = const Duration(seconds: 3)});
  final String paymentId;
  final int amountCents;
  final Duration pollInterval;

  @override
  ConsumerState<DebtPixSheet> createState() => _DebtPixSheetState();
}

class _DebtPixSheetState extends ConsumerState<DebtPixSheet> {
  final _key = newIdempotencyKey();
  Payment? _charge;
  String? _error;
  bool _paid = false;
  bool _ended = false;
  bool _polling = false;
  Timer? _timer;
  Timer? _close;

  @override
  void initState() {
    super.initState();
    _create();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _close?.cancel();
    super.dispose();
  }

  Future<void> _create() async {
    try {
      final p = await ref.read(backendProvider).payDebtPix(widget.paymentId, idempotencyKey: _key);
      if (!mounted) return;
      setState(() => _charge = p);
      if (p.status == PaymentStatus.paid) {
        _onPaid();
      } else {
        _timer = Timer.periodic(widget.pollInterval, (_) => _poll());
      }
    } catch (e) {
      if (mounted) setState(() => _error = failureText(context.l, e));
    }
  }

  bool get _expiredLocally {
    final exp = _charge?.pix?.expiresAt;
    return exp != null && DateTime.now().toUtc().isAfter(exp.toUtc());
  }

  Future<void> _poll() async {
    final charge = _charge;
    if (charge == null || _paid || _polling) return;
    if (_expiredLocally) {
      _timer?.cancel();
      setState(() => _ended = true);
      return;
    }
    _polling = true;
    try {
      final p = await ref.read(backendProvider).payment(charge.id);
      if (!mounted || _paid) return;
      if (p.status == PaymentStatus.paid) {
        _onPaid();
      } else if (p.status == PaymentStatus.failed || p.status == PaymentStatus.canceled) {
        _timer?.cancel();
        setState(() => _ended = true);
      }
    } catch (_) {
      // rede instavel: tenta de novo no proximo ciclo
    } finally {
      _polling = false;
    }
  }

  void _onPaid() {
    _timer?.cancel();
    VoltiHaptics.success();
    setState(() => _paid = true);
    final wait = VoltiMotion.reduced(context) ? Duration.zero : const Duration(milliseconds: 1400);
    _close = Timer(wait, () {
      if (mounted) Navigator.of(context).pop(true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    if (_paid) return PixPaidView(title: l.debtPaid, text: l.debtPaidText);
    final error = _error;
    if (error != null) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(header: true, child: Text(l.debtPixTitle, style: VoltiTypography.title)),
          const SizedBox(height: VoltiSpacing.s12),
          NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: error),
          const SizedBox(height: VoltiSpacing.s12),
          VoltiButton(label: l.close, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
        ],
      );
    }
    final charge = _charge;
    return PixChargePanel(
      key: const Key('debt-pix'),
      title: l.debtPixTitle,
      text: l.debtPixText(money(charge?.amountCents ?? widget.amountCents)),
      pix: charge?.pix,
      failure: _ended ? l.pixExpired : null,
      qrKey: const Key('debt-qr'),
      copyPasteKey: const Key('debt-copy-paste'),
      closeLabel: _ended ? l.close : l.pixPayLater,
      onClose: () => Navigator.of(context).pop(false),
    );
  }
}
