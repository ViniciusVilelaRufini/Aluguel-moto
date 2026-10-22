import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/cognito.dart';
import '../../core/cognito_auth.dart';
import '../../core/launcher.dart';
import '../../core/map_tiles.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';
import '../ride/ride_screen.dart' show mapEnabledProvider;

/// Cartao "1ª corrida grátis" na boas-vindas. Segue o define `FIRST_RIDE_PROMO`
/// (ver `kFirstRidePromo`); em build de debug (emulador) liga por padrao para a
/// tela bater com a referencia do design. Release e profile seguem o define, que
/// continua desligado por padrao. `--dart-define=FIRST_RIDE_PROMO=false` desliga
/// tambem no debug.
const kWelcomeFirstRidePromo = bool.fromEnvironment('FIRST_RIDE_PROMO', defaultValue: kDebugMode);

final welcomeFirstRidePromoProvider = Provider<bool>((ref) => kWelcomeFirstRidePromo);

/// Centro do mapa decorativo: Jardins/Av. Paulista (o mesmo do `MapView.jsx`).
const kWelcomeMapCenter = LatLng(-23.5634, -46.6580);

/// Numeros da ilustracao (marketing, nao sao dados ao vivo; a camada inteira fica
/// fora da semantica).
const _artNearby = 108, _artBattery = 92, _artRangeKm = 20, _artEtaMin = 2, _artDistanceM = 120;

/// Boas-vindas (referencia `login-referencia.png`): mapa decorativo de Sao Paulo
/// em cima, com pins e chips ilustrativos, e a folha branca embaixo com os selos,
/// "Pegue uma moto e vá.", **Continuar com celular**, "ou entre com" (Apple,
/// Google, E-mail) e os termos. No modo dev, celular usa o codigo fixo, e-mail
/// abre o login de dev e Google/Apple so mostram um aviso.
class WelcomeScreen extends ConsumerStatefulWidget {
  const WelcomeScreen({super.key});
  @override
  ConsumerState<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends ConsumerState<WelcomeScreen> {
  IdentityProvider? _busy;
  late final TapGestureRecognizer _termsTap = TapGestureRecognizer()..onTap = () => _openLegal(ref.read(legalLinksProvider).terms);
  late final TapGestureRecognizer _privacyTap = TapGestureRecognizer()..onTap = () => _openLegal(ref.read(legalLinksProvider).privacy);

  @override
  void dispose() {
    _termsTap.dispose();
    _privacyTap.dispose();
    super.dispose();
  }

  Future<void> _openLegal(Uri? uri) async {
    final l = context.l;
    if (uri == null) {
      VoltiToast.show(context, l.welcomeLegalUnavailable, tone: VoltiToastTone.info);
      return;
    }
    var ok = false;
    try {
      ok = await ref.read(urlLauncherProvider)(uri);
    } catch (_) {}
    if (!ok && mounted) VoltiToast.show(context, l.welcomeLegalOpenError, tone: VoltiToastTone.warning);
  }

  Future<void> _social(IdentityProvider provider) async {
    final l = context.l;
    final auth = ref.read(authRepositoryProvider);
    if (auth.mode == AuthMode.dev) {
      VoltiToast.show(context, l.welcomeSocialDevOnly, tone: VoltiToastTone.info);
      return;
    }
    if (auth is! CognitoCustomerAuthRepository || !auth.config.hasHostedUi) {
      VoltiToast.show(context, l.loginCognitoPending, tone: VoltiToastTone.warning);
      return;
    }
    setState(() => _busy = provider);
    try {
      await ref.read(sessionProvider.notifier).signInWithProvider(provider);
    } on CognitoException catch (e) {
      if (e.type != 'Canceled' && mounted) VoltiToast.show(context, l.socialSignInError, tone: VoltiToastTone.danger);
    } catch (_) {
      if (mounted) VoltiToast.show(context, l.socialSignInError, tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final isDev = ref.watch(authRepositoryProvider).mode == AuthMode.dev;
    final mapOn = ref.watch(mapEnabledProvider);
    final promo = ref.watch(welcomeFirstRidePromoProvider);
    // Texto grande: o cartao da promocao desce para a folha (no mapa ele cobriria os pins).
    final bigText = MediaQuery.textScalerOf(context).scale(10) / 10 > 1.3;
    final busy = _busy != null;
    final padding = MediaQuery.paddingOf(context);

    final sheet = Container(
      key: const Key('welcome-sheet'),
      width: double.infinity,
      decoration: BoxDecoration(color: scheme.surface, borderRadius: VoltiRadii.sheetTop, boxShadow: VoltiShadows.shadowSheet),
      padding: EdgeInsets.fromLTRB(VoltiSpacing.s16, 22, VoltiSpacing.s16, VoltiSpacing.s16 + padding.bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (promo && bigText) ...[
            const Align(alignment: Alignment.centerLeft, child: _PromoCard(key: Key('welcome-promo'))),
            const SizedBox(height: VoltiSpacing.s14),
          ],
          Wrap(spacing: 8, runSpacing: 8, children: [
            SuccessBadge(label: l.badgeNoLicense, icon: LucideIcons.circleCheck),
            SuccessBadge(label: l.badgeNoPlate, icon: LucideIcons.ban),
            SuccessBadge(label: l.badgeAdult, icon: LucideIcons.shieldCheck),
          ]),
          const SizedBox(height: VoltiSpacing.s14),
          Semantics(
            header: true,
            child: Text.rich(
              key: const Key('welcome-title'),
              TextSpan(children: [
                TextSpan(text: '${l.welcomeTitleLead} '),
                // Verde 600 em texto de 34 px negrito: >= 3:1 (texto grande).
                TextSpan(text: l.welcomeTitleAccent, style: const TextStyle(color: VoltiColors.textLink)),
              ]),
              style: VoltiTypography.display.copyWith(fontSize: 30, color: scheme.onSurface),
            ),
          ),
          const SizedBox(height: VoltiSpacing.s8),
          Text(l.welcomeSubtitle, style: VoltiTypography.body.copyWith(color: scheme.onSurfaceVariant)),
          const SizedBox(height: VoltiSpacing.s20),
          VoltiButton(
            key: const Key('welcome-phone'),
            wrap: true,
            label: l.welcomePhone,
            icon: LucideIcons.smartphone,
            iconRight: LucideIcons.arrowRight,
            size: VoltiButtonSize.lg,
            fullWidth: true,
            onPressed: busy ? null : () => context.go('/login?via=phone'),
          ),
          const SizedBox(height: VoltiSpacing.s16),
          _OrDivider(label: l.welcomeOr),
          const SizedBox(height: VoltiSpacing.s16),
          _AdaptiveButtonRow(buttons: [
            VoltiButton(
              key: const Key('welcome-apple'),
              wrap: true,
              label: l.welcomeApple,
              semanticLabel: l.welcomeAppleLabel,
              variant: VoltiButtonVariant.dark,
              size: VoltiButtonSize.md,
              fullWidth: true,
              loading: _busy == IdentityProvider.apple,
              onPressed: busy ? null : () => _social(IdentityProvider.apple),
            ),
            VoltiButton(
              key: const Key('welcome-google'),
              wrap: true,
              label: l.welcomeGoogle,
              semanticLabel: l.welcomeGoogleLabel,
              variant: VoltiButtonVariant.neutral,
              size: VoltiButtonSize.md,
              fullWidth: true,
              loading: _busy == IdentityProvider.google,
              onPressed: busy ? null : () => _social(IdentityProvider.google),
            ),
            VoltiButton(
              key: const Key('welcome-email'),
              wrap: true,
              label: l.welcomeEmail,
              semanticLabel: l.continueWithEmail,
              icon: LucideIcons.mail,
              variant: VoltiButtonVariant.soft,
              size: VoltiButtonSize.md,
              fullWidth: true,
              onPressed: busy ? null : () => context.go('/login?via=email'),
            ),
          ]),
          const SizedBox(height: VoltiSpacing.s16),
          Text.rich(
            key: const Key('welcome-terms'),
            TextSpan(children: [
              TextSpan(text: l.welcomeTermsPrefix),
              TextSpan(text: l.welcomeTermsLink, style: _linkStyle, recognizer: _termsTap),
              TextSpan(text: l.welcomeTermsMiddle),
              TextSpan(text: l.welcomePrivacyLink, style: _linkStyle, recognizer: _privacyTap),
              TextSpan(text: l.welcomeTermsSuffix),
            ]),
            textAlign: TextAlign.center,
            style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant),
          ),
          // So em debug no modo dev: nota pequena sob os termos.
          if (isDev && kDebugMode) ...[
            const SizedBox(height: VoltiSpacing.s6),
            Text(
              l.welcomeDevHint,
              key: const Key('welcome-dev-hint'),
              textAlign: TextAlign.center,
              style: VoltiTypography.caption.copyWith(fontSize: 11, color: VoltiColors.textTertiary),
            ),
          ],
        ],
      ),
    );

    return Scaffold(
      backgroundColor: scheme.surface,
      body: LayoutBuilder(
        builder: (context, c) => Stack(
          children: [
            // Ilustracao: fora da semantica (numeros de marketing, nao dados ao vivo).
            Positioned.fill(child: _WelcomeMapArt(mapOn: mapOn)),
            Positioned(
              top: padding.top + 10,
              left: VoltiSpacing.screenGutter,
              right: VoltiSpacing.screenGutter,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Semantics(
                    header: true,
                    label: 'Volti',
                    excludeSemantics: true,
                    child: Text(
                      'volti',
                      key: const Key('welcome-logo'),
                      textScaler: TextScaler.noScaling,
                      style: TextStyle(
                        fontFamily: VoltiTypography.fontSans,
                        fontWeight: FontWeight.w800,
                        fontSize: 30,
                        height: 1,
                        letterSpacing: -1.2,
                        color: VoltiColors.white,
                        shadows: [Shadow(color: VoltiColors.ink900.withValues(alpha: .35), blurRadius: 8)],
                      ),
                    ),
                  ),
                  if (promo && !bigText) ...[
                    const SizedBox(height: 20),
                    const _PromoCard(key: Key('welcome-promo')),
                  ],
                ],
              ),
            ),
            Positioned.fill(
              child: SingleChildScrollView(
                key: const Key('welcome-scroll'),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: c.maxHeight),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Faixa do mapa que sempre aparece; com texto grande a folha rola por cima.
                      SizedBox(height: (c.maxHeight * .3).clamp(160.0, 320.0)),
                      if (mapOn)
                        const Align(
                          alignment: Alignment.centerRight,
                          child: Padding(padding: EdgeInsets.fromLTRB(0, 0, 12, 6), child: MapAttribution()),
                        ),
                      VoltiEnter(
                        key: const Key('welcome-sheet-enter'),
                        duration: VoltiMotion.durScreen,
                        curve: VoltiMotion.easeScreen,
                        fromOffset: const Offset(0, 60),
                        child: sheet,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Link no tom de acao (E-12): >= 4,5:1 sobre branco em texto pequeno.
  static const _linkStyle = TextStyle(color: VoltiColors.brandAction, fontWeight: VoltiTypography.fwSemibold);
}

/// Badge `tone="success"` do DS (components/core/Badge.jsx): 26 px, raio xs,
/// fundo success-soft e texto success-ink semibold 12, com icone opcional.
class SuccessBadge extends StatelessWidget {
  const SuccessBadge({super.key, required this.label, this.icon});
  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => Container(
        constraints: const BoxConstraints(minHeight: 26),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: const BoxDecoration(color: VoltiColors.successSoft, borderRadius: VoltiRadii.rXs),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 14, color: VoltiColors.successInk),
              const SizedBox(width: 5),
            ],
            Flexible(
              child: Text(
                label,
                style: const TextStyle(
                  fontFamily: VoltiTypography.fontSans,
                  fontWeight: VoltiTypography.fwSemibold,
                  fontSize: 12,
                  height: 1.4,
                  color: VoltiColors.successInk,
                ),
              ),
            ),
          ],
        ),
      );
}

/// "──── ou entre com ────".
class _OrDivider extends StatelessWidget {
  const _OrDivider({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          const Expanded(child: Divider(color: VoltiColors.borderSubtle, height: 1)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.s12),
            child: Text(label, style: VoltiTypography.caption.copyWith(color: VoltiColors.ink500)),
          ),
          const Expanded(child: Divider(color: VoltiColors.borderSubtle, height: 1)),
        ],
      );
}

/// Botoes lado a lado: partes iguais quando todos cabem; senao, cada um na
/// proporcao da largura que precisa; se nem assim couber (texto grande), empilha
/// todos em largura total.
class _AdaptiveButtonRow extends StatelessWidget {
  const _AdaptiveButtonRow({required this.buttons});
  final List<VoltiButton> buttons;
  static const _gap = 8.0;

  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, c) {
        final room = c.maxWidth - _gap * (buttons.length - 1);
        final need = [for (final b in buttons) b.minWidth(context)];
        final equal = need.every((n) => n <= room / buttons.length);
        if (equal || need.fold<double>(0, (a, b) => a + b) <= room) {
          return Row(
            key: const Key('welcome-social-row'),
            children: [
              for (var i = 0; i < buttons.length; i++) ...[
                if (i > 0) const SizedBox(width: _gap),
                Expanded(flex: equal ? 1 : need[i].ceil(), child: buttons[i]),
              ],
            ],
          );
        }
        return Column(
          key: const Key('welcome-social-column'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < buttons.length; i++) ...[
              if (i > 0) const SizedBox(height: _gap),
              buttons[i],
            ],
          ],
        );
      });
}

/// Cartao branco "🎁 1ª corrida grátis · até 15 min" (so com a promocao ligada).
class _PromoCard extends StatelessWidget {
  const _PromoCard({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return Semantics(
      container: true,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .7),
        padding: const EdgeInsets.fromLTRB(10, 10, 16, 10),
        decoration: const BoxDecoration(color: VoltiColors.white, borderRadius: VoltiRadii.rMd, boxShadow: VoltiShadows.shadow2),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(color: VoltiColors.coral50, borderRadius: VoltiRadii.rSm),
              child: const Icon(LucideIcons.gift, size: 18, color: VoltiColors.coral600),
            ),
            const SizedBox(width: 10),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(l.promoFirstRideTitle, style: VoltiTypography.bodyStrong.copyWith(color: VoltiColors.ink900)),
                  Text(l.welcomePromoText, style: VoltiTypography.caption.copyWith(color: VoltiColors.ink500)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Camada decorativa: mapa de Sao Paulo (o `VoltiMap` sem interacao, por cima de
/// um fundo desenhado que aparece sem rede), pins de moto e chips ilustrativos.
/// Inteira fora da semantica e sem escala de texto (nao e conteudo).
class _WelcomeMapArt extends StatelessWidget {
  const _WelcomeMapArt({required this.mapOn});
  final bool mapOn;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final top = MediaQuery.paddingOf(context).top;
    return ExcludeSemantics(
      key: const Key('welcome-art'),
      child: IgnorePointer(
        child: MediaQuery.withNoTextScaling(
          child: LayoutBuilder(builder: (context, c) {
            final w = c.maxWidth;
            return Stack(
              clipBehavior: Clip.hardEdge,
              children: [
                const Positioned.fill(child: CustomPaint(painter: _StaticMapPainter())),
                if (mapOn)
                  const Positioned.fill(
                    child: VoltiMap(
                      key: Key('welcome-map'),
                      center: kWelcomeMapCenter,
                      zoom: 15,
                      interactive: false,
                      showAttribution: false,
                      backgroundColor: Colors.transparent,
                    ),
                  ),
                // Leve escurecido no topo: o logo branco fica legivel sobre o mapa claro.
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  height: top + 140,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [VoltiColors.ink900.withValues(alpha: .38), VoltiColors.ink900.withValues(alpha: 0)],
                      ),
                    ),
                  ),
                ),
                Positioned(top: top + 12, right: 16, child: _NearbyChip(text: l.welcomeArtNearby(_artNearby))),
                Positioned(
                  top: top + 78,
                  right: 16,
                  child: _DarkChip(parts: [
                    (LucideIcons.zap, '$_artBattery%'),
                    (null, l.welcomeArtRange(_artRangeKm)),
                  ]),
                ),
                Positioned(left: w * .18 - 18, top: top + 160, child: const VoltiEnter.pop(delay: Duration(milliseconds: 120), child: _BikePin())),
                Positioned(left: w * .48 - 23, top: top + 182, child: const VoltiEnter.pop(delay: Duration(milliseconds: 200), child: _BikePin(highlight: true))),
                Positioned(left: w * .8 - 18, top: top + 280, child: const VoltiEnter.pop(delay: Duration(milliseconds: 280), child: _BikePin())),
                Positioned(
                  left: 16,
                  top: top + 262,
                  child: _DarkChip(parts: [
                    (LucideIcons.clock, l.welcomeArtEta(_artEtaMin)),
                    (LucideIcons.moveHorizontal, l.welcomeArtDistance(_artDistanceM)),
                  ]),
                ),
              ],
            );
          }),
        ),
      ),
    );
  }
}

/// Fundo do mapa sem rede (ou enquanto os tiles chegam): terreno, um parque e
/// ruas diagonais no tom do DS.
class _StaticMapPainter extends CustomPainter {
  const _StaticMapPainter();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = VoltiColors.mapLand);
    final park = Paint()..color = VoltiColors.mapPark.withValues(alpha: .7);
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(size.width * .38, size.height * .16, size.width * .2, size.height * .1), const Radius.circular(6)),
      park,
    );
    final minor = Paint()
      ..color = VoltiColors.mapRoad
      ..strokeWidth = 5;
    final major = Paint()
      ..color = VoltiColors.mapRoad
      ..strokeWidth = 11;
    for (var i = -6; i < 12; i++) {
      final x = i * 70.0;
      canvas.drawLine(Offset(x, 0), Offset(x + size.height * .45, size.height), minor);
    }
    for (var i = 0; i < 14; i++) {
      final y = i * 64.0;
      canvas.drawLine(Offset(0, y), Offset(size.width, y - size.width * .35), minor);
    }
    canvas.drawLine(Offset(size.width * .1, size.height), Offset(size.width * .75, 0), major);
    canvas.drawLine(Offset(0, size.height * .3), Offset(size.width, size.height * .12), major);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

const _chipText = TextStyle(fontFamily: VoltiTypography.fontSans, fontWeight: VoltiTypography.fwBold, fontSize: 13, height: 1.2);

/// "• 108 motos perto": pilula branca com ponto verde.
class _NearbyChip extends StatelessWidget {
  const _NearbyChip({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: const BoxDecoration(color: VoltiColors.white, borderRadius: VoltiRadii.rPill, boxShadow: VoltiShadows.shadow1),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 8, height: 8, decoration: const BoxDecoration(color: VoltiColors.brand, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(text, style: _chipText.copyWith(fontWeight: VoltiTypography.fwSemibold, color: VoltiColors.ink900)),
        ]),
      );
}

/// Pilula escura com partes separadas por um traco: "⚡ 92% | ~20 km".
class _DarkChip extends StatelessWidget {
  const _DarkChip({required this.parts});
  final List<(IconData?, String)> parts;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(6, 6, 14, 6),
        decoration: const BoxDecoration(color: VoltiColors.ink900, borderRadius: VoltiRadii.rPill, boxShadow: VoltiShadows.shadow2),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          for (var i = 0; i < parts.length; i++) ...[
            if (i > 0)
              Container(width: 1, height: 18, margin: const EdgeInsets.symmetric(horizontal: 10), color: VoltiColors.ink600),
            if (parts[i].$1 != null) ...[
              Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  color: VoltiColors.green900,
                  shape: BoxShape.circle,
                  border: Border.all(color: VoltiColors.green700),
                ),
                child: Icon(parts[i].$1, size: 14, color: VoltiColors.green400),
              ),
              const SizedBox(width: 8),
            ] else if (i == 0)
              const SizedBox(width: 8),
            Text(parts[i].$2, style: _chipText.copyWith(color: VoltiColors.white)),
          ],
        ]),
      );
}

/// Pin de moto da ilustracao: disco escuro (ou verde, em destaque) com a moto e a
/// barrinha verde de bateria embaixo.
class _BikePin extends StatelessWidget {
  const _BikePin({this.highlight = false});
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final size = highlight ? 46.0 : 36.0;
    return Column(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: highlight ? VoltiColors.brand : VoltiColors.ink900,
          shape: BoxShape.circle,
          border: Border.all(color: VoltiColors.white, width: highlight ? 3 : 2.5),
          boxShadow: highlight ? VoltiShadows.shadowBrand : VoltiShadows.shadow2,
        ),
        child: Icon(LucideIcons.bike, color: VoltiColors.white, size: size * .5),
      ),
      const SizedBox(height: 4),
      Container(
        width: highlight ? 22 : 18,
        height: 5,
        decoration: BoxDecoration(
          color: VoltiColors.brand,
          borderRadius: VoltiRadii.rPill,
          border: Border.all(color: VoltiColors.white, width: 1),
        ),
      ),
    ]);
  }
}
