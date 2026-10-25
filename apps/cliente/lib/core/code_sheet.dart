import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'widgets.dart';

/// Conteudo de sheet com um campo de codigo (cupom). Dono do proprio
/// controlador, que vive ate o sheet terminar de fechar. Devolve o texto
/// digitado (ou '' em "remover") pelo `Navigator.pop`.
class CodeEntrySheet extends StatefulWidget {
  const CodeEntrySheet({
    super.key,
    required this.title,
    required this.actionLabel,
    this.initial = '',
    this.removeLabel,
    this.fieldKey,
    this.actionKey,
    this.extra,
  });
  final String title, actionLabel, initial;
  final String? removeLabel;
  final Key? fieldKey, actionKey;

  /// Conteudo extra abaixo do campo (ex.: uso da carteira).
  final Widget? extra;

  @override
  State<CodeEntrySheet> createState() => _CodeEntrySheetState();
}

class _CodeEntrySheetState extends State<CodeEntrySheet> {
  late final _ctrl = TextEditingController(text: widget.initial);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  /// Cupom curto demais nao vale uma ida a API: Aplicar espera 3+ caracteres.
  bool get _valid => _ctrl.text.trim().length >= 3;

  void _done() => Navigator.of(context).pop(_ctrl.text.trim().toUpperCase());

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return SingleChildScrollView(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Semantics(header: true, child: Text(widget.title, style: VoltiTypography.title)),
      const SizedBox(height: 12),
      TextField(
        key: widget.fieldKey,
        controller: _ctrl,
        maxLength: 32,
        textCapitalization: TextCapitalization.characters,
        decoration: InputDecoration(hintText: l.couponHint, prefixIcon: const Icon(LucideIcons.ticket)),
        onChanged: (_) => setState(() {}),
        onSubmitted: (_) {
          if (_valid) _done();
        },
      ),
      ?widget.extra,
      const SizedBox(height: 12),
      VoltiButton(key: widget.actionKey, label: widget.actionLabel, fullWidth: true, onPressed: _valid ? _done : null),
      if (widget.removeLabel != null)
        VoltiButton(
          label: widget.removeLabel!,
          variant: VoltiButtonVariant.ghost,
          fullWidth: true,
          onPressed: () => Navigator.of(context).pop(''),
        ),
    ]),
    );
  }
}
