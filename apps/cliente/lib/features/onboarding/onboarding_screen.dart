
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/services.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';

/// Onboarding em 3 passos: dados + termos + consentimento de localizacao,
/// documento e selfie, e status da verificacao.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});
  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

/// Passo inicial do onboarding. Sem KYC iniciado o passo 0 (nome, CPF e
/// nascimento) e obrigatorio mesmo com termos ja aceitos: esses dados so existem
/// em memoria e o envio do KYC os exige (antes, retomar no passo 1 enviava
/// campos vazios e `DateTime.parse('')` estourava).
int initialOnboardingStep({required bool termsAccepted, required bool locationConsent, required KycStatus kyc}) {
  if (kyc == KycStatus.notStarted) return 0;
  if (!termsAccepted || !locationConsent) return 0;
  return 2;
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int? _step;
  String _name = '', _cpf = '', _birth = '';

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider).value;
    if (session == null) return const Scaffold(body: LoadingState());
    _step ??= initialOnboardingStep(
      termsAccepted: session.termsAccepted,
      locationConsent: session.locationConsent,
      kyc: session.kyc,
    );
    return switch (_step!) {
      0 => ConsentStep(
          onDone: (name, cpf, birth) {
            setState(() {
              _name = name;
              _cpf = cpf;
              _birth = birth;
              _step = 1;
            });
          },
        ),
      1 => DocumentsStep(
          name: _name,
          cpf: _cpf,
          birth: _birth,
          onBack: () => setState(() => _step = 0),
          onSubmitted: () => setState(() => _step = 2),
        ),
      _ => const VerificationStatusScreen(fromOnboarding: true),
    };
  }
}

class _StepShell extends StatelessWidget {
  const _StepShell({required this.step, required this.title, required this.subtitle, required this.children, required this.cta, this.onBack});
  final int step;
  final String title, subtitle;
  final List<Widget> children;
  final Widget cta;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12, VoltiSpacing.screenGutter, 0),
              child: Row(children: [
                if (onBack != null) ...[
                  VoltiIconButton(
                    icon: LucideIcons.arrowLeft,
                    variant: VoltiIconButtonVariant.soft,
                    label: l.back,
                    onPressed: onBack,
                  ),
                  const SizedBox(width: VoltiSpacing.s14),
                ],
                Expanded(child: ProgressSteps(total: 3, current: step, label: l.stepOf(step + 1, 3))),
              ]),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
                children: [
                  Semantics(header: true, child: Text(title, style: VoltiTypography.title)),
                  const SizedBox(height: VoltiSpacing.s6),
                  Text(subtitle, style: VoltiTypography.body),
                  const SizedBox(height: VoltiSpacing.s20),
                  ...children,
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  VoltiSpacing.screenGutter, 0, VoltiSpacing.screenGutter, VoltiSpacing.s16),
              child: cta,
            ),
          ],
        ),
      ),
    );
  }
}

/// Mascara por digitos: `#` e um digito, o resto e literal inserido automaticamente.
class MaskFormatter extends TextInputFormatter {
  MaskFormatter(this.mask);
  final String mask;

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final out = StringBuffer();
    var d = 0;
    for (var i = 0; i < mask.length && d < digits.length; i++) {
      if (mask[i] == '#') {
        out.write(digits[d++]);
      } else {
        out.write(mask[i]);
      }
    }
    final text = out.toString();
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));
  }
}

enum BirthError { incomplete, invalid, underage }

/// dd/mm/aaaa valida e com 18 anos ou mais? `null` = ok; senao o motivo.
BirthError? validateBirth(String text, {DateTime? now}) {
  if (text.length < 10) return BirthError.incomplete;
  final p = text.split('/');
  final d = int.tryParse(p[0]), m = int.tryParse(p[1]), y = int.tryParse(p[2]);
  if (d == null || m == null || y == null || y < 1900) return BirthError.invalid;
  final date = DateTime(y, m, d);
  if (date.day != d || date.month != m) return BirthError.invalid;
  final today = now ?? DateTime.now();
  if (date.isAfter(today)) return BirthError.invalid;
  var age = today.year - y;
  if (today.month < m || (today.month == m && today.day < d)) age--;
  return age >= 18 ? null : BirthError.underage;
}

class ConsentStep extends ConsumerStatefulWidget {
  const ConsentStep({super.key, required this.onDone});
  final void Function(String name, String cpf, String birth) onDone;
  @override
  ConsumerState<ConsentStep> createState() => _ConsentStepState();
}

class _ConsentStepState extends ConsumerState<ConsentStep> {
  final _name = TextEditingController();
  final _cpf = TextEditingController();
  final _birth = TextEditingController();
  bool _terms = false, _location = false, _marketing = false, _busy = false;
  Object? _error;

  @override
  void dispose() {
    _name.dispose();
    _cpf.dispose();
    _birth.dispose();
    super.dispose();
  }

  bool get _valid =>
      _terms && _location && _name.text.trim().isNotEmpty && _cpf.text.replaceAll(RegExp(r'\D'), '').length == 11 && validateBirth(_birth.text) == null;

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final backend = ref.read(backendProvider);
      await Future.wait([
        backend.updateProfile(name: _name.text.trim()),
        backend.updateConsents(terms: _terms, location: _location, marketing: _marketing),
      ]);
      await ref.read(sessionProvider.notifier).refresh();
      widget.onDone(_name.text.trim(), _cpf.text.trim(), _birth.text.trim());
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return _StepShell(
      step: 0,
      title: l.dataTitle,
      subtitle: l.dataSubtitle,
      cta: Column(mainAxisSize: MainAxisSize.min, children: [
        if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(failureText(l, _error!), style: const TextStyle(color: VoltiColors.danger))),
        if (_busy) const Padding(padding: EdgeInsets.only(bottom: 8), child: LinearProgressIndicator()),
        VoltiButton(
          label: _busy ? l.sending : l.continueLabel,
          size: VoltiButtonSize.lg,
          fullWidth: true,
          onPressed: (_valid && !_busy) ? _save : null,
        ),
      ]),
      children: [
        TextField(
          controller: _name,
          onChanged: (_) => setState(() {}),
          textCapitalization: TextCapitalization.words,
          autofillHints: const [AutofillHints.name],
          decoration: InputDecoration(labelText: l.fullName, hintText: l.fullNameHint, prefixIcon: const Icon(LucideIcons.user)),
        ),
        const SizedBox(height: VoltiSpacing.s12),
        TextField(
          controller: _cpf,
          onChanged: (_) => setState(() {}),
          keyboardType: TextInputType.number,
          inputFormatters: [MaskFormatter('###.###.###-##')],
          decoration: InputDecoration(labelText: l.cpf, hintText: '000.000.000-00', prefixIcon: const Icon(LucideIcons.idCard)),
        ),
        const SizedBox(height: VoltiSpacing.s12),
        TextField(
          controller: _birth,
          onChanged: (_) => setState(() {}),
          keyboardType: TextInputType.number,
          inputFormatters: [MaskFormatter('##/##/####')],
          decoration: InputDecoration(
              labelText: l.birthDate,
              hintText: 'dd/mm/aaaa',
              helperText: l.adultOnly,
              errorText: switch (_birth.text.length == 10 ? validateBirth(_birth.text) : null) {
                BirthError.invalid => l.birthInvalid,
                BirthError.underage => l.birthUnderage,
                _ => null,
              },
              prefixIcon: const Icon(LucideIcons.calendar)),
        ),
        const SizedBox(height: VoltiSpacing.s12),
        CheckboxListTile(
          key: const Key('consent-terms'),
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          value: _terms,
          onChanged: (v) => setState(() => _terms = v ?? false),
          title: Text(l.acceptTerms),
        ),
        CheckboxListTile(
          key: const Key('consent-location'),
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          value: _location,
          onChanged: (v) => setState(() => _location = v ?? false),
          title: Text(l.acceptLocation),
          subtitle: Text(l.acceptLocationHint),
        ),
        CheckboxListTile(
          key: const Key('consent-marketing'),
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          value: _marketing,
          onChanged: (v) => setState(() => _marketing = v ?? false),
          title: Text(l.acceptMarketing),
        ),
      ],
    );
  }
}

class DocumentsStep extends ConsumerStatefulWidget {
  const DocumentsStep({super.key, required this.name, required this.cpf, required this.birth, required this.onBack, required this.onSubmitted});
  final String name, cpf, birth;
  final VoidCallback onBack, onSubmitted;
  @override
  ConsumerState<DocumentsStep> createState() => _DocumentsStepState();
}

class _DocumentsStepState extends ConsumerState<DocumentsStep> {
  DocumentType _type = DocumentType.cnh;
  Uint8List? _doc, _selfie;
  bool _busy = false;
  Object? _error;

  Future<void> _pick(bool selfie) async {
    final bytes = await ref.read(photoPickerProvider).take(front: selfie);
    if (bytes == null || !mounted) return;
    setState(() => selfie ? _selfie = bytes : _doc = bytes);
  }

  String _isoBirth() {
    final p = widget.birth.split('/');
    return p.length == 3 ? '${p[2]}-${p[1]}-${p[0]}' : widget.birth;
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final backend = ref.read(backendProvider);
      final uploads = await backend.kycUploads(_type);
      await backend.upload(uploads.documentFront, _doc!, 'image/jpeg');
      await backend.upload(uploads.selfie, _selfie!, 'image/jpeg');
      await backend.submitKyc(KycSubmitRequest((b) => b
        ..fullName = widget.name
        ..cpf = widget.cpf.replaceAll(RegExp(r'\D'), '')
        ..birthDate = DateTime.parse(_isoBirth()).toDate()
        ..documentType = _type
        ..documentFrontObjectKey = uploads.documentFront.objectKey
        ..selfieObjectKey = uploads.selfie.objectKey));
      await ref.read(sessionProvider.notifier).refresh();
      widget.onSubmitted();
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return _StepShell(
      step: 1,
      title: l.kycTitle,
      subtitle: l.kycSubtitle,
      onBack: _busy ? null : widget.onBack,
      cta: Column(mainAxisSize: MainAxisSize.min, children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(failureText(l, _error!), style: const TextStyle(color: VoltiColors.danger)),
          ),
        VoltiButton(
          label: _error != null ? l.retry : (_busy ? l.sending : l.sendForReview),
          size: VoltiButtonSize.lg,
          fullWidth: true,
          onPressed: (_doc != null && _selfie != null && !_busy) ? _submit : null,
        ),
      ]),
      children: [
        Row(children: [
          Expanded(
            child: OptionCard(
                title: 'CNH', icon: LucideIcons.idCard, selected: _type == DocumentType.cnh, onTap: () => setState(() => _type = DocumentType.cnh)),
          ),
          const SizedBox(width: VoltiSpacing.s12),
          Expanded(
            child: OptionCard(
                title: 'RG', icon: LucideIcons.idCard, selected: _type == DocumentType.rg, onTap: () => setState(() => _type = DocumentType.rg)),
          ),
        ]),
        const SizedBox(height: VoltiSpacing.s14),
        PhotoCapture(
            label: l.documentPhoto, hint: l.documentPhotoHint, icon: LucideIcons.idCard, height: 140, done: _doc != null, onTap: () => _pick(false)),
        const SizedBox(height: VoltiSpacing.s14),
        PhotoCapture(
            label: l.selfiePhoto, hint: l.selfiePhotoHint, icon: LucideIcons.scanFace, height: 140, done: _selfie != null, onTap: () => _pick(true)),
        const SizedBox(height: VoltiSpacing.s14),
        NoticeBanner(message: l.kycPrivacy, icon: LucideIcons.shieldCheck),
      ],
    );
  }
}

/// Status da verificacao de identidade (onboarding e Conta).
class VerificationStatusScreen extends ConsumerStatefulWidget {
  const VerificationStatusScreen({super.key, this.fromOnboarding = false});
  final bool fromOnboarding;
  @override
  ConsumerState<VerificationStatusScreen> createState() => _VerificationStatusScreenState();
}

final kycStatusProvider = FutureProvider.autoDispose<KycStatusResponse>((ref) => ref.watch(backendProvider).kycStatus());

class _VerificationStatusScreenState extends ConsumerState<VerificationStatusScreen> {
  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final status = ref.watch(kycStatusProvider);
    return Scaffold(
      appBar: widget.fromOnboarding ? null : AppBar(title: Text(l.verificationTitle)),
      body: SafeArea(
        child: AsyncView<KycStatusResponse>(
          value: status,
          onRetry: () => ref.invalidate(kycStatusProvider),
          data: (s) {
            final (icon, title, text) = switch (s.status) {
              KycStatus.approved => (LucideIcons.circleCheck, l.kycApprovedTitle, l.kycApprovedText),
              KycStatus.rejected => (LucideIcons.circleX, l.kycRejectedTitle, s.reason ?? l.kycRejectedText),
              _ => (LucideIcons.clock, l.kycPendingTitle, l.kycPendingText),
            };
            return Padding(
              padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, size: 56, color: s.status == KycStatus.rejected ? VoltiColors.danger : VoltiColors.brand),
                  const SizedBox(height: VoltiSpacing.s16),
                  Semantics(header: true, child: Text(title, style: VoltiTypography.title, textAlign: TextAlign.center)),
                  const SizedBox(height: VoltiSpacing.s8),
                  Text(text, style: VoltiTypography.body, textAlign: TextAlign.center),
                  const SizedBox(height: VoltiSpacing.s24),
                  if (s.status == KycStatus.approved || widget.fromOnboarding)
                    VoltiButton(
                      label: l.goToMap,
                      size: VoltiButtonSize.lg,
                      fullWidth: true,
                      onPressed: () => context.go('/home'),
                    ),
                  const SizedBox(height: VoltiSpacing.s8),
                  VoltiButton(
                    label: l.refreshStatus,
                    variant: VoltiButtonVariant.ghost,
                    icon: LucideIcons.refreshCw,
                    onPressed: () async {
                      ref.invalidate(kycStatusProvider);
                      await ref.read(sessionProvider.notifier).refresh();
                    },
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
