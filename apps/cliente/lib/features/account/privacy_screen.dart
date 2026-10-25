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
    if (context.mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
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
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l.consentLocationTitle),
            subtitle: Text(l.acceptLocationHint),
            value: s?.locationConsent ?? false,
            onChanged: _busy
                ? null
                : (v) => _guard(() => ref
                    .read(sessionProvider.notifier)
                    .saveConsents(terms: s?.termsAccepted ?? true, location: v, marketing: consents?.marketing ?? false)),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l.acceptMarketing),
            value: consents?.marketing ?? false,
            onChanged: _busy
                ? null
                : (v) => _guard(() => ref
                    .read(sessionProvider.notifier)
                    .saveConsents(terms: s?.termsAccepted ?? true, location: s?.locationConsent ?? false, marketing: v)),
          ),
          const SizedBox(height: 4),
          ListRow(
            key: const Key('privacy-terms'),
            icon: LucideIcons.fileText,
            title: l.termsOfUse,
            trailing: ListRowTrailing.chevron,
            onTap: () => openLegalDocument(context, ref, ref.read(legalLinksProvider).terms),
          ),
          ListRow(
            key: const Key('privacy-policy'),
            icon: LucideIcons.shieldCheck,
            title: l.privacyPolicy,
            trailing: ListRowTrailing.chevron,
            onTap: () => openLegalDocument(context, ref, ref.read(legalLinksProvider).privacy),
          ),
          const SizedBox(height: 12),
          VoltiButton(
            label: l.exportData,
            icon: LucideIcons.download,
            variant: VoltiButtonVariant.secondary,
            fullWidth: true,
            onPressed: _busy ? null : () => _guard(() => exportMyData(context, ref)),
          ),
          const SizedBox(height: 8),
          VoltiButton(
            label: l.deleteAccount,
            icon: LucideIcons.trash2,
            variant: VoltiButtonVariant.danger,
            fullWidth: true,
            onPressed: _busy ? null : () => confirmDeleteAccount(context, ref),
          ),
        ],
      ),
    );
  }
}
