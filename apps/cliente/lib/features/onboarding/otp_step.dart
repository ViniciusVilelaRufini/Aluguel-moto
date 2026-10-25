import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/session.dart';
import '../../core/widgets.dart';
import '../../l10n/app_localizations.dart';
import 'onboarding_screen.dart' show MaskFormatter;
import 'otp_flow.dart';
import 'step_shell.dart';

String otpErrorText(AppLocalizations l, OtpError e) => switch (e) {
      OtpError.invalidCode => l.otpErrorInvalid,
      OtpError.expiredCode => l.otpErrorExpired,
      OtpError.tooManyAttempts => l.otpErrorTooMany,
      OtpError.invalidDestination => l.otpErrorDestination,
      OtpError.network => l.errorNetwork,
      OtpError.notConfigured => l.loginCognitoPending,
      OtpError.unknown => l.errorGeneric,
    };

/// "0:42" a partir de segundos.
String formatCountdown(int seconds) => '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}';

/// Passo 1 de 4 do cadastro (Onboarding.jsx step 1): informa o celular (ou e-mail),
/// recebe o codigo (6 ou 8 digitos, conforme o desafio) e confirma. Conta nova ou existente, o fluxo e o mesmo.
class OtpStep extends ConsumerStatefulWidget {
  const OtpStep({super.key, required this.channel, required this.onExit, this.showDevHint = false});
  final OtpChannel channel;

  /// Voltar no primeiro estado (volta para as boas-vindas).
  final VoidCallback onExit;

  /// Modo dev: mostra o codigo fixo.
  final bool showDevHint;

  @override
  ConsumerState<OtpStep> createState() => _OtpStepState();
}

class _OtpStepState extends ConsumerState<OtpStep> {
  late final OtpFlowController _flow = OtpFlowController(client: ref.read(otpAuthClientProvider), channel: widget.channel)
    ..addListener(_changed);
  final _destination = TextEditingController();
  String _code = '';
  bool _showDestinationError = false;

  bool get _sms => widget.channel == OtpChannel.sms;

  void _changed() => setState(() {});

  @override
  void dispose() {
    _flow.removeListener(_changed);
    _flow.dispose();
    _destination.dispose();
    super.dispose();
  }

  String? get _normalized {
    final raw = _destination.text.trim();
    if (_sms) return brMobileToE164(raw);
    return looksLikeEmail(raw) ? raw.toLowerCase() : null;
  }

  Future<void> _send() async {
    final dest = _normalized;
    if (dest == null) {
      setState(() => _showDestinationError = true);
      return;
    }
    _code = '';
    await _flow.send(dest);
  }

  Future<void> _resend() async {
    await _flow.resend();
    if (!mounted || _flow.error != null) return;
    setState(() => _code = '');
    VoltiToast.show(context, context.l.otpResent, tone: VoltiToastTone.info);
  }

  Future<void> _verify() async {
    final ok = await _flow.verify(_code);
    if (!ok || !mounted) return;
    VoltiHaptics.success();
    final dest = _flow.challenge?.destination;
    await ref.read(sessionProvider.notifier).completeSignIn(phone: _sms ? dest : null);
  }

  void _back() {
    if (_flow.phase == OtpPhase.enterCode) {
      setState(() => _code = '');
      _flow.editDestination();
    } else {
      widget.onExit();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final phase = _flow.phase;
    final codePhase = phase == OtpPhase.enterCode || phase == OtpPhase.verifying || phase == OtpPhase.done;
    return codePhase ? _codeView(l) : _destinationView(l);
  }

  Widget _errorLine(String text) => Padding(
        padding: const EdgeInsets.only(top: VoltiSpacing.s8),
        child: Semantics(
          liveRegion: true,
          child: Text(text, key: const Key('otp-error'), style: VoltiTypography.caption.copyWith(color: VoltiColors.dangerInk)),
        ),
      );

  Widget _destinationView(AppLocalizations l) {
    final sending = _flow.phase == OtpPhase.sending;
    final invalid = _showDestinationError && _normalized == null;
    return OnboardingStepShell(
      step: 0,
      title: _sms ? l.otpPhoneTitle : l.otpEmailTitle,
      subtitle: _sms ? l.otpPhoneSubtitle : l.otpEmailSubtitle,
      onBack: sending ? null : _back,
      cta: VoltiButton(
        key: const Key('otp-send'),
        label: _flow.resendIn > 0 ? l.otpSendIn(formatCountdown(_flow.resendIn)) : l.otpSend,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        loading: sending,
        onPressed: !_flow.canSend || _destination.text.trim().isEmpty ? null : _send,
      ),
      children: [
        TextField(
          key: const Key('otp-destination'),
          controller: _destination,
          autofocus: true,
          enabled: !sending,
          keyboardType: _sms ? TextInputType.phone : TextInputType.emailAddress,
          autofillHints: [_sms ? AutofillHints.telephoneNumberNational : AutofillHints.email],
          inputFormatters: _sms ? [MaskFormatter('(##) #####-####')] : null,
          textInputAction: TextInputAction.send,
          onChanged: (_) => setState(() {
            _showDestinationError = false;
            _flow.clearError();
          }),
          onSubmitted: (_) => _send(),
          decoration: InputDecoration(
            labelText: _sms ? l.otpPhoneLabel : l.email,
            hintText: _sms ? '(11) 98765-4321' : 'voce@email.com',
            prefixIcon: Icon(_sms ? LucideIcons.phone : LucideIcons.mail),
            errorText: invalid ? (_sms ? l.otpPhoneInvalid : l.otpEmailInvalid) : null,
          ),
        ),
        if (_flow.error != null) _errorLine(otpErrorText(l, _flow.error!)),
        if (widget.showDevHint && _sms) ...[
          const SizedBox(height: VoltiSpacing.s12),
          Text(l.otpDevHint, key: const Key('otp-dev-hint'), style: VoltiTypography.caption),
        ],
      ],
    );
  }

  Widget _codeView(AppLocalizations l) {
    final c = _flow.challenge!;
    final verifying = _flow.phase == OtpPhase.verifying || _flow.phase == OtpPhase.done;
    final shown = _sms ? formatBrPhone(c.destination) : c.destination;
    final codeError = _flow.error == OtpError.invalidCode || _flow.error == OtpError.expiredCode;
    final caption = VoltiTypography.caption.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant);
    return OnboardingStepShell(
      step: 0,
      title: l.otpCodeTitle,
      subtitle: _sms ? l.otpCodeSentSms(c.codeLength, shown) : l.otpCodeSentEmail(c.codeLength, shown),
      onBack: verifying ? null : _back,
      cta: VoltiButton(
        key: const Key('otp-confirm'),
        label: l.otpConfirm,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        loading: verifying,
        onPressed: _code.length == c.codeLength && !verifying ? _verify : null,
      ),
      children: [
        if (_flow.accountConfirmed) ...[
          Semantics(
            liveRegion: true,
            child: Text(l.otpAccountConfirmed,
                key: const Key('otp-confirmed'), style: VoltiTypography.caption.copyWith(color: VoltiColors.successInk)),
          ),
          const SizedBox(height: VoltiSpacing.s12),
        ],
        Semantics(
          label: l.otpCodeLabel(c.codeLength),
          textField: true,
          child: OtpInput(
            length: c.codeLength,
            value: _code,
            autofocus: true,
            error: codeError,
            onChanged: (v) {
              setState(() => _code = v);
              _flow.clearError();
            },
          ),
        ),
        if (_flow.error != null) _errorLine(otpErrorText(l, _flow.error!)),
        const SizedBox(height: VoltiSpacing.s12),
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 4,
          children: [
            Text(l.otpNotReceived, style: caption),
            if (_flow.canResend)
              TextButton(
                key: const Key('otp-resend'),
                onPressed: _resend,
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  minimumSize: const Size(48, 48),
                  tapTargetSize: MaterialTapTargetSize.padded,
                ),
                child: Text(l.otpResend),
              )
            else
              Text(
                l.otpResendIn(formatCountdown(_flow.resendIn)),
                key: const Key('otp-countdown'),
                style: caption.copyWith(fontWeight: VoltiTypography.fwSemibold),
              ),
          ],
        ),
        const SizedBox(height: VoltiSpacing.s4),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: verifying ? null : _back,
            icon: const Icon(LucideIcons.pencil, size: 16),
            label: Text(l.otpEditDestination),
          ),
        ),
        if (widget.showDevHint && _sms) ...[
          const SizedBox(height: VoltiSpacing.s8),
          Text(l.otpDevHint, key: const Key('otp-dev-hint'), style: VoltiTypography.caption),
        ],
      ],
    );
  }
}
