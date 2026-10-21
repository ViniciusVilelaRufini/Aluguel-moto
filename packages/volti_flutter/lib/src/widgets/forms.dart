import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../tokens/colors.dart';
import '../tokens/shadows.dart';
import '../tokens/spacing.dart';
import '../tokens/typography.dart';
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
    final card = AnimatedContainer(
      duration: VoltiMotion.durBase,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: selected ? VoltiColors.brandSoft : scheme.surface,
        borderRadius: VoltiRadii.rLg,
        border: Border.all(
            color: selected ? VoltiColors.brand : scheme.outlineVariant, width: 1.5),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          key: const Key('option-radio'),
          width: 22,
          height: 22,
          margin: const EdgeInsets.only(top: 1),
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            border: Border.all(
                color: selected ? VoltiColors.brand : scheme.outline, width: 1.5),
          ),
          alignment: Alignment.center,
          child: selected
              ? Container(
                  width: 12,
                  height: 12,
                  decoration: const BoxDecoration(color: VoltiColors.brand, shape: BoxShape.circle))
              : null,
        ),
        const SizedBox(width: 12),
        if (icon != null) ...[
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
                color: tagBg, borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, size: 18, color: VoltiColors.ink700),
          ),
          const SizedBox(width: 12),
        ],
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Wrap(spacing: 8, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
              Text(title, style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface)),
              if (badge != null)
                Container(
                  height: 20,
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: tagBg, borderRadius: VoltiRadii.rXs),
                  child: Text(badge!,
                      style: const TextStyle(
                        fontFamily: VoltiTypography.fontSans,
                        fontWeight: VoltiTypography.fwSemibold,
                        fontSize: 11,
                        height: 1,
                        color: VoltiColors.ink700,
                      )),
                ),
            ]),
            if (description != null) ...[
              const SizedBox(height: 3),
              Text(description!, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
            ],
            ?child,
          ]),
        ),
        if (price != null) ...[
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(price!, style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface)),
            if (priceNote != null)
              Text(priceNote!, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
          ]),
        ],
      ]),
    );
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: selected,
      enabled: !disabled,
      child: Opacity(
        opacity: disabled ? .5 : 1,
        child: disabled || onTap == null
            ? card
            : VoltiPressable(onTap: onTap, scale: .99, child: card),
      ),
    );
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
  late final TextEditingController _c = TextEditingController(text: widget.value);
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
    final activeIdx = value.length < widget.length ? value.length : widget.length - 1;
    return GestureDetector(
      onTap: _focus.requestFocus,
      behavior: HitTestBehavior.opaque,
      child: Stack(children: [
        Row(children: [
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
        ]),
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
      ]),
    );
  }
}
