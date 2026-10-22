import 'package:flutter/material.dart';

import 'tokens/colors.dart';
import 'tokens/spacing.dart';
import 'tokens/typography.dart';

/// Temas Material 3 do Volti.
abstract final class VoltiTheme {
  static ThemeData light() => _build(
        const ColorScheme(
          brightness: Brightness.light,
          primary: VoltiColors.brand,
          onPrimary: VoltiColors.onBrand,
          primaryContainer: VoltiColors.brandSoft,
          onPrimaryContainer: VoltiColors.green700,
          secondary: VoltiColors.ink900,
          onSecondary: VoltiColors.white,
          error: VoltiColors.danger,
          onError: VoltiColors.white,
          errorContainer: VoltiColors.coral50,
          onErrorContainer: VoltiColors.coral600,
          surface: VoltiColors.surfaceCard,
          onSurface: VoltiColors.textPrimary,
          onSurfaceVariant: VoltiColors.textSecondary,
          surfaceContainerHighest: VoltiColors.surfaceSunken,
          outline: VoltiColors.borderStrong,
          outlineVariant: VoltiColors.borderSubtle,
          scrim: VoltiColors.ink900,
          inverseSurface: VoltiColors.ink900,
          onInverseSurface: VoltiColors.white,
        ),
        VoltiColors.surfaceApp,
      );

  /// Escuro: superficies de tinta (ink-900/800/700), verde de marca mantido.
  static ThemeData dark() => _build(
        const ColorScheme(
          brightness: Brightness.dark,
          primary: VoltiColors.brand,
          onPrimary: VoltiColors.white,
          primaryContainer: VoltiColors.green900,
          onPrimaryContainer: VoltiColors.green200,
          secondary: VoltiColors.ink100,
          onSecondary: VoltiColors.ink900,
          error: VoltiColors.coral500,
          onError: VoltiColors.white,
          errorContainer: Color(0xFF4A1F1B),
          onErrorContainer: VoltiColors.coral100,
          surface: VoltiColors.ink800,
          onSurface: VoltiColors.ink50,
          onSurfaceVariant: VoltiColors.ink400,
          surfaceContainerHighest: VoltiColors.ink700,
          outline: VoltiColors.ink600,
          outlineVariant: VoltiColors.ink700,
          scrim: VoltiColors.ink900,
          inverseSurface: VoltiColors.ink100,
          onInverseSurface: VoltiColors.ink900,
        ),
        VoltiColors.ink900,
      );

  // Instancia unica: uma closure nova a cada build deixaria o ThemeData
  // diferente e o AnimatedTheme do MaterialApp animaria a toa.
  static final _checkFill = WidgetStateProperty.resolveWith<Color?>(
    (s) => s.contains(WidgetState.selected) && !s.contains(WidgetState.disabled) ? VoltiColors.brandAction : null,
  );

  static ThemeData _build(ColorScheme scheme, Color scaffold) {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scaffold,
      fontFamily: VoltiTypography.fontSans,
      splashFactory: NoSplash.splashFactory,
    );
    final text = base.textTheme
        .copyWith(
          displayLarge: VoltiTypography.display,
          headlineMedium: VoltiTypography.title,
          titleLarge: VoltiTypography.heading,
          titleMedium: VoltiTypography.bodyStrong,
          bodyLarge: VoltiTypography.body,
          bodyMedium: VoltiTypography.body,
          labelLarge: VoltiTypography.label,
          bodySmall: VoltiTypography.caption,
          labelSmall: VoltiTypography.overline,
        )
        .apply(bodyColor: scheme.onSurface, displayColor: scheme.onSurface);
    return base.copyWith(
      textTheme: text,
      cardTheme: CardThemeData(
        color: scheme.surface,
        elevation: 0,
        shape: const RoundedRectangleBorder(borderRadius: VoltiRadii.rLg),
      ),
      dividerColor: scheme.outlineVariant,
      // Caixas Material (CheckboxListTile etc.) no padrao do kit:
      // marcado no tom de acao (E-12), sem halo de toque.
      checkboxTheme: CheckboxThemeData(
        fillColor: _checkFill,
        checkColor: const WidgetStatePropertyAll(VoltiColors.onBrandAction),
        overlayColor: const WidgetStatePropertyAll(Colors.transparent),
        shape: const RoundedRectangleBorder(borderRadius: VoltiRadii.rCheckbox),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surfaceContainerHighest,
        border: const OutlineInputBorder(
            borderRadius: VoltiRadii.rMd, borderSide: BorderSide.none),
        focusedBorder: const OutlineInputBorder(
            borderRadius: VoltiRadii.rMd,
            borderSide: BorderSide(color: VoltiColors.borderFocus, width: 1.5)),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surface,
        shape: const RoundedRectangleBorder(borderRadius: VoltiRadii.sheetTop),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: scheme.surface,
        shape: const RoundedRectangleBorder(borderRadius: VoltiRadii.rXl),
      ),
    );
  }
}
