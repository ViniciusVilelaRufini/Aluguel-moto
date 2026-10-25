import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'tokens/colors.dart';
import 'tokens/palette.dart';
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
        VoltiPalette.light,
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
          surfaceContainerHighest: Color(0xFF2A2F33),
          outline: VoltiColors.ink600,
          outlineVariant: VoltiColors.ink700,
          scrim: VoltiColors.ink900,
          inverseSurface: VoltiColors.ink100,
          onInverseSurface: VoltiColors.ink900,
        ),
        VoltiPalette.dark,
      );

  // Instancia unica: uma closure nova a cada build deixaria o ThemeData
  // diferente e o AnimatedTheme do MaterialApp animaria a toa.
  static final _checkFill = WidgetStateProperty.resolveWith<Color?>(
    (s) => s.contains(WidgetState.selected) && !s.contains(WidgetState.disabled) ? VoltiColors.brandAction : null,
  );

  /// Barra de status e de navegacao do sistema no tom do tema: icones escuros
  /// no claro e claros no escuro, fundo da barra de navegacao = fundo da tela.
  static SystemUiOverlayStyle overlayStyle(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    return SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: dark ? Brightness.light : Brightness.dark,
      statusBarBrightness: brightness, // iOS: brilho do fundo sob a barra
      systemNavigationBarColor: dark ? VoltiPalette.dark.surfaceApp : VoltiPalette.light.surfaceApp,
      systemNavigationBarIconBrightness: dark ? Brightness.light : Brightness.dark,
      systemNavigationBarDividerColor: Colors.transparent,
    );
  }

  static ThemeData _build(ColorScheme scheme, VoltiPalette palette) {
    final scaffold = palette.surfaceApp;
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
      extensions: [palette],
      cardTheme: CardThemeData(
        color: scheme.surface,
        elevation: 0,
        shape: const RoundedRectangleBorder(borderRadius: VoltiRadii.rLg),
      ),
      dividerColor: scheme.outlineVariant,
      // Sem o tint M3 ao rolar: a barra segue na cor da tela.
      appBarTheme: AppBarTheme(
        backgroundColor: scaffold,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        foregroundColor: scheme.onSurface,
        systemOverlayStyle: overlayStyle(scheme.brightness),
      ),
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
        surfaceTintColor: Colors.transparent,
        modalBarrierColor: palette.scrim,
        shape: const RoundedRectangleBorder(borderRadius: VoltiRadii.sheetTop),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: palette.pill,
        contentTextStyle: VoltiTypography.label.copyWith(color: VoltiColors.white),
      ),
      dividerTheme: DividerThemeData(color: scheme.outlineVariant),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: scheme.primary, linearTrackColor: palette.surfaceSunken),
      dialogTheme: DialogThemeData(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(borderRadius: VoltiRadii.rXl),
      ),
    );
  }
}
