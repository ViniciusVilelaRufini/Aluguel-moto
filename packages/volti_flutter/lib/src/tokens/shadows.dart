import 'package:flutter/animation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter/widgets.dart' show BuildContext, MediaQuery;

/// Sombras (`effects.css`).
abstract final class VoltiShadows {
  static const shadow1 = <BoxShadow>[
    BoxShadow(color: Color(0x0F15181A), offset: Offset(0, 1), blurRadius: 2),
    BoxShadow(color: Color(0x0F15181A), offset: Offset(0, 2), blurRadius: 8),
  ];
  static const shadow2 = <BoxShadow>[
    BoxShadow(color: Color(0x1415181A), offset: Offset(0, 4), blurRadius: 12),
    BoxShadow(color: Color(0x1415181A), offset: Offset(0, 12), blurRadius: 28),
  ];
  static const shadowSheet = <BoxShadow>[
    BoxShadow(color: Color(0x1F15181A), offset: Offset(0, -8), blurRadius: 32),
  ];
  static const shadowBrand = <BoxShadow>[
    BoxShadow(color: Color(0x5934C25C), offset: Offset(0, 8), blurRadius: 20),
  ];
  static const shadowCoral = <BoxShadow>[
    BoxShadow(color: Color(0x59F2665A), offset: Offset(0, 10), blurRadius: 24),
  ];

  /// Blur do vidro (`blur(16px)`); use com `ImageFilter.blur`.
  static const double glassBlur = 16;
}

/// Duracoes e curvas de motion (`effects.css` + `motion.css`).
abstract final class VoltiMotion {
  static const durFast = Duration(milliseconds: 120);
  static const durBase = Duration(milliseconds: 200);
  static const durSlow = Duration(milliseconds: 320);

  /// Troca de tela (`--dur-screen`).
  static const durScreen = Duration(milliseconds: 440);

  /// Press/knobs com mola (`--dur-spring`).
  static const durSpring = Duration(milliseconds: 280);

  static const easeOut = Cubic(.2, .8, .2, 1);
  static const easeSpring = Cubic(.34, 1.56, .64, 1);
  static const easeInOut = Cubic(.65, 0, .35, 1);

  /// Curva da troca de tela (`--ease-screen`).
  static const easeScreen = Cubic(.32, .72, 0, 1);

  static const double pressScale = .97;
  static const double iconPressScale = .88;
  static const double chipPressScale = .94;

  /// Press com reduced motion: sem escala, so opacidade (instantanea).
  static const double pressOpacityReduced = .85;

  /// Press escurece o fundo em 6% (`brilho -6%` do design system).
  static const double pressDarken = .06;

  /// Selecao (borda, fundo, check de cartoes, radios, chips): tween rapido.
  static const durSelect = Duration(milliseconds: 160);

  /// Quanto tempo o check de sucesso fica no botao antes de seguir.
  static const successHold = Duration(milliseconds: 700);

  /// [successHold] efetivo: zero com reduced motion.
  static Duration successHoldOf(BuildContext context) => scaled(context, successHold);

  /// Sombra durante o press: mesma cor, deslocamento e blur pela metade e
  /// alfa a 60% (a peca "encosta" na superficie).
  static List<BoxShadow> pressedShadow(List<BoxShadow> s) => [
    for (final b in s)
      BoxShadow(
        color: b.color.withValues(alpha: b.color.a * .6),
        offset: b.offset / 2,
        blurRadius: b.blurRadius / 2,
        spreadRadius: b.spreadRadius,
      ),
  ];

  /// Cascata (`.vt-stagger`): primeiro item aos 140 ms, 45 ms entre itens,
  /// itens a partir do 10o compartilham o ultimo atraso (545 ms).
  static const staggerFirst = Duration(milliseconds: 140);
  static const staggerStep = Duration(milliseconds: 45);
  static const staggerMax = Duration(milliseconds: 545);
  static const staggerItem = Duration(milliseconds: 480);
  static const double fadeUpOffset = 14;

  /// Atraso do item [index] (base 0) da cascata.
  static Duration staggerDelay(int index) {
    final d = staggerFirst + staggerStep * index;
    return d > staggerMax ? staggerMax : d;
  }

  /// `true` quando o usuario pediu menos movimento (reduced motion).
  static bool reduced(BuildContext context) =>
      MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  /// Duracao efetiva: zero com reduced motion.
  static Duration scaled(BuildContext context, Duration d) =>
      reduced(context) ? Duration.zero : d;
}
