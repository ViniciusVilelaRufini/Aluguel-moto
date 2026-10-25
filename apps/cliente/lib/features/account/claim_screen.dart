import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/services.dart';
import '../../core/widgets.dart';
import 'account_common.dart';

/// `ClaimCreate.description`: minLength 10, maxLength 4000 (openapi). Abaixo disso a API responde 422.
const kClaimMinChars = 10;
const kClaimMaxChars = 4000;

/// `ClaimCreate.photoObjectKeys`: maxItems 10 (fotos + boletim de ocorrencia).
const kClaimMaxAttachments = 10;

class _Attachment {
  _Attachment(this.bytes, {required this.policeReport});
  final Uint8List bytes;
  final bool policeReport;
  String? key;
  bool failed = false;
  bool get uploading => key == null && !failed;
}

// ---------------------------------------------------------------------------
// Sinistro com fotos e boletim de ocorrencia
// ---------------------------------------------------------------------------

class ClaimScreen extends ConsumerStatefulWidget {
  const ClaimScreen({super.key, required this.rentalId});
  final String rentalId;
  @override
  ConsumerState<ClaimScreen> createState() => _ClaimScreenState();
}

class _ClaimScreenState extends ConsumerState<ClaimScreen> {
  ClaimType _type = ClaimType.accident;
  final _desc = TextEditingController();
  final _items = <_Attachment>[];
  bool _busy = false;

  @override
  void dispose() {
    _desc.dispose();
    super.dispose();
  }

  int get _chars => _desc.text.trim().length;
  bool get _uploading => _items.any((a) => a.uploading);
  bool get _canSend => _chars >= kClaimMinChars && !_busy && !_uploading;
  bool get _full => _items.length >= kClaimMaxAttachments;

  Future<void> _capture({required bool policeReport}) async {
    if (_full) return;
    final bytes = await ref.read(photoPickerProvider).take();
    // O limite pode ter sido atingido enquanto a camera estava aberta.
    if (bytes == null || !mounted || _full) return;
    final a = _Attachment(bytes, policeReport: policeReport);
    setState(() => _items.add(a));
    await _upload(a);
  }

  Future<void> _upload(_Attachment a) async {
    final l = context.l;
    setState(() => a.failed = false);
    try {
      final backend = ref.read(backendProvider);
      final target = await backend.supportUpload(UploadContentType.imageSlashJpeg);
      await backend.upload(target, a.bytes, 'image/jpeg');
      // Removido durante o envio: nao volta para a lista.
      if (mounted && _items.contains(a)) setState(() => a.key = target.objectKey);
    } catch (e) {
      if (!mounted || !_items.contains(a)) return;
      setState(() => a.failed = true);
      VoltiToast.show(context, l.attachmentFailed, tone: VoltiToastTone.danger);
    }
  }

  void _remove(_Attachment a) => setState(() => _items.remove(a));

  Future<void> _send() async {
    final l = context.l;
    // Anexos que falharam nao vao; o cliente pode tentar de novo ou remover.
    if (_items.any((a) => a.failed)) {
      VoltiToast.show(context, l.attachmentRetryFirst, tone: VoltiToastTone.warning);
      return;
    }
    setState(() => _busy = true);
    try {
      final keys = [for (final a in _items) a.key!];
      await ref.read(backendProvider).claim(widget.rentalId, _type, _desc.text.trim(), photoKeys: keys);
      ref.invalidate(claimsProvider);
      if (mounted) {
        VoltiToast.show(context, l.claimSent, tone: VoltiToastTone.success);
        Navigator.of(context).maybePop();
      }
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final types = {
      ClaimType.accident: (l.claimAccident, LucideIcons.carFront),
      ClaimType.theft: (l.claimTheft, LucideIcons.shieldAlert),
      ClaimType.damage: (l.claimDamage, LucideIcons.wrench),
      ClaimType.personalInjury: (l.claimInjury, LucideIcons.heartPulse),
    };
    final photos = _items.where((a) => !a.policeReport).toList();
    final reports = _items.where((a) => a.policeReport).toList();
    final missing = kClaimMinChars - _chars;
    final boRecommended = _type == ClaimType.theft || _type == ClaimType.accident;
    return VoltiScaffold(
      title: l.openClaim,
      bottom: VoltiButton(
        label: _busy ? l.sending : l.claimSend,
        icon: LucideIcons.send,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        loading: _busy,
        onPressed: _canSend ? _send : null,
      ),
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: [
          Text(l.claimIntro, style: VoltiTypography.body),
          SectionTitle(l.claimTypeTitle),
          Wrap(spacing: 8, runSpacing: 4, children: [
            for (final e in types.entries)
              VoltiChip(
                label: e.value.$1,
                icon: e.value.$2,
                selected: _type == e.key,
                onTap: () => setState(() => _type = e.key),
              ),
          ]),
          SectionTitle(l.claimDescription),
          TextField(
            key: const Key('claim-description'),
            controller: _desc,
            maxLines: 5,
            maxLength: kClaimMaxChars,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: l.claimDescriptionHint,
              helperText: missing > 0 ? l.claimMinChars(missing) : null,
            ),
          ),
          SectionTitle(l.claimPhotosTitle),
          Text(l.claimPhotosHint(kClaimMaxAttachments), style: VoltiTypography.caption),
          const SizedBox(height: VoltiSpacing.s8),
          if (photos.isNotEmpty) ...[
            _Thumbs(items: photos, onRemove: _remove, onRetry: _upload),
            const SizedBox(height: VoltiSpacing.s8),
          ],
          PhotoCapture(
            key: const Key('claim-add-photo'),
            label: photos.isEmpty ? l.claimAddPhoto : l.claimAddMorePhoto,
            hint: l.claimPhotoCaptureHint,
            icon: LucideIcons.camera,
            height: 120,
            onTap: _full ? null : () => _capture(policeReport: false),
          ),
          SectionTitle(l.claimPoliceReportTitle),
          Text(boRecommended ? l.claimPoliceReportRecommended : l.claimPoliceReportHint, style: VoltiTypography.caption),
          const SizedBox(height: VoltiSpacing.s8),
          if (reports.isNotEmpty) ...[
            _Thumbs(items: reports, onRemove: _remove, onRetry: _upload),
            const SizedBox(height: VoltiSpacing.s8),
          ],
          PhotoCapture(
            key: const Key('claim-add-report'),
            label: reports.isEmpty ? l.claimAddPoliceReport : l.claimAddMorePoliceReport,
            icon: LucideIcons.fileText,
            height: 104,
            onTap: _full ? null : () => _capture(policeReport: true),
          ),
          if (_full) ...[
            const SizedBox(height: VoltiSpacing.s8),
            Text(l.claimAttachmentsFull(kClaimMaxAttachments), style: VoltiTypography.caption),
          ],
          const SizedBox(height: VoltiSpacing.s24),
        ],
      ),
    );
  }
}

class _Thumbs extends StatelessWidget {
  const _Thumbs({required this.items, required this.onRemove, required this.onRetry});
  final List<_Attachment> items;
  final void Function(_Attachment) onRemove;
  final Future<void> Function(_Attachment) onRetry;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    return Wrap(spacing: 8, runSpacing: 8, children: [
      for (var i = 0; i < items.length; i++)
        Semantics(
          container: true,
          label: items[i].failed
              ? l.attachmentFailedLabel(i + 1)
              : (items[i].uploading ? l.attachmentUploadingLabel(i + 1) : l.attachmentSentLabel(i + 1)),
          child: SizedBox(
            key: Key('claim-thumb-$i'),
            width: 88,
            height: 88,
            child: Stack(children: [
              Positioned.fill(
                child: ClipRRect(
                  borderRadius: VoltiRadii.rMd,
                  child: Image.memory(
                    items[i].bytes,
                    fit: BoxFit.cover,
                    excludeFromSemantics: true,
                    errorBuilder: (_, _, _) => Container(
                      color: scheme.surfaceContainerHighest,
                      child: Icon(LucideIcons.image, color: scheme.onSurfaceVariant),
                    ),
                  ),
                ),
              ),
              if (items[i].uploading)
                const Positioned.fill(
                  child: ColoredBox(
                    color: Color(0x66000000),
                    child: Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))),
                  ),
                ),
              if (items[i].failed)
                Positioned.fill(
                  child: Material(
                    color: context.palette.dangerSoft.withValues(alpha: .9),
                    borderRadius: VoltiRadii.rMd,
                    child: InkWell(
                      borderRadius: VoltiRadii.rMd,
                      onTap: () => onRetry(items[i]),
                      child: Center(
                        child: Column(mainAxisSize: MainAxisSize.min, children: [
                          Icon(LucideIcons.refreshCw, size: 18, color: context.palette.dangerInkStrong),
                          Text(l.retryShort, style: VoltiTypography.caption.copyWith(color: context.palette.dangerInkStrong)),
                        ]),
                      ),
                    ),
                  ),
                ),
              if (items[i].key != null)
                const Positioned(
                  left: 4,
                  bottom: 4,
                  child: CircleAvatar(radius: 10, backgroundColor: VoltiColors.brand, child: Icon(LucideIcons.check, size: 12, color: Colors.white)),
                ),
              Positioned(
                right: 0,
                top: 0,
                child: IconButton(
                  tooltip: l.attachmentRemove(i + 1),
                  visualDensity: VisualDensity.compact,
                  style: IconButton.styleFrom(backgroundColor: Colors.black54, minimumSize: const Size(32, 32)),
                  icon: const Icon(LucideIcons.x, size: 16, color: Colors.white),
                  onPressed: () => onRemove(items[i]),
                ),
              ),
            ]),
          ),
        ),
    ]);
  }
}
