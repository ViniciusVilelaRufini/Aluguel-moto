import 'package:flutter/painting.dart';

/// Espacamento (`spacing.css`).
abstract final class VoltiSpacing {
  static const double s0 = 0;
  static const double s2 = 2;
  static const double s4 = 4;
  static const double s6 = 6;
  static const double s8 = 8;
  static const double s10 = 10;
  static const double s12 = 12;
  static const double s14 = 14;
  static const double s16 = 16;
  static const double s20 = 20;
  static const double s24 = 24;
  static const double s32 = 32;
  static const double s40 = 40;
  static const double s48 = 48;

  static const double screenGutter = 20;
  static const double controlSm = 36;
  static const double controlMd = 48;
  static const double controlLg = 56;
  static const double hitMin = 44;

  /// Caixa do checkbox e do radio (`Checkbox.jsx`), check e ponto internos.
  static const double checkbox = 22;
  static const double checkboxIcon = 14;
  static const double radio = 22;
  static const double radioDot = 12;
}

/// Raios (`spacing.css`).
abstract final class VoltiRadii {
  static const double xs = 6;
  static const double sm = 10;
  static const double md = 14;
  static const double lg = 20;
  static const double xl = 28;
  static const double pill = 999;

  /// Caixa do checkbox (`Checkbox.jsx`: 7 px).
  static const double checkbox = 7;

  static const rXs = BorderRadius.all(Radius.circular(xs));
  static const rSm = BorderRadius.all(Radius.circular(sm));
  static const rMd = BorderRadius.all(Radius.circular(md));
  static const rLg = BorderRadius.all(Radius.circular(lg));
  static const rXl = BorderRadius.all(Radius.circular(xl));
  static const rPill = BorderRadius.all(Radius.circular(pill));
  static const rCheckbox = BorderRadius.all(Radius.circular(checkbox));
  static const sheetTop = BorderRadius.vertical(top: Radius.circular(xl));
}
