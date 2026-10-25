import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';

/// Contraste AA (>= 4,5:1) dos pares de texto da [VoltiPalette] nos dois temas.
void main() {
  for (final p in [VoltiPalette.light, VoltiPalette.dark]) {
    final name = p.isDark ? 'escuro' : 'claro';
    final pairs = <String, (Color, Color)>{
      'textPrimary/surfaceApp': (p.textPrimary, p.surfaceApp),
      'textPrimary/surfaceCard': (p.textPrimary, p.surfaceCard),
      'textPrimary/surfaceSunken': (p.textPrimary, p.surfaceSunken),
      'textStrong/surfaceCard': (p.textStrong, p.surfaceCard),
      'textSecondary/surfaceCard': (p.textSecondary, p.surfaceCard),
      'textSecondary/surfaceApp': (p.textSecondary, p.surfaceApp),
      'textBrand/surfaceCard': (p.textBrand, p.surfaceCard),
      'onBrandSoft/brandSoft': (p.onBrandSoft, p.brandSoft),
      'onBrandSoft/brandSoftStrong': (p.onBrandSoft, p.brandSoftStrong),
      'successInk/successSoft': (p.successInk, p.successSoft),
      'successInk/surfaceCard': (p.successInk, p.surfaceCard),
      'infoInk/infoSoft': (p.infoInk, p.infoSoft),
      'infoInk/surfaceCard': (p.infoInk, p.surfaceCard),
      'warningInkStrong/warningSoft': (p.warningInkStrong, p.warningSoft),
      'dangerInkStrong/dangerSoft': (p.dangerInkStrong, p.dangerSoft),
      'dangerInkStrong/surfaceCard': (p.dangerInkStrong, p.surfaceCard),
      'sunInk/sunSoft': (p.sunInk, p.sunSoft),
      'onSurfaceMedia/surfaceMedia': (p.onSurfaceMedia, p.surfaceMedia),
      'onInverse/inverse': (p.onInverse, p.inverse),
      'white/pill': (VoltiColors.white, p.pill),
      'textPrimary/glass(sobre surfaceApp)': (p.textPrimary, Color.alphaBlend(p.glassBg, p.surfaceApp)),
      'onGlass/glass(sobre surfaceApp)': (p.onGlass, Color.alphaBlend(p.glassBg, p.surfaceApp)),
    };
    pairs.forEach((label, pair) {
      test('$name: $label >= 4,5:1', () {
        final ratio = VoltiColors.contrast(pair.$1, pair.$2);
        expect(ratio, greaterThanOrEqualTo(4.5), reason: '$label = ${ratio.toStringAsFixed(2)}');
      });
    });
  }

  testWidgets('VoltiPalette.of segue o tema', (tester) async {
    late VoltiPalette light, dark;
    await tester.pumpWidget(MaterialApp(
      theme: VoltiTheme.light(),
      home: Builder(builder: (c) {
        light = VoltiPalette.of(c);
        return const SizedBox();
      }),
    ));
    await tester.pumpWidget(MaterialApp(
      key: const Key('escuro'),
      theme: VoltiTheme.dark(),
      home: Builder(builder: (c) {
        dark = c.palette;
        return const SizedBox();
      }),
    ));
    expect(light.isDark, isFalse);
    expect(dark.isDark, isTrue);
    expect(dark.surfaceCard, VoltiTheme.dark().colorScheme.surface);
    expect(light.surfaceCard, VoltiTheme.light().colorScheme.surface);
  });

  test('tema escuro pede icones claros na barra de status', () {
    expect(VoltiTheme.dark().appBarTheme.systemOverlayStyle?.statusBarIconBrightness, Brightness.light);
    expect(VoltiTheme.light().appBarTheme.systemOverlayStyle?.statusBarIconBrightness, Brightness.dark);
  });
}
