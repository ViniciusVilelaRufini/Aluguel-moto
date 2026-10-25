
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
import '../../l10n/app_localizations.dart';
import 'payment_step.dart';
import 'step_shell.dart';

/// Cadastro depois do login (o codigo e o passo 1 de 4, em otp_step.dart):
/// 2 dados + termos (localizacao opcional), 3 documento e selfie, 4 forma de
/// pagamento. Ao concluir vai ao mapa com o toast "Cadastro enviado". O status da
/// verificacao aparece ao retomar com KYC ja enviado (ex.: recusado).
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});
  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

const onboardingDataStep = 0, onboardingDocsStep = 1, onboardingPaymentStep = 2, onboardingStatusStep = 3;

/// Passo inicial do onboarding. Sem KYC iniciado o passo de dados (nome, CPF e
/// nascimento) e obrigatorio mesmo com termos ja aceitos: esses dados so existem
/// em memoria e o envio do KYC os exige (antes, retomar no passo seguinte enviava
/// campos vazios e `DateTime.parse('')` estourava). A localizacao nao conta: e
/// opcional no cadastro e pedida de novo antes do aluguel.
int initialOnboardingStep({required bool termsAccepted, required KycStatus kyc}) {
  if (kyc == KycStatus.notStarted) return onboardingDataStep;
  if (!termsAccepted) return onboardingDataStep;
  return onboardingStatusStep;
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int? _step;
  // Passo anterior (para a direcao do deslize e o enchimento da barra).
  int? _from;
  String _name = '', _cpf = '', _birth = '';

  /// Fotos do KYC guardadas no fluxo: "Corrigir CPF" volta aos dados e o passo
  /// das fotos nao pode descarta-las.
  DocumentType _docType = DocumentType.cnh;
  Uint8List? _docPhoto, _selfiePhoto;

  /// CPF que o KYC recusou (409): o passo de dados mostra o aviso no campo.
  String? _cpfRejected;

  void _go(int step) => setState(() {
        _from = _step;
        _step = step;
      });

  void _finish() {
    VoltiToast.show(context, context.l.onboardingSentToast);
    context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider).value;
    if (session == null) return const Scaffold(body: LoadingState());
    _step ??= initialOnboardingStep(termsAccepted: session.termsAccepted, kyc: session.kyc);
    final step = _step!;
    // Barra dos passos do cadastro (indice da moldura = passo + 1; o codigo e o
    // 0). Ao entrar nos dados vindo do codigo, a barra enche do passo 1 ao 2.
    final from = _from ?? (step == onboardingDataStep ? -1 : null);
    return OnboardingStepSwitcher(
      step: step,
      framed: const {onboardingDataStep, onboardingDocsStep, onboardingPaymentStep},
      progressFrom: from == null || from == onboardingStatusStep ? null : from + 1,
      child: switch (step) {
        onboardingDataStep => ConsentStep(
            initialName: _name.isNotEmpty ? _name : (session.customer?.name ?? ''),
            initialCpf: _cpf,
            initialBirth: _birth,
            rejectedCpf: _cpfRejected == null ? null : _cpf,
            initialTerms: session.termsAccepted,
            // LGPD: consentimento so por acao do cliente. A caixa vem desmarcada (o design
            // a mostra marcada; ver docs/decisoes.md) e reflete o que ja foi gravado.
            initialLocation: session.locationConsent,
            initialMarketing: session.consents?.marketing ?? false,
            onBack: () => ref.read(sessionProvider.notifier).signOut(),
            onDone: (name, cpf, birth) {
              _name = name;
              _cpf = cpf;
              _birth = birth;
              _cpfRejected = null;
              _go(onboardingDocsStep);
            },
          ),
        onboardingDocsStep => DocumentsStep(
            name: _name,
            cpf: _cpf,
            birth: _birth,
            initialType: _docType,
            initialDoc: _docPhoto,
            initialSelfie: _selfiePhoto,
            onPhotosChanged: (type, doc, selfie) {
              _docType = type;
              _docPhoto = doc;
              _selfiePhoto = selfie;
            },
            alreadySubmitted: session.kyc == KycStatus.pending || session.kyc == KycStatus.approved,
            onBack: () => _go(onboardingDataStep),
            onSubmitted: () => _go(onboardingPaymentStep),
            // CPF ja usado em outra conta: volta ao campo de CPF, sem reenviar.
            onCpfRejected: () {
              _cpfRejected = _cpf;
              _go(onboardingDataStep);
            },
          ),
        onboardingPaymentStep => PaymentStep(
            onBack: () => _go(onboardingDocsStep),
            onDone: _finish,
          ),
        _ => VerificationStatusScreen(fromOnboarding: true, onResend: () => _go(onboardingDataStep)),
      },
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

/// CPF com 11 digitos e digitos verificadores validos (rejeita sequencias repetidas).
bool isValidCpf(String text) {
  final d = text.replaceAll(RegExp(r'\D'), '');
  if (d.length != 11 || RegExp(r'^(\d)\1{10}$').hasMatch(d)) return false;
  final n = d.split('').map(int.parse).toList();
  int check(int len) {
    var sum = 0;
    for (var i = 0; i < len; i++) {
      sum += n[i] * (len + 1 - i);
    }
    final r = (sum * 10) % 11;
    return r == 10 ? 0 : r;
  }

  return check(9) == n[9] && check(10) == n[10];
}

class ConsentStep extends ConsumerStatefulWidget {
  const ConsentStep({
    super.key,
    required this.onDone,
    this.onBack,
    this.initialName = '',
    this.initialCpf = '',
    this.initialBirth = '',
    this.rejectedCpf,
    this.initialTerms = false,
    this.initialLocation = false,
    this.initialMarketing = false,
  });
  final void Function(String name, String cpf, String birth) onDone;

  /// Voltar: sai do cadastro (encerra a sessao e volta as boas-vindas).
  final VoidCallback? onBack;
  final String initialName, initialCpf, initialBirth;

  /// CPF recusado pelo envio do KYC (ja cadastrado em outra conta): o campo mostra
  /// o erro enquanto o texto continuar igual a ele.
  final String? rejectedCpf;
  final bool initialTerms, initialLocation, initialMarketing;
  @override
  ConsumerState<ConsentStep> createState() => _ConsentStepState();
}

class _ConsentStepState extends ConsumerState<ConsentStep> {
  late final _name = TextEditingController(text: widget.initialName);
  late final _cpf = TextEditingController(text: widget.initialCpf);
  late final _birth = TextEditingController(text: widget.initialBirth);
  late bool _terms = widget.initialTerms, _location = widget.initialLocation, _marketing = widget.initialMarketing;
  bool _busy = false;
  Object? _error;

  @override
  void dispose() {
    _name.dispose();
    _cpf.dispose();
    _birth.dispose();
    super.dispose();
  }

  /// So os termos sao obrigatorios; localizacao e marketing sao opcionais.
  bool get _valid =>
      _terms && _name.text.trim().isNotEmpty && isValidCpf(_cpf.text) && !_cpfRejected && validateBirth(_birth.text) == null;

  bool get _cpfComplete => _cpf.text.replaceAll(RegExp(r'\D'), '').length == 11;

  bool get _cpfRejected => widget.rejectedCpf != null && widget.rejectedCpf == _cpf.text.trim();

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
    return OnboardingStepShell(
      step: 1,
      title: l.dataTitle,
      onBack: _busy ? null : widget.onBack,
      subtitle: l.dataSubtitle,
      cta: Column(mainAxisSize: MainAxisSize.min, children: [
        if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(failureText(l, _error!), style: TextStyle(color: context.palette.dangerInkStrong))),
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
          decoration: InputDecoration(
            labelText: l.cpf,
            hintText: '000.000.000-00',
            errorText: _cpfRejected ? l.cpfAlreadyUsed : (_cpfComplete && !isValidCpf(_cpf.text) ? l.cpfInvalidShort : null),
            errorMaxLines: 3,
            prefixIcon: const Icon(LucideIcons.idCard),
          ),
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
        VoltiCheckbox(
          key: const Key('consent-terms'),
          value: _terms,
          onChanged: (v) => setState(() => _terms = v),
          label: Text(l.acceptTerms),
        ),
        VoltiCheckbox(
          key: const Key('consent-location'),
          value: _location,
          onChanged: (v) => setState(() => _location = v),
          label: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(l.acceptLocation),
            const SizedBox(height: 2),
            Text(l.acceptLocationHint, style: VoltiTypography.caption.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ]),
        ),
        VoltiCheckbox(
          key: const Key('consent-marketing'),
          value: _marketing,
          onChanged: (v) => setState(() => _marketing = v),
          label: Text(l.acceptMarketing),
        ),
      ],
    );
  }
}

class DocumentsStep extends ConsumerStatefulWidget {
  const DocumentsStep({
    super.key,
    required this.name,
    required this.cpf,
    required this.birth,
    required this.onBack,
    required this.onSubmitted,
    this.onCpfRejected,
    this.alreadySubmitted = false,
    this.initialType = DocumentType.cnh,
    this.initialDoc,
    this.initialSelfie,
    this.onPhotosChanged,
  });
  final DocumentType initialType;
  final Uint8List? initialDoc, initialSelfie;

  /// Avisa o fluxo das fotos/tipo escolhidos (sobrevivem a volta ao passo de dados).
  final void Function(DocumentType type, Uint8List? doc, Uint8List? selfie)? onPhotosChanged;
  final String name, cpf, birth;

  /// KYC ja enviado (voltando do passo de pagamento): nada a reenviar.
  final bool alreadySubmitted;
  final VoidCallback onBack, onSubmitted;

  /// O envio foi recusado porque o CPF ja esta em outra conta (409): leva ao
  /// campo de CPF em vez de repetir o mesmo envio.
  final VoidCallback? onCpfRejected;
  @override
  ConsumerState<DocumentsStep> createState() => _DocumentsStepState();
}

class _DocumentsStepState extends ConsumerState<DocumentsStep> {
  late DocumentType _type = widget.initialType;
  late Uint8List? _doc = widget.initialDoc, _selfie = widget.initialSelfie;
  bool _busy = false;
  Object? _error;

  /// 409 do envio por CPF repetido: o botao vira "Corrigir CPF".
  bool _cpfTaken = false;

  Future<void> _pick(bool selfie) async {
    final bytes = await ref.read(photoPickerProvider).take(front: selfie);
    if (bytes == null || !mounted) return;
    setState(() => selfie ? _selfie = bytes : _doc = bytes);
    widget.onPhotosChanged?.call(_type, _doc, _selfie);
  }

  void _setType(DocumentType t) {
    setState(() => _type = t);
    widget.onPhotosChanged?.call(_type, _doc, _selfie);
  }

  String _isoBirth() {
    final p = widget.birth.split('/');
    return p.length == 3 ? '${p[2]}-${p[1]}-${p[0]}' : widget.birth;
  }

  /// Valida os dados do passo 0 antes de qualquer upload. Devolve o aviso a
  /// mostrar, ou null se estiver tudo certo.
  String? _validateInputs(AppLocalizations l) {
    if (widget.name.trim().isEmpty) return l.nameRequired;
    if (!isValidCpf(widget.cpf)) return l.cpfInvalid;
    if (validateBirth(widget.birth) != null) return l.birthInvalid;
    return null;
  }

  Future<void> _submit() async {
    final problem = _validateInputs(context.l);
    if (problem != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(problem)));
      widget.onBack();
      return;
    }
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
      // A API responde 409 "CPF ja cadastrado em outra conta": repetir o envio nao resolve.
      final f = toFailure(e);
      final taken = widget.onCpfRejected != null && f.status == 409 && (f.detail ?? '').contains('CPF');
      if (mounted) {
        setState(() {
          _cpfTaken = taken;
          _error = e;
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    if (widget.alreadySubmitted) {
      return OnboardingStepShell(
        step: 2,
        title: l.kycTitle,
        subtitle: l.kycSubtitle,
        onBack: widget.onBack,
        cta: VoltiButton(label: l.continueLabel, size: VoltiButtonSize.lg, fullWidth: true, onPressed: widget.onSubmitted),
        children: [
          PhotoCapture(label: l.documentPhoto, icon: LucideIcons.idCard, height: 140, done: true),
          const SizedBox(height: VoltiSpacing.s14),
          PhotoCapture(label: l.selfiePhoto, icon: LucideIcons.scanFace, height: 140, done: true),
          const SizedBox(height: VoltiSpacing.s14),
          NoticeBanner(message: l.docsAlreadySent, icon: LucideIcons.shieldCheck),
        ],
      );
    }
    return OnboardingStepShell(
      step: 2,
      title: l.kycTitle,
      subtitle: l.kycSubtitle,
      onBack: _busy ? null : widget.onBack,
      cta: Column(mainAxisSize: MainAxisSize.min, children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(_cpfTaken ? l.cpfAlreadyUsed : failureText(l, _error!), style: TextStyle(color: context.palette.dangerInkStrong)),
          ),
        if (_cpfTaken)
          VoltiButton(
            key: const Key('kyc-fix-cpf'),
            label: l.fixCpf,
            size: VoltiButtonSize.lg,
            fullWidth: true,
            onPressed: widget.onCpfRejected,
          )
        else
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
                title: 'CNH', icon: LucideIcons.idCard, selected: _type == DocumentType.cnh, onTap: () => _setType(DocumentType.cnh)),
          ),
          const SizedBox(width: VoltiSpacing.s12),
          Expanded(
            child: OptionCard(
                title: 'RG', icon: LucideIcons.idCard, selected: _type == DocumentType.rg, onTap: () => _setType(DocumentType.rg)),
          ),
        ]),
        const SizedBox(height: VoltiSpacing.s14),
        PhotoCapture(
            label: _type == DocumentType.cnh ? l.documentPhotoCnh : l.documentPhotoRg,
            hint: l.documentPhotoHint,
            icon: LucideIcons.idCard,
            height: 140,
            done: _doc != null,
            doneLabel: l.photoSent,
            retakeLabel: l.photoRetake,
            onTap: () => _pick(false)),
        const SizedBox(height: VoltiSpacing.s14),
        PhotoCapture(
            label: l.selfiePhoto,
            hint: l.selfiePhotoHint,
            icon: LucideIcons.scanFace,
            height: 140,
            done: _selfie != null,
            doneLabel: l.photoSent,
            retakeLabel: l.photoRetake,
            onTap: () => _pick(true)),
        const SizedBox(height: VoltiSpacing.s14),
        NoticeBanner(message: l.kycPrivacy, icon: LucideIcons.shieldCheck, info: true),
      ],
    );
  }
}

/// Status da verificacao de identidade (onboarding e Conta).
class VerificationStatusScreen extends ConsumerStatefulWidget {
  const VerificationStatusScreen({super.key, this.fromOnboarding = false, this.onResend});
  final bool fromOnboarding;

  /// Reinicia o envio de documentos (so oferecido quando a verificacao foi recusada).
  final VoidCallback? onResend;
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
                  if (s.status == KycStatus.rejected && widget.onResend != null) ...[
                    const SizedBox(height: VoltiSpacing.s8),
                    VoltiButton(
                      label: l.kycResend,
                      size: VoltiButtonSize.lg,
                      fullWidth: true,
                      onPressed: widget.onResend,
                    ),
                  ],
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
