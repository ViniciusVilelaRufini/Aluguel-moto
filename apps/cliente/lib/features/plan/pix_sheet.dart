import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/geo.dart';
import '../../core/widgets.dart';

/// Caucao via Pix: mostra o QR e o copia e cola e acompanha o deposito ate `held`.
/// Devolve `true` quando o Pix foi pago.
class PixDepositSheet extends ConsumerStatefulWidget {
  const PixDepositSheet({super.key, required this.deposit, this.pollInterval = const Duration(seconds: 3)});
  final Deposit deposit;
  final Duration pollInterval;

  static Future<bool?> show(BuildContext context, Deposit deposit) => VoltiBottomSheet.show<bool>(
        context,
        isDismissible: true,
        builder: (_) => PixDepositSheet(deposit: deposit),
      );

  @override
  ConsumerState<PixDepositSheet> createState() => _PixDepositSheetState();
}

class _PixDepositSheetState extends ConsumerState<PixDepositSheet> {
  Timer? _timer;
  String? _failed;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(widget.pollInterval, (_) => _poll());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _poll() async {
    try {
      final d = await ref.read(backendProvider).deposit(widget.deposit.id);
      if (!mounted) return;
      if (d.status == DepositStatus.held) {
        _timer?.cancel();
        Navigator.of(context).pop(true);
      } else if (d.status == DepositStatus.failed || d.status == DepositStatus.released) {
        _timer?.cancel();
        setState(() => _failed = context.l.pixFailed);
      }
    } catch (_) {
      // rede instavel: tenta de novo no proximo ciclo
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final pix = widget.deposit.pix;
    Widget? qr;
    final b64 = pix?.qrCodeBase64;
    if (b64 != null && b64.isNotEmpty) {
      try {
        qr = Image.memory(base64Decode(b64.contains(',') ? b64.split(',').last : b64), width: 200, height: 200);
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
          Text(l.pixText(money(widget.deposit.amountCents)), style: VoltiTypography.body),
          const SizedBox(height: VoltiSpacing.s16),
          if (qr != null) Center(child: qr),
          if (pix != null) ...[
            const SizedBox(height: VoltiSpacing.s12),
            VoltiButton(
              label: l.copyPixCode,
              icon: LucideIcons.copy,
              variant: VoltiButtonVariant.secondary,
              fullWidth: true,
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: pix.copyPaste));
                if (context.mounted) VoltiToast.show(context, l.pixCopied);
              },
            ),
          ],
          const SizedBox(height: VoltiSpacing.s16),
          if (_failed != null)
            NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: _failed!)
          else
            Row(children: [
              const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
              const SizedBox(width: 10),
              Expanded(child: Text(l.pixWaiting, style: VoltiTypography.caption)),
            ]),
          const SizedBox(height: VoltiSpacing.s12),
          VoltiButton(
              label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
        ],
      ),
    );
  }
}
