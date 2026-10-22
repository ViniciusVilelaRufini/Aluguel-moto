import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' show Customer;
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';

final _e164 = RegExp(r'^\+[1-9]\d{7,14}$');

/// Converte o telefone digitado para E.164 (`MeUpdate.emergencyContactPhone`).
/// "(11) 98765-4321" -> "+5511987654321"; "+351912345678" fica como esta. Invalido -> null.
String? toE164(String input) {
  final t = input.trim();
  final digits = t.replaceAll(RegExp(r'\D'), '');
  String candidate;
  if (t.startsWith('+')) {
    candidate = '+$digits';
  } else if (digits.length == 10 || digits.length == 11) {
    candidate = '+55$digits';
  } else if ((digits.length == 12 || digits.length == 13) && digits.startsWith('55')) {
    candidate = '+$digits';
  } else {
    return null;
  }
  return _e164.hasMatch(candidate) ? candidate : null;
}

/// "+5511987654321" -> "(11) 98765-4321". Outros paises ficam em E.164.
String formatPhoneBr(String e164) {
  if (!e164.startsWith('+55')) return e164;
  final d = e164.substring(3);
  if (d.length == 11) return '(${d.substring(0, 2)}) ${d.substring(2, 7)}-${d.substring(7)}';
  if (d.length == 10) return '(${d.substring(0, 2)}) ${d.substring(2, 6)}-${d.substring(6)}';
  return e164;
}

/// Contato de emergencia (usado no SOS da corrida). Grava em `PATCH /me`.
class EmergencyContactScreen extends ConsumerStatefulWidget {
  const EmergencyContactScreen({super.key});
  @override
  ConsumerState<EmergencyContactScreen> createState() => _EmergencyContactScreenState();
}

class _EmergencyContactScreenState extends ConsumerState<EmergencyContactScreen> {
  late final TextEditingController _name;
  late final TextEditingController _phone;
  bool _busy = false;
  bool _touched = false;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController();
    _phone = TextEditingController();
    _fill(ref.read(sessionProvider).value?.customer);
    // Sessao ainda carregando: preenche quando chegar, se o cliente nao digitou nada.
    ref.listenManual(sessionProvider, (_, next) => _fill(next.value?.customer));
  }

  void _fill(Customer? c) {
    if (c == null || _name.text.isNotEmpty || _phone.text.isNotEmpty) return;
    _name.text = c.emergencyContactName ?? '';
    final p = c.emergencyContactPhone;
    _phone.text = p == null || p.isEmpty ? '' : formatPhoneBr(p);
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  String? get _nameError {
    final n = _name.text.trim();
    if (n.isEmpty) return context.l.emergencyNameRequired;
    if (n.length > 120) return context.l.emergencyNameTooLong;
    return null;
  }

  String? get _phoneError => toE164(_phone.text) == null ? context.l.emergencyPhoneInvalid : null;

  Future<void> _save() async {
    final l = context.l;
    setState(() => _touched = true);
    if (_nameError != null || _phoneError != null) return;
    setState(() => _busy = true);
    try {
      await ref.read(backendProvider).updateProfile(emergencyName: _name.text.trim(), emergencyPhone: toE164(_phone.text));
      await ref.read(sessionProvider.notifier).refresh();
      if (!mounted) return;
      VoltiToast.show(context, l.emergencySaved, tone: VoltiToastTone.success);
      Navigator.of(context).maybePop();
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return VoltiScaffold(
      title: l.emergencyTitle,
      bottom: VoltiButton(
        label: l.save,
        icon: LucideIcons.check,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        loading: _busy,
        onPressed: _busy ? null : _save,
      ),
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: [
          NoticeBanner(icon: LucideIcons.siren, title: l.emergencyWhyTitle, message: l.emergencyWhyText),
          const SizedBox(height: VoltiSpacing.s16),
          TextField(
            key: const Key('emergency-name'),
            controller: _name,
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.next,
            autofillHints: const [AutofillHints.name],
            maxLength: 120,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(labelText: l.emergencyName, errorText: _touched ? _nameError : null),
          ),
          const SizedBox(height: VoltiSpacing.s8),
          TextField(
            key: const Key('emergency-phone'),
            controller: _phone,
            keyboardType: TextInputType.phone,
            autofillHints: const [AutofillHints.telephoneNumber],
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d+()\- ]'))],
            onChanged: (_) => setState(() {}),
            onSubmitted: (_) => _save(),
            decoration: InputDecoration(
              labelText: l.emergencyPhone,
              hintText: '(11) 98765-4321',
              helperText: l.emergencyPhoneHint,
              errorText: _touched ? _phoneError : null,
            ),
          ),
        ],
      ),
    );
  }
}
