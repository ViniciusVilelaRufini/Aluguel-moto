import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/mercadopago_gateway.dart';
import '../../core/widgets.dart';
import '../../l10n/app_localizations.dart';
import '../onboarding/onboarding_screen.dart' show MaskFormatter, isValidCpf;

/// Texto pt-BR de cada falha da tokenizacao.
String cardTokenErrorText(AppLocalizations l, CardTokenError e) => switch (e) {
      CardTokenError.invalidCard => l.cardErrorInvalidCard,
      CardTokenError.invalidCvv => l.cardErrorInvalidCvv,
      CardTokenError.invalidExpiry => l.cardErrorInvalidExpiry,
      CardTokenError.invalidHolder => l.cardErrorInvalidHolder,
      CardTokenError.invalidDocument => l.cardErrorInvalidDocument,
      CardTokenError.network => l.errorNetwork,
      CardTokenError.timeout => l.cardErrorTimeout,
      CardTokenError.unavailable => l.cardErrorUnavailable,
      CardTokenError.unknown => l.cardErrorGeneric,
    };

/// Agrupa o numero do cartao de 4 em 4 digitos (ate 19).
class CardNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    var digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length > 19) digits = digits.substring(0, 19);
    final out = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && i % 4 == 0) out.write(' ');
      out.write(digits[i]);
    }
    final text = out.toString();
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));
  }
}

/// Folha de coleta do cartao. Os dados ficam so nos controllers (limpos ao fechar);
/// [submit] os envia ao gateway e devolve o token, que e o unico resultado da folha.
class CardFormSheet extends StatefulWidget {
  const CardFormSheet({super.key, required this.submit});

  final Future<String> Function(CardData card) submit;

  /// Token do cartao, ou `null` se o cliente fechou a folha.
  static Future<String?> show(BuildContext context, {required Future<String> Function(CardData card) submit}) {
    return VoltiBottomSheet.show<String>(context, builder: (_) => CardFormSheet(submit: submit));
  }

  @override
  State<CardFormSheet> createState() => _CardFormSheetState();
}

class _CardFormSheetState extends State<CardFormSheet> {
  final _number = TextEditingController();
  final _holder = TextEditingController();
  final _expiry = TextEditingController();
  final _cvv = TextEditingController();
  final _cpf = TextEditingController();
  bool _busy = false;
  CardTokenError? _error;

  @override
  void dispose() {
    _number.dispose();
    _holder.dispose();
    _expiry.dispose();
    _cvv.dispose();
    _cpf.dispose();
    super.dispose();
  }

  int? get _month => _expiry.text.length == 5 ? int.tryParse(_expiry.text.substring(0, 2)) : null;
  int? get _year => _expiry.text.length == 5 ? 2000 + (int.tryParse(_expiry.text.substring(3)) ?? -2000) : null;

  bool get _numberOk => isValidCardNumber(_number.text);
  bool get _expiryOk => _month != null && _year != null && isCardExpiryValid(_month!, _year!);
  bool get _cvvOk => _cvv.text.length >= 3;
  bool get _holderOk => _holder.text.trim().length >= 2;
  bool get _cpfOk => isValidCpf(_cpf.text);
  bool get _valid => _numberOk && _expiryOk && _cvvOk && _holderOk && _cpfOk;

  Future<void> _save() async {
    if (!_valid || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final token = await widget.submit(CardData(
        number: _number.text,
        expMonth: _month!,
        expYear: _year!,
        cvv: _cvv.text,
        holderName: _holder.text,
        cpf: _cpf.text,
      ));
      if (mounted) Navigator.of(context).pop(token);
    } on CardTokenException catch (e) {
      if (mounted) setState(() => _error = e.error);
    } catch (_) {
      if (mounted) setState(() => _error = CardTokenError.unknown);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final numberDone = _number.text.replaceAll(RegExp(r'\D'), '').length >= 16;
    // Texto grande (200%): validade e CVV empilhados, sem truncar o rotulo.
    final stacked = MediaQuery.textScalerOf(context).scale(10) > 13;
    final expiryField = TextField(
      controller: _expiry,
      onChanged: (_) => setState(() {}),
      keyboardType: TextInputType.number,
      inputFormatters: [MaskFormatter('##/##')],
      autocorrect: false,
      enableSuggestions: false,
      autofillHints: const [AutofillHints.creditCardExpirationDate],
      decoration: InputDecoration(
        labelText: l.cardExpiry,
        hintText: l.cardExpiryHint,
        errorText: _expiry.text.length == 5 && !_expiryOk ? l.cardExpiryInvalid : null,
      ),
    );
    final cvvField = TextField(
      controller: _cvv,
      onChanged: (_) => setState(() {}),
      keyboardType: TextInputType.number,
      obscureText: true,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(4)],
      autocorrect: false,
      enableSuggestions: false,
      autofillHints: const [AutofillHints.creditCardSecurityCode],
      decoration: InputDecoration(labelText: l.cardCvv),
    );
    final cpfDone = _cpf.text.replaceAll(RegExp(r'\D'), '').length == 11;
    return SingleChildScrollView(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: AutofillGroup(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(header: true, child: Text(l.cardFormTitle, style: VoltiTypography.title)),
            const SizedBox(height: VoltiSpacing.s8),
            Text(l.cardFormHint, style: VoltiTypography.caption),
            const SizedBox(height: VoltiSpacing.s16),
            TextField(
              controller: _number,
              onChanged: (_) => setState(() {}),
              keyboardType: TextInputType.number,
              inputFormatters: [CardNumberFormatter()],
              autocorrect: false,
              enableSuggestions: false,
              autofillHints: const [AutofillHints.creditCardNumber],
              decoration: InputDecoration(
                labelText: l.cardNumber,
                hintText: '0000 0000 0000 0000',
                errorText: numberDone && !_numberOk ? l.cardNumberInvalid : null,
                prefixIcon: const Icon(LucideIcons.creditCard),
              ),
            ),
            const SizedBox(height: VoltiSpacing.s12),
            TextField(
              controller: _holder,
              onChanged: (_) => setState(() {}),
              textCapitalization: TextCapitalization.characters,
              autocorrect: false,
              enableSuggestions: false,
              autofillHints: const [AutofillHints.creditCardName],
              decoration: InputDecoration(labelText: l.cardHolder, prefixIcon: const Icon(LucideIcons.user)),
            ),
            const SizedBox(height: VoltiSpacing.s12),
            if (stacked) ...[
              expiryField,
              const SizedBox(height: VoltiSpacing.s12),
              cvvField,
            ] else
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: expiryField),
                  const SizedBox(width: VoltiSpacing.s12),
                  Expanded(child: cvvField),
                ],
              ),
            const SizedBox(height: VoltiSpacing.s12),
            TextField(
              controller: _cpf,
              onChanged: (_) => setState(() {}),
              keyboardType: TextInputType.number,
              inputFormatters: [MaskFormatter('###.###.###-##')],
              autocorrect: false,
              enableSuggestions: false,
              decoration: InputDecoration(
                labelText: l.cardHolderCpf,
                hintText: '000.000.000-00',
                errorText: cpfDone && !_cpfOk ? l.cpfInvalidShort : null,
                prefixIcon: const Icon(LucideIcons.idCard),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: VoltiSpacing.s12),
              Semantics(
                liveRegion: true,
                child: NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: cardTokenErrorText(l, _error!)),
              ),
            ],
            const SizedBox(height: VoltiSpacing.s16),
            VoltiButton(
              label: l.cardSave,
              icon: LucideIcons.check,
              size: VoltiButtonSize.lg,
              fullWidth: true,
              loading: _busy,
              loadingSemanticLabel: l.loading,
              onPressed: _valid && !_busy ? _save : null,
            ),
          ],
        ),
      ),
    );
  }
}
