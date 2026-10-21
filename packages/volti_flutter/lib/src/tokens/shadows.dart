import 'package:flutter/animation.dart';
import 'package:flutter/painting.dart';

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

/// Duracoes e curvas de motion.
abstract final class VoltiMotion {
  static const durFast = Duration(milliseconds: 120);
  static const durBase = Duration(milliseconds: 200);
  static const durSlow = Duration(milliseconds: 320);

  static const easeOut = Cubic(.2, .8, .2, 1);
  static const easeSpring = Cubic(.34, 1.56, .64, 1);
  static const easeInOut = Cubic(.65, 0, .35, 1);

  static const double pressScale = .97;
  static const double iconPressScale = .92;
}
