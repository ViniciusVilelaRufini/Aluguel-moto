import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'geo.dart';
import 'pix_qr.dart';
import 'widgets.dart';

/// Corpo de uma cobranca Pix em andamento: titulo, texto, QR, copia e cola, validade e
/// "aguardando" (ou o aviso de falha). Mesmo componente da recarga da carteira e da
/// quitacao de pendencia ("Pagar agora", R2-01).
class PixChargePanel extends StatelessWidget {
  const PixChargePanel({
    super.key,
    required this.title,
    required this.text,
    required this.pix,
    required this.closeLabel,
    required this.onClose,
    this.failure,
    this.qrKey = const Key('pix-charge-qr'),
    this.copyPasteKey = const Key('pix-charge-copy-paste'),
  });

  final String title;
  final String text;
  final PixCharge? pix;

  /// Fim sem pagamento (vencido/recusado): troca o "aguardando" pelo aviso.
  final String? failure;
  final String closeLabel;
  final VoidCallback onClose;
  final Key qrKey;
  final Key copyPasteKey;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final pix = this.pix;
    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(header: true, child: Text(title, style: VoltiTypography.title)),
          const SizedBox(height: VoltiSpacing.s8),
          Text(text, style: VoltiTypography.body),
          const SizedBox(height: VoltiSpacing.s16),
          if (pix != null) Center(child: PixQrCode(key: qrKey, pix: pix, semanticLabel: l.pixQrLabel)),
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
                key: copyPasteKey,
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
          if (failure != null)
            NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: failure!)
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
          VoltiButton(label: closeLabel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: onClose),
        ],
      ),
    );
  }
}

/// Fim feliz de uma cobranca Pix: check + titulo + texto.
class PixPaidView extends StatelessWidget {
  const PixPaidView({super.key, required this.title, required this.text});
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: VoltiSpacing.s24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const VoltiSuccessCheck(delay: Duration.zero),
          const SizedBox(height: VoltiSpacing.s16),
          Semantics(liveRegion: true, child: Text(title, style: VoltiTypography.title, textAlign: TextAlign.center)),
          const SizedBox(height: VoltiSpacing.s8),
          Text(text, style: VoltiTypography.body, textAlign: TextAlign.center),
        ]),
      );
}
