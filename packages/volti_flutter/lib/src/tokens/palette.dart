import 'package:flutter/material.dart';

import 'colors.dart';

/// Cores semanticas que acompanham o tema (claro/escuro).
///
/// `VoltiColors` guarda os tokens do `colors.css`, que so descreve o tema claro;
/// esta extensao e a forma unica de pegar uma cor de superficie, texto, borda ou
/// tom (soft + ink) que precisa mudar quando o aparelho fica no modo escuro:
///
/// ```dart
/// final p = VoltiPalette.of(context);
/// Container(color: p.surfaceCard, child: Text('Oi', style: TextStyle(color: p.textPrimary)));
/// ```
///
/// O escuro usa as superficies de tinta do `VoltiTheme.dark()` (ink-900/800) e
/// tons "soft" escuros com "ink" claro; todo par soft+ink e texto/superficie
/// passa de 4,5:1 (`palette_test.dart`). Continuam fixos (fora daqui) o verde de
/// acao com texto branco (`brandAction`), o coral do SOS, as cores de status da
/// frota e da bateria e o branco sobre foto/mapa escurecido.
@immutable
class VoltiPalette extends ThemeExtension<VoltiPalette> {
  const VoltiPalette({
    required this.brightness,
    required this.surfaceApp,
    required this.surfaceCard,
    required this.surfaceSunken,
    required this.surfaceRaised,
    required this.surfaceMedia,
    required this.onSurfaceMedia,
    required this.scrim,
    required this.inverse,
    required this.onInverse,
    required this.pill,
    required this.textPrimary,
    required this.textStrong,
    required this.textSecondary,
    required this.textTertiary,
    required this.textBrand,
    required this.borderSubtle,
    required this.borderStrong,
    required this.brandSoft,
    required this.brandSoftStrong,
    required this.onBrandSoft,
    required this.successSoft,
    required this.successInk,
    required this.infoSoft,
    required this.infoInk,
    required this.warningSoft,
    required this.warningInk,
    required this.warningInkStrong,
    required this.dangerSoft,
    required this.dangerInk,
    required this.dangerInkStrong,
    required this.sunSoft,
    required this.sunInk,
    required this.glassBg,
    required this.onGlass,
    required this.mapLand,
    required this.skeletonBase,
    required this.skeletonHighlight,
    required this.pressOverlay,
  });

  final Brightness brightness;

  /// Fundo das telas (`--surface-app`).
  final Color surfaceApp;

  /// Cartoes, folhas, dialogos, campos sobre o fundo (`--surface-card`).
  final Color surfaceCard;

  /// Fundo afundado: campos, trilhas, linhas de lista (`--surface-sunken`).
  final Color surfaceSunken;

  /// Superficie acima do cartao (botao redondo sobre o mapa, alca, selo).
  final Color surfaceRaised;

  /// Ceu atras de fotos de veiculo (`--surface-media`) e o icone sobre ele.
  final Color surfaceMedia;
  final Color onSurfaceMedia;

  /// Veu de modais.
  final Color scrim;

  /// Superficie inversa (chip selecionado escuro no claro / claro no escuro).
  final Color inverse;
  final Color onInverse;

  /// Pilula de dado e toast: sempre escura, com texto branco (fixo).
  final Color pill;

  final Color textPrimary;

  /// Texto/icone forte secundario (ink-700 no claro).
  final Color textStrong;
  final Color textSecondary;
  final Color textTertiary;

  /// Texto verde de marca legivel sobre a superficie (`--text-brand`).
  final Color textBrand;

  final Color borderSubtle;
  final Color borderStrong;

  /// Fundo verde suave (selecao, disco de estado vazio) e o texto sobre ele.
  final Color brandSoft;
  final Color brandSoftStrong;
  final Color onBrandSoft;

  final Color successSoft;
  final Color successInk;
  final Color infoSoft;
  final Color infoInk;
  final Color warningSoft;

  /// Icone/texto grande sobre [warningSoft]; texto de corpo usa [warningInkStrong].
  final Color warningInk;
  final Color warningInkStrong;
  final Color dangerSoft;

  /// Icone/texto grande sobre [dangerSoft]; texto de corpo usa [dangerInkStrong].
  final Color dangerInk;
  final Color dangerInkStrong;

  /// Amarelo suave (passe "sol", dica) e o texto sobre ele.
  final Color sunSoft;
  final Color sunInk;

  /// Vidro (82%) dos cards flutuantes sobre o mapa e o texto sobre ele.
  final Color glassBg;
  final Color onGlass;

  /// Cor de terra do mapa (fundo enquanto os tiles carregam).
  final Color mapLand;

  final Color skeletonBase;
  final Color skeletonHighlight;

  /// Escurecimento/clareamento do press em superficies neutras.
  final Color pressOverlay;

  bool get isDark => brightness == Brightness.dark;

  /// Verde de texto do claro com AA sobre branco, green-50 e green-100 (o
  /// `--green-700` fica em 4,4:1 no branco e 4,0:1 no green-50).
  static const _greenInkAA = Color(0xFF176B2F);

  static const light = VoltiPalette(
    brightness: Brightness.light,
    surfaceApp: VoltiColors.surfaceApp,
    surfaceCard: VoltiColors.surfaceCard,
    surfaceSunken: VoltiColors.surfaceSunken,
    surfaceRaised: VoltiColors.white,
    surfaceMedia: VoltiColors.surfaceMedia,
    onSurfaceMedia: VoltiColors.blue600,
    scrim: VoltiColors.surfaceScrim,
    inverse: VoltiColors.ink900,
    onInverse: VoltiColors.white,
    pill: VoltiColors.ink900,
    textPrimary: VoltiColors.textPrimary,
    textStrong: VoltiColors.ink700,
    textSecondary: VoltiColors.textSecondary,
    textTertiary: VoltiColors.textTertiary,
    textBrand: VoltiColors.brandAction,
    borderSubtle: VoltiColors.borderSubtle,
    borderStrong: VoltiColors.borderStrong,
    brandSoft: VoltiColors.brandSoft,
    brandSoftStrong: VoltiColors.green100,
    onBrandSoft: _greenInkAA,
    successSoft: VoltiColors.successSoft,
    successInk: _greenInkAA,
    infoSoft: VoltiColors.infoSoft,
    infoInk: VoltiColors.infoInk,
    warningSoft: VoltiColors.warningSoft,
    warningInk: VoltiColors.warningInk,
    warningInkStrong: VoltiColors.warningInkStrong,
    dangerSoft: VoltiColors.dangerSoft,
    dangerInk: VoltiColors.dangerInk,
    dangerInkStrong: VoltiColors.dangerInkStrong,
    sunSoft: Color(0xFFFFF3CC),
    sunInk: Color(0xFF8A5A00),
    glassBg: VoltiColors.glassBg,
    onGlass: VoltiColors.ink600,
    mapLand: VoltiColors.mapLand,
    skeletonBase: VoltiColors.ink100,
    skeletonHighlight: VoltiColors.ink50,
    pressOverlay: Color(0x0F15181A),
  );

  /// Escuro: ink-900 (tela), ink-800 (cartao), tons soft profundos com ink claro.
  static const dark = VoltiPalette(
    brightness: Brightness.dark,
    surfaceApp: VoltiColors.ink900,
    surfaceCard: VoltiColors.ink800,
    surfaceSunken: Color(0xFF2A2F33),
    surfaceRaised: Color(0xFF2A2F33),
    surfaceMedia: Color(0xFF1C3340),
    onSurfaceMedia: Color(0xFF9CCBF0),
    scrim: Color(0x99000000),
    inverse: VoltiColors.ink100,
    onInverse: VoltiColors.ink900,
    pill: VoltiColors.ink700,
    textPrimary: VoltiColors.ink50,
    textStrong: VoltiColors.ink200,
    textSecondary: VoltiColors.ink400,
    textTertiary: Color(0xFF80868D),
    textBrand: VoltiColors.green300,
    borderSubtle: VoltiColors.ink700,
    borderStrong: VoltiColors.ink600,
    brandSoft: Color(0xFF15361F),
    brandSoftStrong: Color(0xFF1B4428),
    onBrandSoft: VoltiColors.green300,
    successSoft: Color(0xFF15361F),
    successInk: VoltiColors.green300,
    infoSoft: Color(0xFF16283E),
    infoInk: Color(0xFF8FC0F5),
    warningSoft: Color(0xFF3A2616),
    warningInk: Color(0xFFF5A262),
    warningInkStrong: Color(0xFFF8B888),
    dangerSoft: Color(0xFF3E1F1C),
    dangerInk: VoltiColors.coral400,
    dangerInkStrong: Color(0xFFFAA59D),
    sunSoft: Color(0xFF383014),
    sunInk: VoltiColors.sun300,
    glassBg: Color(0xD11F2326),
    onGlass: VoltiColors.ink300,
    mapLand: Color(0xFF24282B),
    skeletonBase: Color(0xFF2A2F33),
    skeletonHighlight: VoltiColors.ink700,
    pressOverlay: Color(0x14FFFFFF),
  );

  /// Paleta do tema atual (cai no claro se o tema nao tiver a extensao).
  static VoltiPalette of(BuildContext context) {
    final theme = Theme.of(context);
    return theme.extension<VoltiPalette>() ?? (theme.brightness == Brightness.dark ? dark : light);
  }

  @override
  VoltiPalette copyWith() => this;

  @override
  VoltiPalette lerp(ThemeExtension<VoltiPalette>? other, double t) {
    if (other is! VoltiPalette) return this;
    Color c(Color a, Color b) => Color.lerp(a, b, t)!;
    return VoltiPalette(
      brightness: t < .5 ? brightness : other.brightness,
      surfaceApp: c(surfaceApp, other.surfaceApp),
      surfaceCard: c(surfaceCard, other.surfaceCard),
      surfaceSunken: c(surfaceSunken, other.surfaceSunken),
      surfaceRaised: c(surfaceRaised, other.surfaceRaised),
      surfaceMedia: c(surfaceMedia, other.surfaceMedia),
      onSurfaceMedia: c(onSurfaceMedia, other.onSurfaceMedia),
      scrim: c(scrim, other.scrim),
      inverse: c(inverse, other.inverse),
      onInverse: c(onInverse, other.onInverse),
      pill: c(pill, other.pill),
      textPrimary: c(textPrimary, other.textPrimary),
      textStrong: c(textStrong, other.textStrong),
      textSecondary: c(textSecondary, other.textSecondary),
      textTertiary: c(textTertiary, other.textTertiary),
      textBrand: c(textBrand, other.textBrand),
      borderSubtle: c(borderSubtle, other.borderSubtle),
      borderStrong: c(borderStrong, other.borderStrong),
      brandSoft: c(brandSoft, other.brandSoft),
      brandSoftStrong: c(brandSoftStrong, other.brandSoftStrong),
      onBrandSoft: c(onBrandSoft, other.onBrandSoft),
      successSoft: c(successSoft, other.successSoft),
      successInk: c(successInk, other.successInk),
      infoSoft: c(infoSoft, other.infoSoft),
      infoInk: c(infoInk, other.infoInk),
      warningSoft: c(warningSoft, other.warningSoft),
      warningInk: c(warningInk, other.warningInk),
      warningInkStrong: c(warningInkStrong, other.warningInkStrong),
      dangerSoft: c(dangerSoft, other.dangerSoft),
      dangerInk: c(dangerInk, other.dangerInk),
      dangerInkStrong: c(dangerInkStrong, other.dangerInkStrong),
      sunSoft: c(sunSoft, other.sunSoft),
      sunInk: c(sunInk, other.sunInk),
      glassBg: c(glassBg, other.glassBg),
      onGlass: c(onGlass, other.onGlass),
      mapLand: c(mapLand, other.mapLand),
      skeletonBase: c(skeletonBase, other.skeletonBase),
      skeletonHighlight: c(skeletonHighlight, other.skeletonHighlight),
      pressOverlay: c(pressOverlay, other.pressOverlay),
    );
  }
}

/// Atalho: `context.palette`.
extension VoltiPaletteContext on BuildContext {
  VoltiPalette get palette => VoltiPalette.of(this);
}
