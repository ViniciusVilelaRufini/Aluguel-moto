import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/widgets.dart';

/// Galpao Volti — Pinheiros (seed `DEPOT_PINHEIROS`): centro do mapa do hero.
const kHeroDepot = LatLng(-23.5654, -46.6847);
const kHeroZoom = 15.0;

/// Trechos reais de ruas de Pinheiros por onde as motos do hero andam.
const kHeroRoutes = <List<LatLng>>[
  // Rua dos Pinheiros (passa pelo galpao), sentido Largo da Batata.
  [LatLng(-23.5629, -46.6768), LatLng(-23.5642, -46.6806), LatLng(-23.5654, -46.6847), LatLng(-23.5664, -46.6885)],
  // Rua Teodoro Sampaio, sentido Largo da Batata.
  [LatLng(-23.5590, -46.6782), LatLng(-23.5610, -46.6830), LatLng(-23.5630, -46.6872), LatLng(-23.5648, -46.6905)],
  // Av. Brig. Faria Lima, saindo do Largo da Batata.
  [LatLng(-23.5668, -46.6935), LatLng(-23.5705, -46.6905), LatLng(-23.5740, -46.6880)],
  // Rua Fradique Coutinho, cruzando a Rua dos Pinheiros.
  [LatLng(-23.5600, -46.6890), LatLng(-23.5640, -46.6858), LatLng(-23.5680, -46.6826)],
];

/// Velocidade (voltas por ciclo) e defasagem de cada moto.
const _bikeSpeed = [1.0, 0.8, 1.25, 0.65];
const _bikeOffset = [0.0, 0.35, 0.6, 0.15];

/// Numeros da ilustracao (marketing, nao sao dados ao vivo; a camada inteira fica
/// fora da semantica).
const kHeroNearby = 108, kHeroBattery = 92, kHeroRangeKm = 20, kHeroEtaMin = 2, kHeroDistanceM = 120;

/// Tiles com erro antes de trocar o mapa pela ilustracao desenhada.
const kHeroTileErrorLimit = 4;

/// Hero animado da boas-vindas: mapa real de Pinheiros (deriva lenta da camera),
/// galpao com anel pulsando, motos andando por ruas reais, chips com entrada em
/// cascata (bateria conta ate 92%) e a moto em destaque que sobe, cresce e flutua.
///
/// Decorativo por inteiro: fora da semantica e sem toque. Reduced motion: tudo
/// parado no estado final. App em segundo plano ou rota coberta: os controllers
/// param. Sem rede (ou tiles falhando): a ilustracao desenhada fica no lugar do mapa.
///
/// O layout e relativo a faixa livre acima da folha ([band]); [overlap] e o trecho
/// que continua por baixo dos cantos arredondados da folha.
class WelcomeHero extends StatefulWidget {
  const WelcomeHero({
    super.key,
    required this.band,
    required this.topInset,
    required this.mapOn,
    required this.showPromo,
    required this.nearbyText,
    required this.rangeText,
    required this.etaText,
    required this.distanceText,
    required this.promoTitle,
    required this.promoText,
    this.overlap = 28,
  });

  final double band, topInset, overlap;
  final bool mapOn, showPromo;
  final String nearbyText, rangeText, etaText, distanceText, promoTitle, promoText;

  @override
  State<WelcomeHero> createState() => WelcomeHeroState();
}

class WelcomeHeroState extends State<WelcomeHero> with TickerProviderStateMixin, WidgetsBindingObserver {
  /// Entrada: chips em cascata, contagem da bateria e a moto (uma vez).
  late final AnimationController _entrance = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100));

  /// Flutuacao da moto (3 s).
  late final AnimationController _float = AnimationController(vsync: this, duration: const Duration(seconds: 3));

  /// Deriva da camera: 10 s para cada lado (volta completa de 20 s).
  late final AnimationController _drift = AnimationController(vsync: this, duration: const Duration(seconds: 10));

  /// Motos nas ruas.
  late final AnimationController _bikes = AnimationController(vsync: this, duration: const Duration(seconds: 16));

  /// Anel do galpao.
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800));

  List<AnimationController> get _loops => [_float, _drift, _bikes, _pulse];

  /// Cascata dos chips (80 ms entre eles), contagem da bateria e entrada da moto
  /// (~600 ms, curva da tela do DS): todas sobre o mesmo ticker da entrada.
  late final List<Animation<double>> _chipsIn = [
    for (var i = 0; i < 5; i++)
      CurvedAnimation(
        parent: _entrance,
        curve: Interval(i * 80 / 1100, (i * 80 + 360) / 1100, curve: VoltiMotion.easeOut),
      ),
  ];
  late final Animation<double> _count = CurvedAnimation(
    parent: _entrance,
    curve: const Interval(.27, 1, curve: Curves.easeOutCubic),
  );
  late final Animation<double> _bikeIn = CurvedAnimation(
    parent: _entrance,
    curve: const Interval(.18, .73, curve: VoltiMotion.easeScreen),
  );

  AppLifecycleState? _lifecycle = WidgetsBinding.instance.lifecycleState;
  bool _tickerEnabled = true;
  bool _reduced = false;
  int _tileErrors = 0;
  bool _tilesFailed = false;

  /// Algum controller rodando (testes de pausa).
  @visibleForTesting
  bool get debugAnimating => [_entrance, ..._loops].any((c) => c.isAnimating);

  /// O mapa real deu lugar a ilustracao desenhada.
  @visibleForTesting
  bool get debugTilesFailed => _tilesFailed;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduced = VoltiMotion.reduced(context);
    // Rota coberta por outra (Navigator) desliga o TickerMode.
    _tickerEnabled = TickerMode.valuesOf(context).enabled;
    _sync();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lifecycle = state;
    _sync();
  }

  bool get _active => !_reduced && _tickerEnabled && (_lifecycle == null || _lifecycle == AppLifecycleState.resumed);

  void _sync() {
    if (_reduced) {
      for (final c in [_entrance, ..._loops]) {
        c.stop();
      }
      _entrance.value = 1;
      _float.value = 0;
      _drift.value = 0;
      _bikes.value = .37;
      _pulse.value = 0;
      return;
    }
    if (!_active) {
      for (final c in [_entrance, ..._loops]) {
        c.stop(canceled: false);
      }
      return;
    }
    if (!_entrance.isCompleted && !_entrance.isAnimating) _entrance.forward();
    if (!_float.isAnimating) _float.repeat();
    if (!_drift.isAnimating) _drift.repeat(reverse: true);
    if (!_bikes.isAnimating) _bikes.repeat();
    if (!_pulse.isAnimating) _pulse.repeat();
  }

  /// Um tile falhou; depois de [kHeroTileErrorLimit] o mapa sai e fica a ilustracao.
  void reportTileError() {
    _tileErrors++;
    if (_tilesFailed || _tileErrors < kHeroTileErrorLimit) return;
    Future.microtask(() {
      if (mounted) setState(() => _tilesFailed = true);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _entrance.dispose();
    for (final c in _loops) {
      c.dispose();
    }
    super.dispose();
  }

  Widget _chip(int i, Widget child) {
    final a = _chipsIn[i];
    return AnimatedBuilder(
      animation: a,
      child: child,
      builder: (context, child) => a.value >= 1
          ? child!
          : Opacity(
              opacity: a.value,
              child: Transform.translate(offset: Offset(0, 10 * (1 - a.value)), child: child),
            ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mapVisible = widget.mapOn && !_tilesFailed;
    final height = widget.band + widget.overlap;
    final count = _count;
    final bikeIn = _bikeIn;

    return ExcludeSemantics(
      key: const Key('welcome-art'),
      child: IgnorePointer(
        child: MediaQuery.withNoTextScaling(
          child: LayoutBuilder(
            builder: (context, c) {
              final size = Size(c.maxWidth, height);
              // O galpao fica a 36% da faixa livre (acima da moto em destaque).
              final cam0 = MapCamera(crs: const Epsg3857(), center: kHeroDepot, zoom: kHeroZoom, rotation: 0, nonRotatedSize: size);
              final center = cam0.screenOffsetToLatLng(Offset(size.width / 2, size.height / 2 + (size.height / 2 - widget.band * .36)));
              final cam = MapCamera(crs: const Epsg3857(), center: center, zoom: kHeroZoom, rotation: 0, nonRotatedSize: size);
              final routes = [
                for (final r in kHeroRoutes) [for (final p in r) cam.latLngToScreenOffset(p)],
              ];
              final depot = cam.latLngToScreenOffset(kHeroDepot);

              final world = Stack(
                clipBehavior: Clip.hardEdge,
                children: [
                  const Positioned.fill(
                    child: CustomPaint(key: Key('welcome-map-fallback'), painter: HeroFallbackPainter()),
                  ),
                  if (mapVisible)
                    Positioned.fill(
                      child: VoltiMap(
                        key: const Key('welcome-map'),
                        center: center,
                        zoom: kHeroZoom,
                        interactive: false,
                        showAttribution: false,
                        backgroundColor: Colors.transparent,
                        onTileError: reportTileError,
                      ),
                    ),
                  Positioned(
                    left: depot.dx - 40,
                    top: depot.dy - 40,
                    width: 80,
                    height: 80,
                    child: _DepotPulse(pulse: _pulse),
                  ),
                ],
              );

              return SizedBox(
                height: height,
                child: Stack(
                  clipBehavior: Clip.hardEdge,
                  children: [
                    // Mapa e galpao: um RepaintBoundary estatico movido por Transform (a deriva
                    // nao reconstroi os tiles).
                    Positioned.fill(
                      child: RepaintBoundary(
                        child: AnimatedBuilder(
                          animation: _drift,
                          child: RepaintBoundary(child: world),
                          builder: (context, child) {
                            final t = Curves.easeInOut.transform(_drift.value);
                            final scale = 1.03 + .05 * t;
                            return Transform(
                              alignment: Alignment.center,
                              transform: Matrix4.identity()
                                ..translateByDouble(-6 + 12 * t, 4 - 8 * t, 0, 1)
                                ..scaleByDouble(scale, scale, 1, 1),
                              child: child,
                            );
                          },
                        ),
                      ),
                    ),
                    // Motos nas ruas, recortadas na faixa livre (nunca por baixo da folha).
                    Positioned(
                      key: const Key('hero-pins'),
                      top: 0,
                      left: 0,
                      right: 0,
                      // 16 px de folga: a atribuicao fica na borda da folha, fora do caminho dos pins.
                      height: widget.band - 16,
                      child: ClipRect(
                        child: RepaintBoundary(
                          child: AnimatedBuilder(
                            animation: _bikes,
                            builder: (context, _) => Stack(children: [for (var i = 0; i < routes.length; i++) _movingPin(i, routes[i])]),
                          ),
                        ),
                      ),
                    ),
                    // Escurecido no topo: o logo branco fica legivel.
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      height: widget.topInset + 120,
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
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      height: widget.band,
                      child: CustomMultiChildLayout(
                        delegate: HeroLayoutDelegate(topInset: widget.topInset),
                        children: [
                          LayoutId(
                            id: HeroSlot.bike,
                            child: AnimatedBuilder(
                              animation: Listenable.merge([bikeIn, _float]),
                              builder: (context, _) {
                                final e = bikeIn.value;
                                final f = math.sin(_float.value * 2 * math.pi);
                                return _HeroBike(entrance: e, float: f);
                              },
                            ),
                          ),
                          LayoutId(id: HeroSlot.logo, child: _chip(0, const _Logo())),
                          LayoutId(
                            id: HeroSlot.nearby,
                            child: _chip(1, _NearbyChip(text: widget.nearbyText)),
                          ),
                          if (widget.showPromo)
                            LayoutId(
                              id: HeroSlot.promo,
                              child: _chip(2, _PromoCard(title: widget.promoTitle, text: widget.promoText)),
                            ),
                          LayoutId(
                            id: HeroSlot.battery,
                            child: _chip(
                              3,
                              AnimatedBuilder(
                                animation: count,
                                builder: (context, _) => _DarkChip(
                                  key: const Key('hero-battery'),
                                  parts: [(LucideIcons.zap, '${(kHeroBattery * count.value).round()}%'), (null, widget.rangeText)],
                                ),
                              ),
                            ),
                          ),
                          LayoutId(
                            id: HeroSlot.time,
                            child: _chip(
                              4,
                              _DarkChip(
                                key: const Key('hero-time'),
                                parts: [(LucideIcons.clock, widget.etaText), (LucideIcons.moveHorizontal, widget.distanceText)],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  /// Moto [i] na posicao do ciclo atual ao longo da rota projetada, com fade nas pontas.
  Widget _movingPin(int i, List<Offset> route) {
    final t = (_bikes.value * _bikeSpeed[i] + _bikeOffset[i]) % 1.0;
    final p = pointAlong(route, t);
    final fade = t < .12 ? t / .12 : (t > .88 ? (1 - t) / .12 : 1.0);
    return Positioned(
      key: Key('hero-pin-$i'),
      left: p.dx - 15,
      top: p.dy - 15,
      child: Opacity(opacity: fade.clamp(0.0, 1.0), child: const _BikePin()),
    );
  }
}

/// Ponto a uma fracao [t] (0..1) do comprimento de [pts].
Offset pointAlong(List<Offset> pts, double t) {
  if (pts.length == 1) return pts.first;
  var total = 0.0;
  for (var i = 1; i < pts.length; i++) {
    total += (pts[i] - pts[i - 1]).distance;
  }
  var left = total * t.clamp(0.0, 1.0);
  for (var i = 1; i < pts.length; i++) {
    final seg = (pts[i] - pts[i - 1]).distance;
    if (left <= seg || i == pts.length - 1) {
      final k = seg == 0 ? 0.0 : (left / seg).clamp(0.0, 1.0);
      return Offset.lerp(pts[i - 1], pts[i], k)!;
    }
    left -= seg;
  }
  return pts.last;
}

enum HeroSlot { logo, nearby, promo, battery, time, bike }

/// Posiciona logo, chips e a moto **relativos a faixa livre** (o tamanho do
/// layout = faixa acima da folha). Linha 1: logo e "motos perto". Linha 2: a
/// promocao, com a bateria ao lado se couber. A moto em destaque fica centrada
/// embaixo, com ate 70% da largura.
///
/// Com espaco, bateria e "2 min | 120 m" vao em linhas proprias acima da moto
/// (nada se cruza). Em telas baixas (360x740), empilhar encolheria demais a moto:
/// os dois viram etiquetas sobre as bordas da moto (bateria a direita, tempo a
/// esquerda), pintadas por cima dela (a moto e o primeiro filho), sempre legiveis
/// e sem cruzar logo, promocao nem um ao outro.
class HeroLayoutDelegate extends MultiChildLayoutDelegate {
  HeroLayoutDelegate({required this.topInset});
  final double topInset;

  static const side = 16.0, gap = 10.0, bottomGap = 6.0;

  @override
  void performLayout(Size size) {
    final w = size.width;
    final loose = BoxConstraints.loose(Size(w - 2 * side, size.height));
    final logo = layoutChild(HeroSlot.logo, loose);
    final nearby = layoutChild(HeroSlot.nearby, loose);
    final y1 = topInset + 10;
    positionChild(HeroSlot.logo, Offset(side + 4, y1));
    final row1 = math.max(logo.height, nearby.height);
    positionChild(HeroSlot.nearby, Offset(w - side - nearby.width, y1 + (row1 - nearby.height) / 2));
    var top = y1 + row1; // fundo do que ja foi posicionado

    final battery = layoutChild(HeroSlot.battery, loose);
    final time = layoutChild(HeroSlot.time, loose);
    var batteryPlaced = false;
    if (hasChild(HeroSlot.promo)) {
      final y = top + 14;
      final promo = layoutChild(HeroSlot.promo, BoxConstraints.loose(Size(w * .7, size.height)));
      positionChild(HeroSlot.promo, Offset(side, y));
      if (side + promo.width + 12 + battery.width + side <= w) {
        positionChild(HeroSlot.battery, Offset(w - side - battery.width, y + (promo.height - battery.height) / 2));
        batteryPlaced = true;
      }
      top = y + math.max(promo.height, batteryPlaced ? battery.height : 0);
    }

    double bikeWidthFor(double fromTop) => math.max(0.0, math.min(w * .7, (size.height - fromTop - 12 - bottomGap) / _HeroBike.heightPerWidth));

    // Empilhado: bateria (se faltou) e tempo em linhas acima da moto.
    var stackedTop = top + gap;
    final sideBySide = side + time.width + 12 + battery.width + side <= w;
    final stackedRows = <(HeroSlot, Offset)>[];
    if (!batteryPlaced && sideBySide) {
      final h = math.max(battery.height, time.height);
      stackedRows
        ..add((HeroSlot.battery, Offset(w - side - battery.width, stackedTop + (h - battery.height) / 2)))
        ..add((HeroSlot.time, Offset(side, stackedTop + (h - time.height) / 2)));
      stackedTop += h;
    } else {
      if (!batteryPlaced) {
        stackedRows.add((HeroSlot.battery, Offset(w - side - battery.width, stackedTop)));
        stackedTop += battery.height + gap;
      }
      stackedRows.add((HeroSlot.time, Offset(side, stackedTop)));
      stackedTop += time.height;
    }
    final stackedBike = bikeWidthFor(stackedTop);

    double bikeW;
    if (stackedBike >= w * .7 - .5) {
      for (final (id, o) in stackedRows) {
        positionChild(id, o);
      }
      bikeW = stackedBike;
    } else {
      // Etiquetas sobre as bordas da moto.
      bikeW = bikeWidthFor(top);
      final bikeH = bikeW * _HeroBike.heightPerWidth;
      final bikeTop = size.height - bottomGap - bikeH;
      final calloutTop = math.max(top + gap, bikeTop + bikeH * .08);
      if (!batteryPlaced) positionChild(HeroSlot.battery, Offset(w - side - battery.width, calloutTop));
      final timeTop = batteryPlaced ? calloutTop : calloutTop + battery.height + gap;
      positionChild(HeroSlot.time, Offset(side, math.min(timeTop, size.height - bottomGap - time.height)));
    }
    final bike = layoutChild(HeroSlot.bike, BoxConstraints.tight(Size(bikeW, bikeW * _HeroBike.heightPerWidth)));
    positionChild(HeroSlot.bike, Offset((w - bike.width) / 2, size.height - bottomGap - bike.height));
  }

  @override
  bool shouldRelayout(HeroLayoutDelegate oldDelegate) => oldDelegate.topInset != topInset;
}

/// Moto em destaque (asset recortado, 737x713) com a sombra eliptica sob as rodas.
class _HeroBike extends StatelessWidget {
  const _HeroBike({required this.entrance, required this.float});

  /// 0..1 da entrada (sobe e cresce de .92 a 1).
  final double entrance;

  /// -1..1 da flutuacao.
  final double float;

  static const aspect = 713 / 737;

  /// Altura total por largura (imagem + faixa da sombra).
  static const heightPerWidth = aspect + .06;

  @override
  Widget build(BuildContext context) {
    final dy = -2.5 * float + 40 * (1 - entrance);
    final scale = .92 + .08 * entrance;
    return LayoutBuilder(
      builder: (context, c) {
        final w = c.maxWidth;
        if (w < 40) return const SizedBox.shrink();
        return Opacity(
          opacity: entrance.clamp(0.0, 1.0),
          child: Stack(
            key: const Key('hero-bike'),
            clipBehavior: Clip.none,
            children: [
              // Sombra: respira com a flutuacao (menor quando a moto sobe).
              Positioned(
                left: w * .12,
                right: w * .12,
                bottom: 0,
                height: w * .07,
                child: Transform.scale(
                  scaleX: 1 - .04 * float,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: RadialGradient(
                        colors: [
                          VoltiColors.ink900.withValues(alpha: .28 - .05 * float),
                          VoltiColors.ink900.withValues(alpha: 0),
                        ],
                      ),
                      borderRadius: const BorderRadius.all(Radius.elliptical(200, 30)),
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                top: 0,
                height: w * aspect,
                child: Transform.translate(
                  key: const Key('hero-bike-image'),
                  offset: Offset(0, dy),
                  child: Transform.scale(
                    scale: scale,
                    alignment: Alignment.bottomCenter,
                    child: Image.asset(
                      'assets/images/volti_moto_hero.webp',
                      fit: BoxFit.contain,
                      filterQuality: FilterQuality.medium,
                      errorBuilder: (_, _, _) => const SizedBox.shrink(),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Fundo do mapa sem rede (ou com tiles falhando): terreno, um parque e ruas
/// diagonais no tom do DS. Nunca uma tela cinza.
class HeroFallbackPainter extends CustomPainter {
  const HeroFallbackPainter();

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

/// Galpao com anel pulsando.
class _DepotPulse extends StatelessWidget {
  const _DepotPulse({required this.pulse});
  final Animation<double> pulse;

  @override
  Widget build(BuildContext context) => Stack(
    alignment: Alignment.center,
    children: [
      AnimatedBuilder(
        animation: pulse,
        builder: (context, _) {
          final t = pulse.value;
          return Container(
            width: 34 + 40 * t,
            height: 34 + 40 * t,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: VoltiColors.brand.withValues(alpha: .35 * (1 - t)),
            ),
          );
        },
      ),
      Container(
        key: const Key('hero-depot'),
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: VoltiColors.brandAction,
          shape: BoxShape.circle,
          border: Border.all(color: VoltiColors.white, width: 3),
          boxShadow: VoltiShadows.shadow2,
        ),
        child: const Icon(LucideIcons.warehouse, color: VoltiColors.white, size: 16),
      ),
    ],
  );
}

class _Logo extends StatelessWidget {
  const _Logo();

  @override
  Widget build(BuildContext context) => Text(
    'volti',
    key: const Key('welcome-logo'),
    style: TextStyle(
      fontFamily: VoltiTypography.fontSans,
      fontWeight: FontWeight.w800,
      fontSize: 30,
      height: 1,
      letterSpacing: -1.2,
      color: VoltiColors.white,
      shadows: [Shadow(color: VoltiColors.ink900.withValues(alpha: .35), blurRadius: 8)],
    ),
  );
}

const _chipText = TextStyle(fontFamily: VoltiTypography.fontSans, fontWeight: VoltiTypography.fwBold, fontSize: 13, height: 1.2);

/// "• 108 motos perto": pilula branca com ponto verde.
class _NearbyChip extends StatelessWidget {
  const _NearbyChip({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    key: const Key('hero-nearby'),
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
    decoration: const BoxDecoration(color: VoltiColors.white, borderRadius: VoltiRadii.rPill, boxShadow: VoltiShadows.shadow1),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: const BoxDecoration(color: VoltiColors.brand, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          text,
          style: _chipText.copyWith(fontWeight: VoltiTypography.fwSemibold, color: VoltiColors.ink900),
        ),
      ],
    ),
  );
}

/// Cartao branco "🎁 1ª corrida grátis · até 15 min" (so com a promocao ligada).
class _PromoCard extends StatelessWidget {
  const _PromoCard({required this.title, required this.text});
  final String title, text;

  @override
  Widget build(BuildContext context) => Container(
    key: const Key('welcome-promo'),
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
              Text(title, style: VoltiTypography.bodyStrong.copyWith(color: VoltiColors.ink900)),
              Text(text, style: VoltiTypography.caption.copyWith(color: VoltiColors.ink500)),
            ],
          ),
        ),
      ],
    ),
  );
}

/// Pilula escura com partes separadas por um traco: "⚡ 92% | ~20 km".
class _DarkChip extends StatelessWidget {
  const _DarkChip({super.key, required this.parts});
  final List<(IconData?, String)> parts;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(6, 6, 14, 6),
    decoration: const BoxDecoration(color: VoltiColors.ink900, borderRadius: VoltiRadii.rPill, boxShadow: VoltiShadows.shadow2),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < parts.length; i++) ...[
          if (i > 0) Container(width: 1, height: 18, margin: const EdgeInsets.symmetric(horizontal: 10), color: VoltiColors.ink600),
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
      ],
    ),
  );
}

/// Pin de moto: disco escuro com a moto e a barrinha verde de bateria.
class _BikePin extends StatelessWidget {
  const _BikePin();

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          color: VoltiColors.ink900,
          shape: BoxShape.circle,
          border: Border.all(color: VoltiColors.white, width: 2),
          boxShadow: VoltiShadows.shadow2,
        ),
        child: const Icon(LucideIcons.bike, color: VoltiColors.white, size: 15),
      ),
      const SizedBox(height: 3),
      Container(
        width: 16,
        height: 4,
        decoration: BoxDecoration(
          color: VoltiColors.brand,
          borderRadius: VoltiRadii.rPill,
          border: Border.all(color: VoltiColors.white, width: 1),
        ),
      ),
    ],
  );
}
