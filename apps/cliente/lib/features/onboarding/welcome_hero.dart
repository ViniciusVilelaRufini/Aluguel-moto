import 'dart:math' as math;

import 'package:flutter/foundation.dart';
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

/// Numeros da ilustracao (marketing, nao sao dados ao vivo; a camada visual fica
/// fora da semantica).
const kHeroNearby = 108, kHeroBattery = 92, kHeroRangeKm = 20, kHeroEtaMin = 2, kHeroDistanceM = 120;

/// Tiles com erro antes de trocar o mapa pela ilustracao.
const kHeroTileErrorLimit = 4;

/// Matriz da deriva da camera em [t] (0..1, ja com a curva): escala de 1,05 a 1,09
/// em torno do centro e translacao de ate 6 x 4 px. Com escala >= 1,05 a borda do
/// mapa nunca aparece (folga de 2,5% de cada lado > translacao).
Matrix4 heroDriftMatrix(Size size, double t) {
  final scale = 1.05 + .04 * t;
  final c = size.center(Offset.zero);
  return Matrix4.identity()
    ..translateByDouble(c.dx + (-6 + 12 * t), c.dy + (4 - 8 * t), 0, 1)
    ..scaleByDouble(scale, scale, 1, 1)
    ..translateByDouble(-c.dx, -c.dy, 0, 1);
}

/// Hero animado da boas-vindas: mapa real de Pinheiros (deriva lenta da camera),
/// galpao com anel pulsando, motos andando por ruas reais, chips com entrada em
/// cascata (bateria conta ate 92%) e a moto em destaque que sobe, cresce e flutua.
///
/// A camada visual e decorativa (fora da semantica, sem toque); por cima, so dois
/// nos de semantica nos retangulos reais do logo ("Volti", cabecalho) e da
/// promocao. Reduced motion: tudo parado no estado final. App em segundo plano ou
/// rota coberta: os controllers param. Tiles falhando: a ilustracao desenhada fica
/// no lugar do mapa e [onMapFallback] avisa (a atribuicao some).
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
    this.onMapFallback,
    this.overlap = 28,
  });

  final double band, topInset, overlap;
  final bool mapOn, showPromo;
  final String nearbyText, rangeText, etaText, distanceText, promoTitle, promoText;
  final VoidCallback? onMapFallback;

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

  /// Retangulos do layout (pins e galpao fogem da promocao, dos chips e da moto).
  final _geometry = HeroGeometry();

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

  @visibleForTesting
  HeroGeometry get debugGeometry => _geometry;

  /// Rota [i] projetada e com a deriva atual aplicada, nas coordenadas do hero.
  @visibleForTesting
  List<Offset> debugRouteOnScreen(int i, Size size) {
    final cam = _cameraFor(size, _depotTarget(size));
    final m = heroDriftMatrix(size, Curves.easeInOut.transform(_drift.value));
    return [for (final p in kHeroRoutes[i]) MatrixUtils.transformPoint(m, cam.latLngToScreenOffset(p))];
  }

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
      if (!mounted) return;
      setState(() => _tilesFailed = true);
      widget.onMapFallback?.call();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _geometry.dispose();
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

  /// Onde o galpao aparece: centro da area livre do mapa (entre os chips e a moto).
  Offset _depotTarget(Size size) => _geometry.zone?.center ?? Offset(size.width * .5, widget.band * .4);

  /// Camera com o galpao em [target].
  MapCamera _cameraFor(Size size, Offset target) {
    final cam0 = MapCamera(crs: const Epsg3857(), center: kHeroDepot, zoom: kHeroZoom, rotation: 0, nonRotatedSize: size);
    final mid = size.center(Offset.zero);
    final center = cam0.screenOffsetToLatLng(mid + (mid - target));
    return MapCamera(crs: const Epsg3857(), center: center, zoom: kHeroZoom, rotation: 0, nonRotatedSize: size);
  }

  /// Largura natural do cartao da promocao (o layout decide se precisa estreitar).
  double _promoNaturalWidth() {
    double measure(String text, TextStyle style) {
      final tp = TextPainter(
        text: TextSpan(text: text, style: style),
        textDirection: TextDirection.ltr,
        maxLines: 1,
      )..layout();
      final w = tp.width;
      tp.dispose();
      return w;
    }

    final text = math.max(measure(widget.promoTitle, VoltiTypography.bodyStrong), measure(widget.promoText, VoltiTypography.caption));
    return 10 + 36 + 10 + text + 16 + 1;
  }

  @override
  Widget build(BuildContext context) {
    final mapVisible = widget.mapOn && !_tilesFailed;
    final height = widget.band + widget.overlap;

    return LayoutBuilder(
      builder: (context, c) {
        final size = Size(c.maxWidth, height);

        // Mapa + galpao: um RepaintBoundary estatico movido pela matriz da deriva (os
        // tiles nao sao reconstruidos a cada quadro).
        final world = ListenableBuilder(
          listenable: _geometry,
          builder: (context, _) {
            final target = _depotTarget(size);
            final cam = _cameraFor(size, target);
            return Stack(
              clipBehavior: Clip.hardEdge,
              children: [
                const Positioned.fill(
                  child: CustomPaint(key: Key('welcome-map-fallback'), painter: HeroFallbackPainter()),
                ),
                // So depois do primeiro layout (a area livre define o centro): os tiles
                // carregam uma vez so.
                if (mapVisible && _geometry.zone != null)
                  Positioned.fill(
                    child: VoltiMap(
                      key: const Key('welcome-map'),
                      center: cam.center,
                      zoom: kHeroZoom,
                      interactive: false,
                      showAttribution: false,
                      backgroundColor: Colors.transparent,
                      onTileError: reportTileError,
                    ),
                  ),
                Positioned(
                  left: target.dx - 40,
                  top: target.dy - 40,
                  width: 80,
                  height: 80,
                  child: _DepotPulse(pulse: _pulse),
                ),
              ],
            );
          },
        );

        final visual = SizedBox(
          height: height,
          child: Stack(
            clipBehavior: Clip.hardEdge,
            children: [
              Positioned.fill(
                child: RepaintBoundary(
                  child: AnimatedBuilder(
                    animation: _drift,
                    child: RepaintBoundary(child: world),
                    builder: (context, child) => Transform(transform: heroDriftMatrix(size, Curves.easeInOut.transform(_drift.value)), child: child),
                  ),
                ),
              ),
              // Motos nas ruas: mesma matriz da deriva (ficam sobre as ruas), recortadas
              // 16 px acima da folha (a atribuicao fica na borda dela).
              Positioned(
                key: const Key('hero-pins'),
                top: 0,
                left: 0,
                right: 0,
                height: widget.band - 16,
                child: ClipRect(
                  child: RepaintBoundary(
                    child: AnimatedBuilder(
                      animation: Listenable.merge([_bikes, _drift, _geometry]),
                      builder: (context, _) {
                        if (_geometry.zone == null) return const SizedBox.shrink();
                        final cam = _cameraFor(size, _depotTarget(size));
                        final m = heroDriftMatrix(size, Curves.easeInOut.transform(_drift.value));
                        return Transform(
                          transform: m,
                          child: Stack(
                            clipBehavior: Clip.none,
                            children: [
                              for (var i = 0; i < kHeroRoutes.length; i++)
                                _movingPin(i, [for (final p in kHeroRoutes[i]) cam.latLngToScreenOffset(p)], m),
                            ],
                          ),
                        );
                      },
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
                  delegate: HeroLayoutDelegate(topInset: widget.topInset, geometry: _geometry, promoNaturalWidth: _promoNaturalWidth()),
                  children: [
                    LayoutId(
                      id: HeroSlot.bike,
                      // A flutuacao repinta so a moto.
                      child: RepaintBoundary(
                        child: AnimatedBuilder(
                          animation: Listenable.merge([_bikeIn, _float]),
                          builder: (context, _) => _HeroBike(entrance: _bikeIn.value, float: math.sin(_float.value * 2 * math.pi)),
                        ),
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
                          animation: _count,
                          builder: (context, _) => _DarkChip(
                            key: const Key('hero-battery'),
                            parts: [(LucideIcons.zap, '${(kHeroBattery * _count.value).round()}%'), (null, widget.rangeText)],
                          ),
                        ),
                      ),
                    ),
                    LayoutId(
                      id: HeroSlot.time,
                      child: ListenableBuilder(
                        listenable: _geometry,
                        // Escondido sem perder o tamanho (o layout decide com a medida real).
                        builder: (context, child) => Visibility.maintain(visible: _geometry.timeVisible, child: child!),
                        child: _chip(
                          4,
                          _DarkChip(
                            key: const Key('hero-time'),
                            parts: [(LucideIcons.clock, widget.etaText), (LucideIcons.moveHorizontal, widget.distanceText)],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );

        return SizedBox(
          height: height,
          child: Stack(
            children: [
              // Camada visual: decorativa, fora da semantica e sem toque.
              Positioned.fill(
                child: ExcludeSemantics(
                  key: const Key('welcome-art'),
                  child: IgnorePointer(child: MediaQuery.withNoTextScaling(child: visual)),
                ),
              ),
              // Semantica real so do logo e da promocao, nos retangulos do layout.
              ListenableBuilder(
                listenable: _geometry,
                builder: (context, _) {
                  final logo = _geometry.logo, promo = _geometry.promo;
                  return Stack(
                    children: [
                      if (logo != null)
                        Positioned.fromRect(
                          rect: logo,
                          child: Semantics(key: const Key('welcome-logo-semantics'), header: true, label: 'Volti', child: const SizedBox.expand()),
                        ),
                      if (promo != null && widget.showPromo)
                        Positioned.fromRect(
                          rect: promo,
                          child: Semantics(
                            key: const Key('welcome-promo-semantics'),
                            container: true,
                            label: '${widget.promoTitle}, ${widget.promoText}',
                            child: const SizedBox.expand(),
                          ),
                        ),
                    ],
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  /// Moto [i] na posicao do ciclo atual ao longo da rota projetada, com fade nas
  /// pontas. Some (com fade curto) onde ficaria atras da promocao, de um chip ou da
  /// moto; o teste de obstaculo usa a posicao ja com a deriva ([m]).
  Widget _movingPin(int i, List<Offset> route, Matrix4 m) {
    final t = (_bikes.value * _bikeSpeed[i] + _bikeOffset[i]) % 1.0;
    final p = pointAlong(route, t);
    final fade = t < .12 ? t / .12 : (t > .88 ? (1 - t) / .12 : 1.0);
    final clear = _geometry.isClear(MatrixUtils.transformPoint(m, p));
    return Positioned(
      key: Key('hero-pin-$i'),
      left: p.dx - 15,
      top: p.dy - 15,
      child: AnimatedOpacity(
        opacity: clear ? fade.clamp(0.0, 1.0) : 0,
        duration: VoltiMotion.scaled(context, const Duration(milliseconds: 180)),
        child: const _BikePin(),
      ),
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

/// Distancia de [p] a polilinha [pts].
double distanceToPolyline(Offset p, List<Offset> pts) {
  var best = double.infinity;
  for (var i = 1; i < pts.length; i++) {
    final a = pts[i - 1], b = pts[i];
    final ab = b - a;
    final len2 = ab.dx * ab.dx + ab.dy * ab.dy;
    final k = len2 == 0 ? 0.0 : (((p - a).dx * ab.dx + (p - a).dy * ab.dy) / len2).clamp(0.0, 1.0);
    best = math.min(best, (p - (a + ab * k)).distance);
  }
  return best;
}

enum HeroSlot { logo, nearby, promo, battery, time, bike }

/// Geometria do hero calculada no layout: retangulos do logo, dos chips e da moto,
/// a area livre do mapa e se o "2 min | 120 m" cabe. Os pins e o galpao a usam para
/// nunca ficar atras de nada; a semantica do logo e da promocao usa os retangulos.
/// Avisa depois do quadro (nunca durante o layout).
class HeroGeometry extends ChangeNotifier {
  Rect? zone, bike, promo, logo;
  bool timeVisible = true;
  List<Rect> obstacles = const [];

  void update({
    required Rect zone,
    required Rect bike,
    required Rect logo,
    required Rect? promo,
    required bool timeVisible,
    required List<Rect> obstacles,
  }) {
    if (zone == this.zone &&
        bike == this.bike &&
        logo == this.logo &&
        promo == this.promo &&
        timeVisible == this.timeVisible &&
        listEquals(obstacles, this.obstacles)) {
      return;
    }
    this.zone = zone;
    this.bike = bike;
    this.logo = logo;
    this.promo = promo;
    this.timeVisible = timeVisible;
    this.obstacles = obstacles;
    WidgetsBinding.instance.addPostFrameCallback((_) => notifyListeners());
  }

  /// O pin centrado em [c] (disco de 30 px e barra) nao cruza nenhum obstaculo.
  bool isClear(Offset c, {double margin = 6}) {
    final r = Rect.fromLTWH(c.dx - 15, c.dy - 15, 30, 37).inflate(margin);
    return !obstacles.any(r.overlaps);
  }
}

/// Posiciona logo, chips e a moto **relativos a faixa livre** (o tamanho do
/// layout = faixa acima da folha). Nenhum chip e pintado sobre a moto.
///
/// Linha 1: logo e "motos perto". Linha 2: a promocao (e a bateria ao lado, se
/// couber). Depois a bateria (se nao coube) e "2 min | 120 m" em linhas proprias,
/// uma area livre de mapa (o galpao vai no centro dela) e a moto centrada embaixo.
/// Preferencia, ate a moto chegar a ~70% da largura: 1) tudo; 2) sem o
/// "2 min | 120 m"; 3) sem ele e com a bateria ao lado da promocao (estreitada).
/// Se nem assim couber 70%, fica a opcao 3 e a moto ocupa o que sobra.
class HeroLayoutDelegate extends MultiChildLayoutDelegate {
  HeroLayoutDelegate({required this.topInset, required this.geometry, required this.promoNaturalWidth});
  final double topInset, promoNaturalWidth;
  final HeroGeometry geometry;

  static const side = 16.0, gap = 10.0, bottomGap = 6.0, minZone = 56.0;

  /// Altura estimada da promocao antes do layout (uma linha / titulo quebrado).
  static const _promoH = 57.0, _promoWrappedH = 78.0;

  @override
  void performLayout(Size size) {
    final w = size.width;
    final loose = BoxConstraints.loose(Size(w - 2 * side, size.height));
    final logo = layoutChild(HeroSlot.logo, loose);
    final nearby = layoutChild(HeroSlot.nearby, loose);
    final battery = layoutChild(HeroSlot.battery, loose);
    final time = layoutChild(HeroSlot.time, loose);
    final hasPromo = hasChild(HeroSlot.promo);

    final y1 = topInset + 10;
    final row1 = math.max(logo.height, nearby.height);
    final logoRect = Offset(side + 4, y1) & logo;
    positionChild(HeroSlot.logo, logoRect.topLeft);
    final nearbyRect = Offset(w - side - nearby.width, y1 + (row1 - nearby.height) / 2) & nearby;
    positionChild(HeroSlot.nearby, nearbyRect.topLeft);
    final y2 = y1 + row1 + 14;

    final promoMaxNatural = math.min(w * .7, w - 2 * side);
    final promoNatural = math.min(promoNaturalWidth, promoMaxNatural);
    final batteryBesideNatural = hasPromo && side + promoNatural + 12 + battery.width + side <= w;
    final promoNarrowMax = w - 2 * side - 12 - battery.width;

    double bikeWidthFor(double chipsBottom) =>
        math.max(0.0, math.min(w * .7, (size.height - chipsBottom - minZone - bottomGap) / _HeroBike.heightPerWidth));

    // Fundo dos chips (estimado) de cada opcao.
    double estimate({required bool showTime, required bool narrow}) {
      var y = y2;
      final beside = batteryBesideNatural || narrow;
      if (hasPromo) {
        y += (narrow && promoNaturalWidth > promoNarrowMax ? _promoWrappedH : _promoH);
        if (beside) y = math.max(y, y2 + battery.height);
      }
      final rowsAfter = <double>[];
      if (!hasPromo || !beside) {
        // Bateria (e o tempo ao lado, se couber) numa linha propria.
        final pairFits = showTime && side + time.width + 12 + battery.width + side <= w;
        rowsAfter.add(pairFits ? math.max(battery.height, time.height) : battery.height);
        if (showTime && !pairFits) rowsAfter.add(time.height);
      } else if (showTime) {
        rowsAfter.add(time.height);
      }
      for (final h in rowsAfter) {
        y += (y == y2 ? 0 : gap) + h;
      }
      return y;
    }

    // Estreitar a promocao (bateria ao lado) so se, mesmo sem o "2 min", a moto nao
    // chegaria a 70% com a bateria numa linha propria (estimativa: a promocao ainda
    // nao foi medida e so pode ser medida uma vez).
    final narrow = hasPromo && !batteryBesideNatural && bikeWidthFor(estimate(showTime: false, narrow: false)) < w * .7 - .5;

    // Layout real.
    final rects = <Rect>[logoRect, nearbyRect];
    var y = y2;
    Rect? promoRect;
    final beside = hasPromo && (batteryBesideNatural || narrow);
    if (hasPromo) {
      final promo = layoutChild(HeroSlot.promo, BoxConstraints.loose(Size(beside && narrow ? promoNarrowMax : promoMaxNatural, size.height)));
      promoRect = Offset(side, y2) & promo;
      positionChild(HeroSlot.promo, promoRect.topLeft);
      rects.add(promoRect);
      y = promoRect.bottom;
      if (beside) {
        final r = Offset(w - side - battery.width, y2 + math.max(0.0, (promo.height - battery.height) / 2)) & battery;
        positionChild(HeroSlot.battery, r.topLeft);
        rects.add(r);
        y = math.max(y, r.bottom);
      }
    }
    // Bateria (se nao foi ao lado da promocao) e o "2 min" em linhas proprias; o
    // "2 min" so aparece se a moto ainda chegar a 70% com ele (medida exata).
    final rowTop = hasPromo ? y + gap : y2;
    Rect? batteryRow;
    var yNoTime = y;
    if (!beside) {
      batteryRow = Offset(w - side - battery.width, rowTop) & battery;
      yNoTime = batteryRow.bottom;
    }
    Rect timeRectFor() {
      if (!beside && side + time.width + 12 + battery.width + side <= w) {
        return Offset(side, rowTop + (battery.height - time.height) / 2) & time;
      }
      return Offset(side, yNoTime + gap) & time;
    }

    final timeCandidate = timeRectFor();
    final yWithTime = math.max(yNoTime, timeCandidate.bottom);
    final showTime = bikeWidthFor(yWithTime) >= w * .7 - .5;
    if (batteryRow != null) {
      positionChild(HeroSlot.battery, batteryRow.topLeft);
      rects.add(batteryRow);
    }
    if (showTime) {
      positionChild(HeroSlot.time, timeCandidate.topLeft);
      rects.add(timeCandidate);
      y = yWithTime;
    } else {
      // Escondido (invisivel e fora da faixa).
      positionChild(HeroSlot.time, Offset(-time.width - 100, 0));
      y = yNoTime;
    }

    // Moto: ate 70% com a area livre do mapa inteira; em telas baixas a area encolhe
    // (ate 24 px) antes da moto ficar menor que 45% da largura.
    final free = size.height - y - bottomGap;
    final hpw = _HeroBike.heightPerWidth;
    final zoneH = free >= w * .7 * hpw + minZone ? minZone : (free - w * .45 * hpw).clamp(24.0, minZone);
    final bikeW = math.max(0.0, math.min(w * .7, (free - zoneH) / hpw));
    final bike = layoutChild(HeroSlot.bike, BoxConstraints.tight(Size(bikeW, bikeW * _HeroBike.heightPerWidth)));
    final bikeRect = Offset((w - bike.width) / 2, size.height - bottomGap - bike.height) & bike;
    positionChild(HeroSlot.bike, bikeRect.topLeft);

    // Area livre do mapa (o galpao vai no centro): a faixa entre os chips e a moto

    // quando ela tem altura; em telas baixas, o lado esquerdo da moto, abaixo dos chips.

    final strip = Rect.fromLTRB(side, y + 6, w - side, bikeRect.top - 6);

    final besideBike = Rect.fromLTRB(side, y + 6, bikeRect.left - 8, size.height - 16);

    final zone = strip.height >= 44 || besideBike.width < 44
        ? Rect.fromLTRB(strip.left, strip.top, strip.right, math.max(strip.top + 40, strip.bottom))
        : besideBike;
    geometry.update(zone: zone, bike: bikeRect, logo: logoRect, promo: promoRect, timeVisible: showTime, obstacles: [...rects, bikeRect]);
  }

  @override
  bool shouldRelayout(HeroLayoutDelegate oldDelegate) =>
      oldDelegate.topInset != topInset || oldDelegate.geometry != geometry || oldDelegate.promoNaturalWidth != promoNaturalWidth;
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
        key: const Key('hero-pin-dot'),
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
