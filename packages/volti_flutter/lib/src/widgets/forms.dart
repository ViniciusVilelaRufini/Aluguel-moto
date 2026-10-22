import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../tokens/colors.dart';
import '../tokens/shadows.dart';
import '../tokens/spacing.dart';
import '../tokens/typography.dart';
import 'haptics.dart';
import 'pressable.dart';

/// Cartao de escolha (plano, seguro, pagamento), estilo radio.
class OptionCard extends StatelessWidget {
  const OptionCard({
    super.key,
    required this.title,
    this.description,
    this.price,
    this.priceNote,
    this.badge,
    this.icon,
    this.selected = false,
    this.disabled = false,
    this.onTap,
    this.child,
  });

  final String title;
  final String? description;
  final String? price;
  final String? priceNote;

  /// Tag ao lado do titulo, ex.: "Obrigatório".
  final String? badge;
  final IconData? icon;
  final bool selected;
  final bool disabled;
  final VoidCallback? onTap;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final tagBg = selected ? Colors.white : scheme.surfaceContainerHighest;
    // Texto grande (> ~130%): o preco desce para baixo do titulo em vez de
    // disputar a largura da linha.
    final stacked = MediaQuery.textScalerOf(context).scale(10) > 13;
    Widget priceBlock(CrossAxisAlignment align) => Column(
          crossAxisAlignment: align,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              price!,
              style: VoltiTypography.bodyStrong.copyWith(
                color: scheme.onSurface,
              ),
            ),
            if (priceNote != null)
              Text(
                priceNote!,
                style: VoltiTypography.caption.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
          ],
        );
    final card = AnimatedContainer(
      key: const Key('option-card-surface'),
      duration: VoltiMotion.scaled(context, VoltiMotion.durSelect),
      curve: VoltiMotion.easeOut,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: selected ? VoltiColors.brandSoft : scheme.surface,
        borderRadius: VoltiRadii.rLg,
        border: Border.all(
          color: selected ? VoltiColors.brand : scheme.outlineVariant,
          width: 1.5,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: VoltiRadio(
              key: const Key('option-radio'),
              selected: selected,
              dotKey: const Key('option-radio-dot'),
            ),
          ),
          const SizedBox(width: 12),
          if (icon != null && !stacked) ...[
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: tagBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 18, color: VoltiColors.ink700),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      title,
                      style: VoltiTypography.bodyStrong.copyWith(
                        color: scheme.onSurface,
                      ),
                    ),
                    if (badge != null)
                      Container(
                        height: 20,
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: tagBg,
                          borderRadius: VoltiRadii.rXs,
                        ),
                        child: Text(
                          badge!,
                          style: const TextStyle(
                            fontFamily: VoltiTypography.fontSans,
                            fontWeight: VoltiTypography.fwSemibold,
                            fontSize: 11,
                            height: 1,
                            color: VoltiColors.ink700,
                          ),
                        ),
                      ),
                  ],
                ),
                if (description != null) ...[
                  const SizedBox(height: 3),
                  Text(
                    description!,
                    style: VoltiTypography.caption.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
                if (price != null && stacked) ...[
                  const SizedBox(height: 6),
                  priceBlock(CrossAxisAlignment.start),
                ],
                ?child,
              ],
            ),
          ),
          if (price != null && !stacked) ...[
            const SizedBox(width: 12),
            // Nunca empurra o titulo para fora: encolhe se faltar largura.
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 120),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.topRight,
                child: priceBlock(CrossAxisAlignment.end),
              ),
            ),
          ],
        ],
      ),
    );
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: selected,
      enabled: !disabled,
      child: Opacity(
        opacity: disabled ? VoltiColors.disabledOpacityCard : 1,
        child: disabled || onTap == null
            ? card
            : VoltiPressable(onTap: onTap, scale: .99, child: card),
      ),
    );
  }
}

/// Indicador de radio do design (22 px): borda anima para o verde e o ponto
/// entra com mola (escala 0 -> 1). So visual: o alvo de toque e o cartao ou a
/// linha que o contem, que tambem leva a semantica. Reduced motion = troca
/// instantanea.
class VoltiRadio extends StatelessWidget {
  const VoltiRadio({super.key, required this.selected, this.size = VoltiSpacing.radio, this.dotKey});

  final bool selected;
  final double size;

  /// Chave do ponto interno (testes).
  final Key? dotKey;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final reduced = VoltiMotion.reduced(context);
    return ExcludeSemantics(
      child: AnimatedContainer(
        duration: VoltiMotion.scaled(context, VoltiMotion.durSelect),
        curve: VoltiMotion.easeOut,
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          border: Border.all(color: selected ? VoltiColors.brand : scheme.outline, width: 1.5),
        ),
        alignment: Alignment.center,
        child: AnimatedScale(
          key: dotKey,
          scale: selected ? 1 : 0,
          duration: reduced ? Duration.zero : (selected ? VoltiMotion.durSpring : VoltiMotion.durFast),
          curve: selected ? VoltiMotion.easeSpring : VoltiMotion.easeOut,
          child: Container(
            width: size * VoltiSpacing.radioDot / VoltiSpacing.radio,
            height: size * VoltiSpacing.radioDot / VoltiSpacing.radio,
            decoration: const BoxDecoration(color: VoltiColors.brand, shape: BoxShape.circle),
          ),
        ),
      ),
    );
  }
}

/// Caixa de selecao do design (`Checkbox.jsx`): 22 px dentro de um alvo de
/// 44 px, fundo e borda em tween rapido, check com mola. Marcada = tom de
/// acao ([VoltiColors.brandAction]) com check branco (E-12). Toca
/// [VoltiHaptics.selection] ao mudar.
///
/// Com [label] vira uma linha inteira tocavel (caixa + texto), no lugar do
/// `CheckboxListTile`. Semantica: um no marcavel com [semanticLabel] ou, sem
/// ele, com o texto do [label].
class VoltiCheckbox extends StatelessWidget {
  const VoltiCheckbox({
    super.key,
    required this.value,
    this.onChanged,
    this.semanticLabel,
    this.haptic = true,
    this.label,
  });

  final bool value;

  /// `null` desabilita.
  final ValueChanged<bool>? onChanged;
  final String? semanticLabel;

  /// Toca [VoltiHaptics.selection] ao mudar.
  final bool haptic;

  /// Texto ao lado da caixa (titulo e, se quiser, descricao numa `Column`).
  final Widget? label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final enabled = onChanged != null;
    final reduced = VoltiMotion.reduced(context);
    final box = SizedBox(
      width: VoltiSpacing.hitMin,
      height: VoltiSpacing.hitMin,
      child: Center(
        child: AnimatedContainer(
          key: const Key('volti-checkbox-box'),
          duration: VoltiMotion.scaled(context, VoltiMotion.durSelect),
          curve: VoltiMotion.easeOut,
          width: VoltiSpacing.checkbox,
          height: VoltiSpacing.checkbox,
          decoration: BoxDecoration(
            color: value ? VoltiColors.brandAction : scheme.surface,
            borderRadius: VoltiRadii.rCheckbox,
            border: Border.all(color: value ? VoltiColors.brandAction : scheme.outline, width: 1.5),
          ),
          alignment: Alignment.center,
          child: AnimatedScale(
            key: const Key('volti-checkbox-check'),
            scale: value ? 1 : 0,
            duration: reduced ? Duration.zero : (value ? VoltiMotion.durSpring : VoltiMotion.durFast),
            curve: value ? VoltiMotion.easeSpring : VoltiMotion.easeOut,
            child: const Icon(Icons.check_rounded, size: VoltiSpacing.checkboxIcon, color: VoltiColors.onBrandAction),
          ),
        ),
      ),
    );
    final content = label == null
        ? box
        : Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              box,
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 11, bottom: 11, left: 2),
                  child: DefaultTextStyle.merge(
                    style: VoltiTypography.body.copyWith(color: scheme.onSurface),
                    child: label!,
                  ),
                ),
              ),
            ],
          );
    return MergeSemantics(
      child: Semantics(
        checked: value,
        enabled: enabled,
        label: semanticLabel,
        onTap: enabled ? _toggle : null,
        child: ExcludeSemantics(
          excluding: semanticLabel != null,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: enabled ? _toggle : null,
            child: Opacity(
              opacity: enabled ? 1 : VoltiColors.disabledOpacity,
              child: content,
            ),
          ),
        ),
      ),
    );
  }

  void _toggle() {
    if (haptic) VoltiHaptics.selection();
    onChanged?.call(!value);
  }
}

/// Campo segmentado de codigo (SMS). Aceita so digitos, ate [length].
class OtpInput extends StatefulWidget {
  const OtpInput({
    super.key,
    this.length = 6,
    this.value = '',
    this.onChanged,
    this.error = false,
    this.autofocus = false,
  });

  final int length;
  final String value;
  final ValueChanged<String>? onChanged;
  final bool error;
  final bool autofocus;

  @override
  State<OtpInput> createState() => _OtpInputState();
}

class _OtpInputState extends State<OtpInput> {
  late final TextEditingController _c = TextEditingController(
    text: widget.value,
  );
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
  }

  @override
  void didUpdateWidget(OtpInput old) {
    super.didUpdateWidget(old);
    if (widget.value != _c.text) {
      _c.value = TextEditingValue(
        text: widget.value,
        selection: TextSelection.collapsed(offset: widget.value.length),
      );
    }
  }

  @override
  void dispose() {
    _c.dispose();
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final value = _c.text;
    final activeIdx = value.length < widget.length
        ? value.length
        : widget.length - 1;
    return GestureDetector(
      onTap: _focus.requestFocus,
      behavior: HitTestBehavior.opaque,
      child: Stack(
        children: [
          Row(
            children: [
              for (var i = 0; i < widget.length; i++) ...[
                if (i > 0) const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    key: Key('otp-box-$i'),
                    height: 56,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: _focus.hasFocus && i == activeIdx
                          ? scheme.surface
                          : scheme.surfaceContainerHighest,
                      borderRadius: VoltiRadii.rMd,
                      border: Border.all(
                        width: 1.5,
                        color: widget.error
                            ? VoltiColors.danger
                            : (_focus.hasFocus && i == activeIdx
                                  ? VoltiColors.borderFocus
                                  : Colors.transparent),
                      ),
                    ),
                    child: Text(
                      i < value.length ? value[i] : '',
                      style: TextStyle(
                        fontFamily: VoltiTypography.fontMono,
                        fontWeight: VoltiTypography.fwBold,
                        fontSize: 22,
                        height: 1,
                        color: scheme.onSurface,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
          Positioned.fill(
            child: Opacity(
              opacity: 0,
              child: TextField(
                key: const Key('otp-field'),
                controller: _c,
                focusNode: _focus,
                autofocus: widget.autofocus,
                keyboardType: TextInputType.number,
                autofillHints: const [AutofillHints.oneTimeCode],
                enableInteractiveSelection: false,
                showCursor: false,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(widget.length),
                ],
                onChanged: (v) {
                  setState(() {});
                  widget.onChanged?.call(v);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
