import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/launcher.dart';
import '../../core/legal.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';

/// Compartilha o arquivo. Sobrescrito nos testes.
final shareFileProvider = Provider<Future<void> Function(XFile file, String name)>(
  (ref) => (file, name) async {
    await SharePlus.instance.share(ShareParams(files: [file], fileNameOverrides: [name], subject: name));
  },
);

const kExportFileName = 'volti-meus-dados.json';

/// LGPD: baixa os dados como arquivo `.json` e abre o compartilhamento do sistema.
Future<void> exportMyData(BuildContext context, WidgetRef ref) async {
  final l = context.l;
  try {
    final data = await ref.read(backendProvider).exportData();
    final json = const JsonEncoder.withIndent('  ').convert(standardSerializers.serializeWith(LgpdExport.serializer, data));
    final file = XFile.fromData(utf8.encode(json), mimeType: 'application/json', name: kExportFileName);
    await ref.read(shareFileProvider)(file, kExportFileName);
  } catch (e) {
    if (context.mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
  }
}

/// LGPD: exclui a conta depois de confirmar.
Future<void> confirmDeleteAccount(BuildContext context, WidgetRef ref) async {
  final l = context.l;
  final ok = await VoltiDialog.show<bool>(
    context,
    title: l.deleteAccountTitle,
    message: Text(l.deleteAccountText),
    actions: [
      VoltiButton(
          label: l.deleteAccountConfirm,
          variant: VoltiButtonVariant.danger,
          fullWidth: true,
          onPressed: () => Navigator.of(context).pop(true)),
      VoltiButton(label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
    ],
  );
  if (ok != true) return;
  try {
    await ref.read(backendProvider).deleteAccount();
    await ref.read(sessionProvider.notifier).signOut();
    if (context.mounted) context.go('/welcome');
  } catch (e) {
    if (!context.mounted) return;
    final f = toFailure(e);
    if (f.status == 409 && f.slug == 'account-deletion-blocked') {
      // Task 30: o motivo (reserva, entrega, caucao, aluguel ou pendencia) e o que fazer vem da API; fica num
      // dialogo para o cliente ler com calma em vez de um toast que some.
      await VoltiDialog.show<void>(
        context,
        title: l.deleteAccountBlockedTitle,
        message: Text(f.message(l), key: const Key('delete-account-blocked')),
        actions: [
          VoltiButton(label: l.close, variant: VoltiButtonVariant.secondary, fullWidth: true, onPressed: () => Navigator.of(context).pop()),
        ],
      );
      return;
    }
    VoltiToast.show(context, f.message(l), tone: VoltiToastTone.danger);
  }
}

// ---------------------------------------------------------------------------
// Privacidade (LGPD): consentimentos, exportar e excluir
// ---------------------------------------------------------------------------

class PrivacyScreen extends ConsumerStatefulWidget {
  const PrivacyScreen({super.key});
  @override
  ConsumerState<PrivacyScreen> createState() => _PrivacyScreenState();
}

class _PrivacyScreenState extends ConsumerState<PrivacyScreen> {
  bool _busy = false;

  Future<void> _guard(Future<void> Function() f) async {
    final l = context.l;
    setState(() => _busy = true);
    try {
      await f();
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final s = ref.watch(sessionProvider).value;
    final consents = s?.consents;
    return VoltiScaffold(
      title: l.privacy,
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: [
          Text(l.privacyIntro, style: VoltiTypography.body),
          VoltiListGroup(title: l.privacyConsents, children: [
            SwitchListTile(
              key: const Key('privacy-location-switch'),
              title: Text(l.consentLocationTitle),
              subtitle: Text(l.acceptLocationHintHere),
              value: s?.locationConsent ?? false,
              onChanged: _busy
                  ? null
                  : (v) => _guard(() => ref
                      .read(sessionProvider.notifier)
                      .saveConsents(terms: s?.termsAccepted ?? true, location: v, marketing: consents?.marketing ?? false)),
            ),
            const Divider(height: 1),
            SwitchListTile(
              key: const Key('privacy-marketing-switch'),
              title: Text(l.acceptMarketing),
              value: consents?.marketing ?? false,
              onChanged: _busy
                  ? null
                  : (v) => _guard(() => ref
                      .read(sessionProvider.notifier)
                      .saveConsents(terms: s?.termsAccepted ?? true, location: s?.locationConsent ?? false, marketing: v)),
            ),
          ]),
          VoltiListGroup(title: l.privacyDocuments, children: [
            ListRow(
              key: const Key('privacy-terms'),
              icon: LucideIcons.fileText,
              title: l.termsOfUse,
              trailing: ListRowTrailing.chevron,
              onTap: () => openLegalDocument(context, ref, ref.read(legalLinksProvider).terms),
            ),
            const Divider(height: 1),
            ListRow(
              key: const Key('privacy-policy'),
              icon: LucideIcons.shieldCheck,
              title: l.privacyPolicy,
              trailing: ListRowTrailing.chevron,
              onTap: () => openLegalDocument(context, ref, ref.read(legalLinksProvider).privacy),
            ),
          ]),
          const SizedBox(height: VoltiSpacing.s16),
          VoltiButton(
            label: l.exportData,
            icon: LucideIcons.download,
            variant: VoltiButtonVariant.secondary,
            fullWidth: true,
            onPressed: _busy ? null : () => _guard(() => exportMyData(context, ref)),
          ),
          // Acao destrutiva: discreta e longe de Exportar.
          const SizedBox(height: VoltiSpacing.s32),
          TextButton.icon(
            key: const Key('privacy-delete'),
            style: TextButton.styleFrom(foregroundColor: context.palette.dangerInkStrong, minimumSize: const Size.fromHeight(VoltiSpacing.hitMin)),
            icon: const Icon(LucideIcons.trash2, size: 18),
            label: Text(l.deleteAccount, textAlign: TextAlign.center),
            onPressed: _busy ? null : () => confirmDeleteAccount(context, ref),
          ),
        ],
      ),
    );
  }
}
