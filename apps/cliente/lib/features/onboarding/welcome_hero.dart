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

/// Trechos reais de ruas que **saem do galpao** (as motos do hero "saindo do
/// galpao"): Rua dos Pinheiros para os dois lados e a travessa da Fradique
/// Coutinho para os dois lados.
const kHeroRoutes = <List<LatLng>>[
  // Rua dos Pinheiros, sentido Av. Rebouças.
  [kHeroDepot, LatLng(-23.5642, -46.6806), LatLng(-23.5629, -46.6768)],
  // Rua dos Pinheiros, sentido Largo da Batata.
  [kHeroDepot, LatLng(-23.5664, -46.6885), LatLng(-23.5668, -46.6925)],
  // Fradique Coutinho, sentido Vila Madalena.
  [kHeroDepot, LatLng(-23.5640, -46.6858), LatLng(-23.5600, -46.6890)],
  // Fradique Coutinho, sentido Faria Lima.
  [kHeroDepot, LatLng(-23.5680, -46.6826), LatLng(-23.5702, -46.6808)],
];

/// Velocidade (voltas por ciclo) e defasagem de cada moto.
const _bikeSpeed = [1.0, 0.8, 1.25, 0.65];
const _bikeOffset = [0.0, 0.35, 0.6, 0.15];

/// Tiles com erro (sem nenhum carregado) antes de trocar o mapa pela ilustracao.
const kHeroTileErrorLimit = 4;

/// Folga do mapa alem da caixa do hero (cada lado): com a deriva, a borda do mapa
/// nunca aparece.
const kHeroMapBleed = 32.0;

/// Folga das motos que andam ate as bordas do hero (nunca cortadas).
const kHeroPinInset = 16.0;

/// Fundo enquanto os tiles chegam: o cinza claro da base (sem a ilustracao por
/// baixo, para um tile atrasado nao mostrar "costura").
const kHeroMapLoading = Color(0xFFE8E8E6);

/// Matriz da deriva da camera em [t] (0..1, ja com a curva): escala de 1,05 a 1,09
/// em torno do centro e translacao de ate 6 x 4 px.
Matrix4 heroDriftMatrix(Size size, double t) {
  final scale = 1.05 + .04 * t;
  final c = size.center(Offset.zero);
  return Matrix4.identity()
    ..translateByDouble(c.dx + (-6 + 12 * t), c.dy + (4 - 8 * t), 0, 1)
    ..scaleByDouble(scale, scale, 1, 1)
    ..translateByDouble(-c.dx, -c.dy, 0, 1);
}

/// Textos do hero (pt-BR do app).
class WelcomeHeroTexts {
  const WelcomeHeroTexts({
    required this.pickup,
    required this.plansTitle,
    required this.plansText,
    required this.insurance,
    required this.batterySwap,
  });
  final String pickup, plansTitle, plansText, insurance, batterySwap;
}

/// Hero animado da boas-vindas (composicao da `login-referencia.png`):
/// - linha 1: logo e "Retire no galpão";
/// - linha 2: cartao "Planos diário, semanal e mensal" e a pilula "Seguro
///   incluso | Troca de bateria";
/// - no meio, o mapa real de Pinheiros centrado no galpao (anel pulsando) e
///   motos saindo dele pelas ruas;
/// - embaixo, a moto em destaque que sobe, cresce e flutua.
///
/// So afirmacoes verdadeiras do servico (retirada no galpao, planos, seguro e
/// troca de bateria), sem numeros inventados. A camada visual e decorativa; por
/// cima, nos de semantica nos retangulos reais do logo ("Volti", cabecalho) e dos
/// textos. Reduced motion: tudo parado. App em segundo plano ou rota coberta: os
/// controllers param. Sem nenhum tile e com erros: a ilustracao entra e
/// [onMapFallback] avisa (a atribuicao some).
class WelcomeHero extends StatefulWidget {
  const WelcomeHero({
    super.key,
    required this.band,
    required this.topInset,
    required this.mapOn,
    required this.showPlans,
    required this.texts,
    this.onMapFallback,
    this.overlap = 28,
    this.layoutReady = true,
  });

  /// A faixa ja e a definitiva (folha medida): so entao o mapa e criado, para nao
  /// mover a camera logo depois de abrir (e pedir os tiles duas vezes).
  final bool layoutReady;

  final double band, topInset, overlap;
  final bool mapOn;

  /// Cartao dos planos no hero (com texto grande ele vai para a folha).
  final bool showPlans;
  final WelcomeHeroTexts texts;
  final VoidCallback? onMapFallback;

  @override
  State<WelcomeHero> createState() => WelcomeHeroState();
}

class WelcomeHeroState extends State<WelcomeHero> with TickerProviderStateMixin, WidgetsBindingObserver {
  /// Entrada: chips em cascata e a moto (uma vez).
  late final AnimationController _entrance = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000));

  /// Flutuacao da moto (3 s).
  late final AnimationController _float = AnimationController(vsync: this, duration: const Duration(seconds: 3));

  /// Deriva da camera: 10 s para cada lado (volta completa de 20 s).
  late final AnimationController _drift = AnimationController(vsync: this, duration: const Duration(seconds: 10));

  /// Motos nas ruas.
  late final AnimationController _bikes = AnimationController(vsync: this, duration: const Duration(seconds: 12));

  /// Anel do galpao.
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800));

  List<AnimationController> get _loops => [_float, _drift, _bikes, _pulse];

  /// Cascata dos chips (80 ms entre eles) e entrada da moto (~600 ms, curva da
  /// tela do DS): mesmo ticker da entrada.
  late final List<Animation<double>> _chipsIn = [
    for (var i = 0; i < 4; i++)
      CurvedAnimation(
        parent: _entrance,
        curve: Interval(i * 80 / 1000, (i * 80 + 360) / 1000, curve: VoltiMotion.easeOut),
      ),
  ];
  late final Animation<double> _bikeIn = CurvedAnimation(
    parent: _entrance,
    curve: const Interval(.2, .8, curve: VoltiMotion.easeScreen),
  );

  /// Retangulos do layout (pins e galpao fogem dos chips e da moto).
  final _geometry = HeroGeometry();
  final _map = MapController();
  LatLng? _mapCenter;

  AppLifecycleState? _lifecycle = WidgetsBinding.instance.lifecycleState;
  bool _tickerEnabled = true;
  bool _reduced = false;
  int _tileErrors = 0;
  int _tilesLoaded = 0;
  bool _tilesFailed = false;

  @visibleForTesting
  bool get debugAnimating => [_entrance, ..._loops].any((c) => c.isAnimating);

  @visibleForTesting
  bool get debugTilesFailed => _tilesFailed;

  @visibleForTesting
  HeroGeometry get debugGeometry => _geometry;

  /// Rota [i] projetada e com a deriva atual aplicada, nas coordenadas do hero.
  @visibleForTesting
  List<Offset> debugRouteOnScreen(int i, Size size) {
    final cam = _cameraFor(size);
    final m = heroDriftMatrix(size, Curves.easeInOut.transform(_drift.value));
    return [for (final p in kHeroRoutes[i]) MatrixUtils.transformPoint(m, cam.latLngToScreenOffset(p))];
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _geometry.addListener(_recenterMap);
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
      _bikes.value = .45;
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

  /// Um tile falhou. Sem nenhum tile carregado e com [kHeroTileErrorLimit] erros
  /// (o mapa ja tenta de novo sozinho), o mapa sai e fica a ilustracao.
  void reportTileError() {
    _tileErrors++;
    if (_tilesFailed || _tilesLoaded > 0 || _tileErrors < kHeroTileErrorLimit) return;
    Future.microtask(() {
      if (!mounted) return;
      setState(() => _tilesFailed = true);
      widget.onMapFallback?.call();
    });
  }

  void _tileLoaded() => _tilesLoaded++;

  /// A area livre mudou (folha medida, rotacao): move a camera do mapa ja criado
  /// (o FlutterMap ignora um `initialCenter` novo).
  void _recenterMap() {
    final size = _lastSize;
    if (size == null || _mapCenter == null) return;
    final c = _cameraFor(size).center;
    if (c == _mapCenter) return;
    _mapCenter = c;
    try {
      _map.move(c, kHeroZoom);
    } catch (_) {
      // mapa ainda nao montado: o centro inicial ja e o novo
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _geometry.removeListener(_recenterMap);
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

  Size? _lastSize;

  /// Onde o galpao aparece: centro da area livre do mapa (entre os chips e a moto).
  Offset _depotTarget(Size size) => _geometry.zone?.center ?? Offset(size.width * .5, widget.band * .45);

  /// Camera (nas coordenadas do hero) com o galpao em [_depotTarget]. O mapa e
  /// maior que o hero ([kHeroMapBleed]) mas tem o mesmo centro, entao a projecao e
  /// a mesma.
  MapCamera _cameraFor(Size size) {
    final target = _depotTarget(size);
    final cam0 = MapCamera(crs: const Epsg3857(), center: kHeroDepot, zoom: kHeroZoom, rotation: 0, nonRotatedSize: size);
    final mid = size.center(Offset.zero);
    final center = cam0.screenOffsetToLatLng(mid + (mid - target));
    return MapCamera(crs: const Epsg3857(), center: center, zoom: kHeroZoom, rotation: 0, nonRotatedSize: size);
  }

  /// Largura natural do cartao dos planos (o layout decide se cabe ao lado da pilula).
  double _plansNaturalWidth() {
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

    final text = math.max(measure(widget.texts.plansTitle, VoltiTypography.bodyStrong), measure(widget.texts.plansText, VoltiTypography.caption));
    return 10 + 36 + 10 + text + 16 + 1;
  }

  @override
  Widget build(BuildContext context) {
    final mapVisible = widget.mapOn && !_tilesFailed;
    final height = widget.band + widget.overlap;
    final texts = widget.texts;

    return LayoutBuilder(
      builder: (context, c) {
        final size = Size(c.maxWidth, height);
        _lastSize = size;

        // Mapa + galpao: RepaintBoundary estatico movido pela matriz da deriva (os
        // tiles nao sao reconstruidos a cada quadro).
        final world = ListenableBuilder(
          listenable: _geometry,
          builder: (context, _) {
            final ready = _geometry.zone != null && widget.layoutReady;
            if (ready && _mapCenter == null) _mapCenter = _cameraFor(size).center;
            final target = _depotTarget(size);
            return Stack(
              clipBehavior: Clip.none,
              children: [
                if (!mapVisible)
                  const Positioned.fill(
                    child: CustomPaint(key: Key('welcome-map-fallback'), painter: HeroFallbackPainter()),
                  ),
                // Criado uma vez, depois do primeiro layout (a area livre define o
                // centro); maior que o hero para a deriva nunca mostrar a borda.
                if (mapVisible && ready)
                  Positioned(
                    left: -kHeroMapBleed,
                    top: -kHeroMapBleed,
                    right: -kHeroMapBleed,
                    bottom: -kHeroMapBleed,
                    child: VoltiMap(
                      key: const Key('welcome-map'),
                      controller: _map,
                      center: _mapCenter!,
                      zoom: kHeroZoom,
                      interactive: false,
                      showAttribution: false,
                      backgroundColor: kHeroMapLoading,
                      onTileError: reportTileError,
                      onTileLoaded: _tileLoaded,
                    ),
                  ),
                if (ready)
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
              Positioned.fill(child: ColoredBox(color: mapVisible ? kHeroMapLoading : VoltiColors.mapLand)),
              Positioned.fill(
                child: RepaintBoundary(
                  child: AnimatedBuilder(
                    animation: _drift,
                    child: RepaintBoundary(child: world),
                    builder: (context, child) => Transform(transform: heroDriftMatrix(size, Curves.easeInOut.transform(_drift.value)), child: child),
                  ),
                ),
              ),
              // Motos saindo do galpao: mesma matriz da deriva (ficam sobre as ruas),
              // recortadas 16 px acima da folha.
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
                        final cam = _cameraFor(size);
                        final m = heroDriftMatrix(size, Curves.easeInOut.transform(_drift.value));
                        return Transform(
                          transform: m,
                          child: Stack(
                            clipBehavior: Clip.none,
                            children: [
                              for (var i = 0; i < kHeroRoutes.length; i++)
                                _movingPin(i, [for (final p in kHeroRoutes[i]) cam.latLngToScreenOffset(p)], m, size),
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
                height: widget.topInset + 110,
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
                  delegate: HeroLayoutDelegate(topInset: widget.topInset, geometry: _geometry, plansNaturalWidth: _plansNaturalWidth()),
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
                      id: HeroSlot.pickup,
                      child: _chip(1, _PickupChip(text: texts.pickup)),
                    ),
                    if (widget.showPlans)
                      LayoutId(
                        id: HeroSlot.plans,
                        child: _chip(2, HeroPlansCard(title: texts.plansTitle, text: texts.plansText)),
                      ),
                    LayoutId(
                      id: HeroSlot.perks,
                      // Tela estreita: o cartao dos planos ocupa a linha e a pilula desce, em linha.
                      child: _chip(3, _PerksPill(insurance: texts.insurance, swap: texts.batterySwap, horizontal: c.maxWidth < 392)),
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
              // Semantica real (afirmacoes do servico) nos retangulos do layout.
              ListenableBuilder(
                listenable: _geometry,
                builder: (context, _) {
                  final r = _geometry.rects;
                  Widget node(HeroSlot slot, String key, String label, {bool header = false}) => Positioned.fromRect(
                    rect: r[slot]!,
                    child: Semantics(key: Key(key), container: true, header: header, label: label, child: const SizedBox.expand()),
                  );
                  return Stack(
                    children: [
                      if (r[HeroSlot.logo] != null) node(HeroSlot.logo, 'welcome-logo-semantics', 'Volti', header: true),
                      if (r[HeroSlot.pickup] != null) node(HeroSlot.pickup, 'welcome-pickup-semantics', texts.pickup),
                      if (widget.showPlans && r[HeroSlot.plans] != null)
                        node(HeroSlot.plans, 'welcome-plans-semantics', '${texts.plansTitle}, ${texts.plansText}'),
                      if (r[HeroSlot.perks] != null) node(HeroSlot.perks, 'welcome-perks-semantics', '${texts.insurance}, ${texts.batterySwap}'),
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

  /// Moto [i] na posicao do ciclo atual ao longo da rota (saindo do galpao), com
  /// fade nas pontas. Some (fade curto) onde ficaria atras de um chip ou da moto,
  /// ou a menos de [kHeroPinInset] das bordas; o teste usa a posicao com a deriva.
  Widget _movingPin(int i, List<Offset> route, Matrix4 m, Size size) {
    final t = (_bikes.value * _bikeSpeed[i] + _bikeOffset[i]) % 1.0;
    final p = pointAlong(route, t);
    final fade = t < .15 ? t / .15 : (t > .85 ? (1 - t) / .15 : 1.0);
    final clear = _geometry.isClear(MatrixUtils.transformPoint(m, p), Size(size.width, widget.band - 16));
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

enum HeroSlot { logo, pickup, plans, perks, bike }

/// Geometria do hero calculada no layout: retangulos de cada slot, a area livre do
/// mapa e os obstaculos (chips e moto). Os pins e o galpao a usam para nunca ficar
/// atras de nada; a semantica usa os retangulos. Avisa depois do quadro.
class HeroGeometry extends ChangeNotifier {
  Rect? zone;

  /// Fundo dos chips: as motos so andam abaixo (na faixa do mapa).
  double mapTop = 0;
  Map<HeroSlot, Rect> rects = const {};
  List<Rect> get obstacles => rects.values.toList();
  Rect? get bike => rects[HeroSlot.bike];

  void update({required Rect zone, required double mapTop, required Map<HeroSlot, Rect> rects}) {
    if (zone == this.zone && mapTop == this.mapTop && mapEquals(rects, this.rects)) return;
    this.zone = zone;
    this.mapTop = mapTop;
    this.rects = rects;
    WidgetsBinding.instance.addPostFrameCallback((_) => notifyListeners());
  }

  /// O pin centrado em [c] (disco de 30 px e barra) nao cruza nenhum obstaculo e
  /// fica a [kHeroPinInset] das bordas de [area].
  bool isClear(Offset c, Size area, {double margin = 6}) {
    final pin = Rect.fromLTWH(c.dx - 15, c.dy - 15, 30, 37);
    final inside = Rect.fromLTRB(kHeroPinInset, math.max(kHeroPinInset, mapTop + 4), area.width - kHeroPinInset, area.height - kHeroPinInset);
    if (pin.left < inside.left || pin.top < inside.top || pin.right > inside.right || pin.bottom > inside.bottom) return false;
    final r = pin.inflate(margin);
    return !obstacles.any(r.overlaps);
  }
}

/// Posiciona logo, chips e a moto **relativos a faixa livre** (o tamanho do
/// layout = faixa acima da folha). Nenhum chip e pintado sobre a moto.
///
/// Linha 1: logo e "Retire no galpão". Linha 2: cartao dos planos e, a direita, a
/// pilula "Seguro incluso | Troca de bateria" (se o cartao couber com o titulo em
/// ate duas linhas; senao a pilula desce para a linha seguinte). Depois, a area
/// livre do mapa (o galpao no centro) e a moto centrada embaixo com o que sobra
/// (ate 70% da largura).
class HeroLayoutDelegate extends MultiChildLayoutDelegate {
  HeroLayoutDelegate({required this.topInset, required this.geometry, required this.plansNaturalWidth});
  final double topInset, plansNaturalWidth;
  final HeroGeometry geometry;

  static const side = 16.0, gap = 10.0, bottomGap = 6.0, minZone = 80.0, minCard = 196.0;

  @override
  void performLayout(Size size) {
    final w = size.width;
    final loose = BoxConstraints.loose(Size(w - 2 * side, size.height));
    final rects = <HeroSlot, Rect>{};
    Rect place(HeroSlot id, Size s, Offset o) {
      positionChild(id, o);
      return rects[id] = o & s;
    }

    final logo = layoutChild(HeroSlot.logo, loose);
    final pickup = layoutChild(HeroSlot.pickup, loose);
    final perks = layoutChild(HeroSlot.perks, loose);
    final y1 = topInset + 10;
    final row1 = math.max(logo.height, pickup.height);
    place(HeroSlot.logo, logo, Offset(side + 4, y1 + (row1 - logo.height) / 2));
    place(HeroSlot.pickup, pickup, Offset(w - side - pickup.width, y1 + (row1 - pickup.height) / 2));
    var y = y1 + row1 + 14;

    if (hasChild(HeroSlot.plans)) {
      final besideMax = w - 2 * side - 12 - perks.width;
      final beside = besideMax >= math.min(minCard, plansNaturalWidth);
      final plans = layoutChild(HeroSlot.plans, BoxConstraints.loose(Size(beside ? besideMax : w - 2 * side, size.height)));
      final p = place(HeroSlot.plans, plans, Offset(side, y));
      if (beside) {
        final row2 = math.max(plans.height, perks.height);
        place(HeroSlot.perks, perks, Offset(w - side - perks.width, y + (row2 - perks.height) / 2));
        y += row2;
      } else {
        final q = place(HeroSlot.perks, perks, Offset(w - side - perks.width, p.bottom + gap));
        y = q.bottom;
      }
    } else {
      y = place(HeroSlot.perks, perks, Offset(w - side - perks.width, y)).bottom;
    }

    // Moto: ate 70% com a area livre do mapa inteira; em telas baixas a area encolhe
    // (ate 24 px) antes da moto ficar menor que 45% da largura.
    final free = size.height - y - bottomGap;
    const hpw = _HeroBike.heightPerWidth;
    final zoneH = free >= w * .7 * hpw + minZone ? minZone : (free - w * .45 * hpw).clamp(24.0, minZone);
    final bikeW = math.max(0.0, math.min(w * .7, (free - zoneH) / hpw));
    final bike = layoutChild(HeroSlot.bike, BoxConstraints.tight(Size(bikeW, bikeW * hpw)));
    final bikeRect = place(HeroSlot.bike, bike, Offset((w - bike.width) / 2, size.height - bottomGap - bike.height));

    // Area livre do mapa: a faixa entre os chips e a moto quando ela tem altura;
    // em telas baixas, o lado esquerdo da moto, abaixo dos chips.
    final strip = Rect.fromLTRB(side, y + 6, w - side, bikeRect.top - 6);
    final besideBike = Rect.fromLTRB(side, y + 6, bikeRect.left - 8, size.height - 16);
    final zone = strip.height >= 48 || besideBike.width < 48
        ? Rect.fromLTRB(strip.left, strip.top, strip.right, math.max(strip.top + 44, strip.bottom))
        : besideBike;
    geometry.update(zone: zone, mapTop: y, rects: rects);
  }

  @override
  bool shouldRelayout(HeroLayoutDelegate oldDelegate) =>
      oldDelegate.topInset != topInset || oldDelegate.geometry != geometry || oldDelegate.plansNaturalWidth != plansNaturalWidth;
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

/// Fundo sem mapa (sem rede ou tiles falhando): terreno e ruas diagonais no tom
/// do DS. Nunca uma tela cinza.
class HeroFallbackPainter extends CustomPainter {
  const HeroFallbackPainter();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = VoltiColors.mapLand);
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

/// "• 🏭 Retire no galpão": pilula branca com o ponto verde e o icone do galpao.
class _PickupChip extends StatelessWidget {
  const _PickupChip({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    key: const Key('hero-pickup'),
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
        const Icon(LucideIcons.warehouse, size: 14, color: VoltiColors.brandAction),
        const SizedBox(width: 6),
        Text(
          text,
          style: _chipText.copyWith(fontWeight: VoltiTypography.fwSemibold, color: VoltiColors.ink900),
        ),
      ],
    ),
  );
}

/// Cartao branco "📅 Planos diário, semanal e mensal · ou por minuto e hora". Usado
/// no hero e, com texto grande, na folha (escala com o texto).
class HeroPlansCard extends StatelessWidget {
  const HeroPlansCard({super.key, required this.title, required this.text});
  final String title, text;

  @override
  Widget build(BuildContext context) => Container(
    key: const Key('welcome-plans'),
    padding: const EdgeInsets.fromLTRB(10, 10, 16, 10),
    decoration: const BoxDecoration(color: VoltiColors.white, borderRadius: VoltiRadii.rMd, boxShadow: VoltiShadows.shadow2),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: const BoxDecoration(color: VoltiColors.brandSoft, borderRadius: VoltiRadii.rSm),
          child: const Icon(LucideIcons.calendarDays, size: 18, color: VoltiColors.brandAction),
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

/// Pilula escura em duas partes empilhadas: "🛡 Seguro incluso" e "🔋 Troca de bateria".
class _PerksPill extends StatelessWidget {
  const _PerksPill({required this.insurance, required this.swap, this.horizontal = false});
  final String insurance, swap;

  /// As duas partes lado a lado (telas estreitas, linha propria).
  final bool horizontal;

  @override
  Widget build(BuildContext context) {
    Widget part(IconData icon, String text) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: VoltiColors.green900,
            shape: BoxShape.circle,
            border: Border.all(color: VoltiColors.green700),
          ),
          child: Icon(icon, size: 13, color: VoltiColors.green400),
        ),
        const SizedBox(width: 8),
        Text(text, style: _chipText.copyWith(color: VoltiColors.white)),
      ],
    );
    if (horizontal) {
      return Container(
        key: const Key('hero-perks'),
        padding: const EdgeInsets.fromLTRB(6, 6, 14, 6),
        decoration: const BoxDecoration(color: VoltiColors.ink900, borderRadius: VoltiRadii.rPill, boxShadow: VoltiShadows.shadow2),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            part(LucideIcons.shieldCheck, insurance),
            Container(width: 1, height: 18, margin: const EdgeInsets.symmetric(horizontal: 10), color: VoltiColors.ink600),
            part(LucideIcons.batteryCharging, swap),
          ],
        ),
      );
    }
    return Container(
      key: const Key('hero-perks'),
      padding: const EdgeInsets.fromLTRB(8, 7, 14, 7),
      decoration: const BoxDecoration(color: VoltiColors.ink900, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow2),
      child: IntrinsicWidth(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            part(LucideIcons.shieldCheck, insurance),
            Container(height: 1, margin: const EdgeInsets.symmetric(vertical: 6), color: VoltiColors.ink600),
            part(LucideIcons.batteryCharging, swap),
          ],
        ),
      ),
    );
  }
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
