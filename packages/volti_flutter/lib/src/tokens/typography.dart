import 'package:flutter/painting.dart';

/// Tipografia (`typography.css`). Plus Jakarta Sans + JetBrains Mono.
abstract final class VoltiTypography {
  /// Familias declaradas no pubspec deste pacote (sem prefixo).
  static const familySans = 'Plus Jakarta Sans';
  static const familyMono = 'JetBrains Mono';

  /// Fontes de pacote so resolvem nos apps como `packages/<pacote>/<familia>`.
  /// Os apps NAO devem redeclarar as fontes.
  static const _pkg = 'packages/volti_flutter/';
  static const fontSans = '$_pkg$familySans';
  static const fontMono = '$_pkg$familyMono';

  static const fwRegular = FontWeight.w400;
  static const fwMedium = FontWeight.w500;
  static const fwSemibold = FontWeight.w600;
  static const fwBold = FontWeight.w700;
  static const fwBlack = FontWeight.w800;

  static const lhTight = 1.15;
  static const lhSnug = 1.3;
  static const lhBody = 1.45;
  static const lsTight = -0.02; // em
  static const lsCaps = 0.06; // em

  static const display = TextStyle(
      fontFamily: fontSans,
      fontWeight: fwBlack,
      fontSize: 34,
      height: 1.1,
      letterSpacing: 34 * lsTight);
  static const title = TextStyle(
      fontFamily: fontSans,
      fontWeight: fwBold,
      fontSize: 22,
      height: 1.2,
      letterSpacing: 22 * lsTight);
  static const heading = TextStyle(
      fontFamily: fontSans,
      fontWeight: fwBold,
      fontSize: 18,
      height: 1.25,
      letterSpacing: 18 * lsTight);
  static const bodyStrong = TextStyle(
      fontFamily: fontSans, fontWeight: fwSemibold, fontSize: 15, height: 1.4);
  static const body = TextStyle(
      fontFamily: fontSans, fontWeight: fwMedium, fontSize: 15, height: 1.45);
  static const label = TextStyle(
      fontFamily: fontSans, fontWeight: fwSemibold, fontSize: 14, height: 1.3);
  static const caption = TextStyle(
      fontFamily: fontSans, fontWeight: fwMedium, fontSize: 12, height: 1.35);
  static const overline = TextStyle(
      fontFamily: fontSans,
      fontWeight: fwBold,
      fontSize: 11,
      height: 1.3,
      letterSpacing: 11 * lsCaps);
  static const timer = TextStyle(
      fontFamily: fontMono, fontWeight: fwBold, fontSize: 28, height: 1);
}
