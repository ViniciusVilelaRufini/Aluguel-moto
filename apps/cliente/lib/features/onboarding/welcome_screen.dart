import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/cognito.dart';
import '../../core/cognito_auth.dart';
import '../../core/launcher.dart';
import '../../core/map_tiles.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';
import '../ride/ride_screen.dart' show mapEnabledProvider;
import 'welcome_hero.dart';

/// Cartao "1ª corrida grátis" na boas-vindas. Segue o define `FIRST_RIDE_PROMO`
/// (ver `kFirstRidePromo`); em build de debug (emulador) liga por padrao para a
/// tela bater com a referencia do design. Release e profile seguem o define, que
/// continua desligado por padrao. `--dart-define=FIRST_RIDE_PROMO=false` desliga
/// tambem no debug.
const kWelcomeFirstRidePromo = bool.fromEnvironment('FIRST_RIDE_PROMO', defaultValue: kDebugMode);

final welcomeFirstRidePromoProvider = Provider<bool>((ref) => kWelcomeFirstRidePromo);

/// Boas-vindas (referencia `login-referencia.png`): hero animado em cima
/// ([WelcomeHero]: mapa real de Pinheiros, motos andando, chips e a moto em
/// destaque) e a folha branca embaixo com os selos,
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

  /// Altura medida da folha: a faixa livre do hero e o que sobra acima dela.
  double? _sheetHeight;

  /// Os tiles falharam e o hero mostra a ilustracao: sem atribuicao de mapa.
  bool _mapFailed = false;
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
    // Texto maior que o padrao: o cartao da promocao desce para a folha e escala
    // com o texto (no hero os chips nao escalam: sao parte da ilustracao).
    final bigText = MediaQuery.textScalerOf(context).scale(10) / 10 > 1.0;
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
            const Align(
              alignment: Alignment.centerLeft,
              child: _PromoCard(key: Key('welcome-promo')),
            ),
            const SizedBox(height: VoltiSpacing.s14),
          ],
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              SuccessBadge(label: l.badgeNoLicense, icon: LucideIcons.circleCheck),
              SuccessBadge(label: l.badgeNoPlate, icon: LucideIcons.ban),
              SuccessBadge(label: l.badgeAdult, icon: LucideIcons.shieldCheck),
            ],
          ),
          const SizedBox(height: VoltiSpacing.s14),
          Semantics(
            header: true,
            child: Text.rich(
              key: const Key('welcome-title'),
              TextSpan(
                children: [
                  TextSpan(text: '${l.welcomeTitleLead} '),
                  // Verde 600 em texto de 34 px negrito: >= 3:1 (texto grande).
                  TextSpan(
                    text: l.welcomeTitleAccent,
                    style: const TextStyle(color: VoltiColors.textLink),
                  ),
                ],
              ),
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
          _AdaptiveButtonRow(
            buttons: [
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
            ],
          ),
          const SizedBox(height: VoltiSpacing.s8),
          // Folga vertical: alvo de toque maior para os dois links.
          Padding(
            padding: const EdgeInsets.symmetric(vertical: VoltiSpacing.s8),
            child: Text.rich(
              key: const Key('welcome-terms'),
              TextSpan(
                children: [
                  TextSpan(text: l.welcomeTermsPrefix),
                  TextSpan(text: l.welcomeTermsLink, style: _linkStyle, recognizer: _termsTap),
                  TextSpan(text: l.welcomeTermsMiddle),
                  TextSpan(text: l.welcomePrivacyLink, style: _linkStyle, recognizer: _privacyTap),
                  TextSpan(text: l.welcomeTermsSuffix),
                ],
              ),
              textAlign: TextAlign.center,
              style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant, height: 1.6),
            ),
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
        builder: (context, c) {
          final minBand = (c.maxHeight * .3).clamp(160.0, 320.0);
          final band = math.max(minBand, c.maxHeight - (_sheetHeight ?? c.maxHeight * .55));
          return Stack(
            children: [
              // Hero: decorativo, fora da semantica e sem toque.
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: WelcomeHero(
                  band: band,
                  topInset: padding.top,
                  mapOn: mapOn,
                  showPromo: promo && !bigText,
                  nearbyText: l.welcomeArtNearby(kHeroNearby),
                  rangeText: l.welcomeArtRange(kHeroRangeKm),
                  etaText: l.welcomeArtEta(kHeroEtaMin),
                  distanceText: l.welcomeArtDistance(kHeroDistanceM),
                  promoTitle: l.promoFirstRideTitle,
                  promoText: l.welcomePromoText,
                  onMapFallback: () => setState(() => _mapFailed = true),
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
                        SizedBox(height: minBand),
                        _SizeReporter(
                          onSize: (size) {
                            if (!mounted) return;
                            if (_sheetHeight == null || (_sheetHeight! - size.height).abs() > .5) setState(() => _sheetHeight = size.height);
                          },
                          child: VoltiEnter(
                            key: const Key('welcome-sheet-enter'),
                            duration: VoltiMotion.durScreen,
                            curve: VoltiMotion.easeScreen,
                            fromOffset: const Offset(0, 60),
                            // Atribuicao do mapa na borda de cima da folha: fora do caminho dos pins.
                            child: Stack(
                              clipBehavior: Clip.none,
                              children: [
                                sheet,
                                if (mapOn && !_mapFailed) const Positioned(top: -14, right: 12, child: MapAttribution()),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
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
        if (icon != null) ...[Icon(icon, size: 14, color: VoltiColors.successInk), const SizedBox(width: 5)],
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
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, c) {
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
          for (var i = 0; i < buttons.length; i++) ...[if (i > 0) const SizedBox(height: _gap), buttons[i]],
        ],
      );
    },
  );
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

/// Avisa o tamanho do filho depois do layout (altura da folha para o hero).
class _SizeReporter extends SingleChildRenderObjectWidget {
  const _SizeReporter({required this.onSize, super.child});
  final ValueChanged<Size> onSize;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderSizeReporter(onSize);

  @override
  void updateRenderObject(BuildContext context, _RenderSizeReporter renderObject) => renderObject.onSize = onSize;
}

class _RenderSizeReporter extends RenderProxyBox {
  _RenderSizeReporter(this.onSize);
  ValueChanged<Size> onSize;
  Size? _last;

  @override
  void performLayout() {
    super.performLayout();
    if (size == _last) return;
    _last = size;
    final s = size;
    WidgetsBinding.instance.addPostFrameCallback((_) => onSize(s));
  }
}
