import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
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

/// Raio maximo do anel do galpao (34 px + 40 px de pulso, metade).
const kHeroDepotRadius = 37.0;

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

/// Velocidade do carrossel das afirmacoes (px logicos por segundo, constante).
const kHeroMarqueeSpeed = 36.0;

/// Espaco entre os cartoes do carrossel (tambem entre o ultimo e a copia do primeiro).
const kHeroMarqueeGap = 10.0;

/// Largura da mascara de fade em cada borda do carrossel.
const kHeroMarqueeFade = 24.0;

/// Uma afirmacao do servico: cartao branco com o icone verde, titulo e texto
/// ([textIcon] opcional antes do texto).
class HeroStatementData {
  const HeroStatementData({required this.icon, required this.title, required this.text, this.textIcon});
  final IconData icon;
  final String title, text;
  final IconData? textIcon;

  /// Rotulo do leitor de tela.
  String get label => '$title, $text';
}

/// Textos do hero (pt-BR do app).
class WelcomeHeroTexts {
  const WelcomeHeroTexts({
    required this.pickupTitle,
    required this.pickupText,
    required this.plansTitle,
    required this.plansText,
    required this.insuranceTitle,
    required this.insuranceText,
  });
  final String pickupTitle, pickupText, plansTitle, plansText, insuranceTitle, insuranceText;

  /// As tres afirmacoes, na ordem do carrossel.
  List<HeroStatementData> get statements => [
    HeroStatementData(icon: LucideIcons.warehouse, title: pickupTitle, text: pickupText),
    HeroStatementData(icon: LucideIcons.calendarDays, title: plansTitle, text: plansText),
    HeroStatementData(icon: LucideIcons.shieldCheck, title: insuranceTitle, text: insuranceText, textIcon: LucideIcons.batteryCharging),
  ];
}

/// Hero animado da boas-vindas (composicao da `login-referencia.png`):
/// - em cima, o logo;
/// - embaixo dele, o carrossel das tres afirmacoes (cartoes brancos "Retire no
///   galpão", "Planos diário, semanal e mensal" e "Seguro incluso") andando para
///   a esquerda sem emenda, com fade nas bordas;
/// - no meio, o mapa real de Pinheiros centrado no galpao (anel pulsando) e
///   motos saindo dele pelas ruas;
/// - embaixo, a moto em destaque que sobe, cresce e flutua.
///
/// So afirmacoes verdadeiras do servico (retirada no galpao, planos, seguro e
/// troca de bateria), sem numeros inventados. A camada visual e decorativa; por
/// cima, nos de semantica estaticos: o logo ("Volti", cabecalho) e uma vez cada
/// afirmacao, na faixa do carrossel. Reduced motion: tudo parado, e o carrossel
/// mostra so os cartoes que cabem inteiros ([onStatementsShown] avisa quantos;
/// os outros vao para a folha). App em segundo plano ou rota coberta: os
/// controllers param. Sem nenhum tile e com erros: a ilustracao entra e
/// [onMapFallback] avisa (a atribuicao some).
class WelcomeHero extends StatefulWidget {
  const WelcomeHero({
    super.key,
    required this.band,
    required this.topInset,
    required this.mapOn,
    required this.showStatements,
    required this.texts,
    this.onMapFallback,
    this.onStatementsShown,
    this.overlap = 28,
    this.layoutReady = true,
  });

  /// Quantas afirmacoes o hero mostra (as primeiras): todas com o carrossel; com
  /// reduced motion, as que cabem inteiras numa linha.
  final ValueChanged<int>? onStatementsShown;

  /// A faixa ja e a definitiva (folha medida): so entao o mapa e criado, para nao
  /// mover a camera logo depois de abrir (e pedir os tiles duas vezes).
  final bool layoutReady;

  final double band, topInset, overlap;
  final bool mapOn;

  /// O carrossel das afirmacoes no hero. Com texto grande as tres vao para a
  /// folha (estaticas, escalam com o texto).
  final bool showStatements;
  final WelcomeHeroTexts texts;
  final VoidCallback? onMapFallback;

  @override
  State<WelcomeHero> createState() => WelcomeHeroState();
}

class WelcomeHeroState extends State<WelcomeHero> with TickerProviderStateMixin, WidgetsBindingObserver {
  /// Entrada: logo e carrossel em cascata e a moto (uma vez).
  late final AnimationController _entrance = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000));

  /// Flutuacao da moto (3 s).
  late final AnimationController _float = AnimationController(vsync: this, duration: const Duration(seconds: 3));

  /// Deriva da camera: 10 s para cada lado (volta completa de 20 s).
  late final AnimationController _drift = AnimationController(vsync: this, duration: const Duration(seconds: 10));

  /// Motos nas ruas.
  late final AnimationController _bikes = AnimationController(vsync: this, duration: const Duration(seconds: 12));

  /// Anel do galpao.
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800));

  /// Carrossel das afirmacoes: valor = px percorridos (sem limite, simulacao
  /// linear a [kHeroMarqueeSpeed]); o render usa o resto pelo ciclo.
  late final AnimationController _marquee = AnimationController.unbounded(vsync: this);

  List<AnimationController> get _loops => [_float, _drift, _bikes, _pulse, _marquee];

  /// Cascata do logo e do carrossel (80 ms entre eles) e entrada da moto (~600 ms, curva da
  /// tela do DS): mesmo ticker da entrada.
  late final List<Animation<double>> _chipsIn = [
    for (var i = 0; i < 2; i++)
      CurvedAnimation(
        parent: _entrance,
        curve: Interval(i * 80 / 1000, (i * 80 + 360) / 1000, curve: VoltiMotion.easeOut),
      ),
  ];
  late final Animation<double> _bikeIn = CurvedAnimation(
    parent: _entrance,
    curve: const Interval(.2, .8, curve: VoltiMotion.easeScreen),
  );

  /// Retangulos do layout (pins e galpao fogem do logo, do carrossel e da moto).
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
  bool get debugMarqueeAnimating => _marquee.isAnimating;

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
    _geometry.addListener(_reportShown);
  }

  int? _reportedShown;

  void _reportShown() {
    final n = _geometry.shown;
    if (n == null || n == _reportedShown) return;
    _reportedShown = n;
    widget.onStatementsShown?.call(n);
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
      _marquee.value = 0;
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
    // Retoma de onde parou (sem salto).
    if (!_marquee.isAnimating) _marquee.animateWith(_MarqueeSimulation(_marquee.value));
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
    _geometry.removeListener(_reportShown);
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

  /// Onde o galpao aparece: centro da area livre do mapa (entre o carrossel e a moto).
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

  /// Carrossel: os cartoes uma vez na arvore (o render os pinta em sequencia,
  /// repetidos ate cobrir a faixa), com fade nas bordas quando anda.
  Widget _statementsBand(List<HeroStatementData> statements) {
    final band = HeroStatementsBand(
      key: const Key('hero-statements'),
      offset: _marquee,
      scrolling: !_reduced,
      onShown: _geometry.setShown,
      children: [for (var i = 0; i < statements.length; i++) HeroStatementCard(index: i, data: statements[i])],
    );
    return RepaintBoundary(
      child: _reduced
          ? band
          : ShaderMask(
              blendMode: BlendMode.dstIn,
              shaderCallback: (rect) {
                final f = rect.width <= 0 ? 0.0 : (kHeroMarqueeFade / rect.width).clamp(0.0, .5);
                return LinearGradient(
                  colors: const [Color(0x00FFFFFF), VoltiColors.white, VoltiColors.white, Color(0x00FFFFFF)],
                  stops: [0, f, 1 - f, 1],
                ).createShader(rect);
              },
              child: band,
            ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mapVisible = widget.mapOn && !_tilesFailed;
    final height = widget.band + widget.overlap;
    final statements = widget.texts.statements;

    return LayoutBuilder(
      builder: (context, c) {
        final size = Size(c.maxWidth, height);
        _lastSize = size;
        if (kMapDebug) debugPrint('VOLTI_DBG hero size=$size band=${widget.band} ready=${widget.layoutReady} zone=${_geometry.zone}');

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
                  Positioned.fill(
                    child: CustomPaint(key: Key('welcome-map-fallback'), painter: HeroFallbackPainter(dark: context.palette.isDark)),
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
                      backgroundColor: context.palette.isDark ? context.palette.mapLand : kHeroMapLoading,
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
              Positioned.fill(child: ColoredBox(color: mapVisible && !context.palette.isDark ? kHeroMapLoading : context.palette.mapLand)),
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
                  delegate: HeroLayoutDelegate(topInset: widget.topInset, geometry: _geometry),
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
                    if (widget.showStatements) LayoutId(id: HeroSlot.statements, child: _chip(1, _statementsBand(statements))),
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
                  // Os textos do hero escalam ate 1,3x; acima do padrao eles vao para a
                  // folha (WelcomeScreen), onde escalam sem teto.
                  child: IgnorePointer(child: MediaQuery.withClampedTextScaling(maxScaleFactor: 1.3, child: visual)),
                ),
              ),
              // Semantica real, estatica: o logo e cada afirmacao mostrada uma vez,
              // lado a lado na faixa do carrossel (as copias pintadas nao contam).
              ListenableBuilder(
                listenable: _geometry,
                builder: (context, _) {
                  final r = _geometry.rects;
                  Widget node(Rect rect, String key, String label, {bool header = false}) => Positioned.fromRect(
                    rect: rect,
                    child: Semantics(key: Key(key), container: true, header: header, label: label, child: const SizedBox.expand()),
                  );
                  final band = r[HeroSlot.statements];
                  final shown = math.min(_geometry.shown ?? 0, statements.length);
                  final slot = band == null || shown == 0 ? 0.0 : (band.width - 2 * HeroLayoutDelegate.side) / shown;
                  return Stack(
                    children: [
                      if (r[HeroSlot.logo] != null) node(r[HeroSlot.logo]!, 'welcome-logo-semantics', 'Volti', header: true),
                      if (band != null && slot > 0)
                        for (var i = 0; i < shown; i++)
                          node(
                            Rect.fromLTWH(band.left + HeroLayoutDelegate.side + i * slot, band.top, slot, band.height),
                            'welcome-statement-semantics-$i',
                            statements[i].label,
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

  /// Moto [i] na posicao do ciclo atual ao longo da rota (saindo do galpao), com
  /// fade nas pontas. Some (fade curto) onde ficaria atras do carrossel, do logo ou da moto,
  /// ou a menos de [kHeroPinInset] das bordas; o teste usa a posicao com a deriva.
  Widget _movingPin(int i, List<Offset> route, Matrix4 m, Size size) {
    final t = (_bikes.value * _bikeSpeed[i] + _bikeOffset[i]) % 1.0;
    final p = pointAlong(route, t);
    final fade = t < .15 ? t / .15 : (t > .85 ? (1 - t) / .15 : 1.0);
    final clear = _geometry.isClear(
      MatrixUtils.transformPoint(m, p),
      Size(size.width, widget.band - 16),
      depot: MatrixUtils.transformPoint(m, _depotTarget(size)),
    );
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

enum HeroSlot { logo, statements, bike }

/// Geometria do hero calculada no layout: retangulos de cada slot, a area livre do
/// mapa e os obstaculos (logo, a faixa inteira do carrossel e a moto). Os pins e o
/// galpao a usam para nunca ficar atras de nada; a semantica usa os retangulos e
/// [shown]. Avisa depois do quadro.
class HeroGeometry extends ChangeNotifier {
  Rect? zone;

  /// Quantas afirmacoes o carrossel mostra (as primeiras); nulo antes do layout.
  int? shown;

  void setShown(int n) {
    if (n == shown) return;
    shown = n;
    WidgetsBinding.instance.addPostFrameCallback((_) => notifyListeners());
  }

  /// Fundo do carrossel: as motos so andam abaixo (na faixa do mapa).
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
  ///
  /// [depot] e o centro do galpao (ja com a deriva): o anel pulsando (raio 37) conta
  /// como obstaculo, e as motos que saem dele so aparecem fora do anel.
  bool isClear(Offset c, Size area, {double margin = 6, Offset? depot}) {
    if (depot != null && (c - depot).distance < kHeroDepotRadius + 15 + margin) return false;
    final pin = Rect.fromLTWH(c.dx - 15, c.dy - 15, 30, 37);
    final inside = Rect.fromLTRB(kHeroPinInset, math.max(kHeroPinInset, mapTop + 4), area.width - kHeroPinInset, area.height - kHeroPinInset);
    if (pin.left < inside.left || pin.top < inside.top || pin.right > inside.right || pin.bottom > inside.bottom) return false;
    final r = pin.inflate(margin);
    return !obstacles.any(r.overlaps);
  }
}

/// Posiciona o logo, o carrossel e a moto **relativos a faixa livre** (o tamanho
/// do layout = faixa acima da folha). Nada e pintado sobre a moto.
///
/// Linha 1: o logo, a esquerda. Linha 2: o carrossel das afirmacoes de ponta a
/// ponta (o gutter de [side] fica dentro dele, para o fade); a faixa inteira e um
/// obstaculo. Depois, a area livre do mapa (o galpao no centro) e a moto
/// centrada embaixo com o que sobra (ate 70% da largura).
class HeroLayoutDelegate extends MultiChildLayoutDelegate {
  HeroLayoutDelegate({required this.topInset, required this.geometry});
  final double topInset;
  final HeroGeometry geometry;

  static const side = 16.0, gap = 10.0, bottomGap = 6.0, minZone = 80.0;

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
    final y1 = topInset + 10;
    var y = place(HeroSlot.logo, logo, Offset(side + 4, y1)).bottom;
    // Sem o carrossel (texto grande): as afirmacoes estao na folha; so o logo fica no hero.
    if (hasChild(HeroSlot.statements)) {
      final band = layoutChild(HeroSlot.statements, BoxConstraints(minWidth: w, maxWidth: w, maxHeight: size.height));
      y = place(HeroSlot.statements, band, Offset(0, y + gap - RenderHeroStatements.vPad)).bottom;
    }

    // Moto: ate 70% com a area livre do mapa inteira; em telas baixas a area encolhe
    // (ate 24 px) antes da moto ficar menor que 45% da largura.
    final free = size.height - y - bottomGap;
    const hpw = _HeroBike.heightPerWidth;
    final zoneH = free >= w * .7 * hpw + minZone ? minZone : (free - w * .45 * hpw).clamp(24.0, minZone);
    final bikeW = math.max(0.0, math.min(w * .7, (free - zoneH) / hpw));
    final bike = layoutChild(HeroSlot.bike, BoxConstraints.tight(Size(bikeW, bikeW * hpw)));
    final bikeRect = place(HeroSlot.bike, bike, Offset((w - bike.width) / 2, size.height - bottomGap - bike.height));

    // Area livre do mapa: a faixa entre o carrossel e a moto quando ela tem altura;
    // em telas baixas, o lado esquerdo da moto, abaixo do carrossel.
    final strip = Rect.fromLTRB(side, y + 6, w - side, bikeRect.top - 6);
    final besideBike = Rect.fromLTRB(side, y + 6, bikeRect.left - 8, size.height - 16);
    final zone = strip.height >= 48 || besideBike.width < 48
        ? Rect.fromLTRB(strip.left, strip.top, strip.right, math.max(strip.top + 44, strip.bottom))
        : besideBike;
    geometry.update(zone: zone, mapTop: y, rects: rects);
  }

  @override
  bool shouldRelayout(HeroLayoutDelegate oldDelegate) =>
      oldDelegate.topInset != topInset || oldDelegate.geometry != geometry;
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
  const HeroFallbackPainter({this.dark = false});

  /// Tema escuro: terreno e ruas nos tons de mapa escuros (`VoltiPalette.mapLand`).
  final bool dark;

  @override
  void paint(Canvas canvas, Size size) {
    final road = dark ? VoltiColors.ink700 : VoltiColors.mapRoad;
    canvas.drawRect(Offset.zero & size, Paint()..color = dark ? VoltiPalette.dark.mapLand : VoltiColors.mapLand); // tema: fixo (ramo claro)
    final minor = Paint()
      ..color = road
      ..strokeWidth = 5;
    final major = Paint()
      ..color = road
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
  bool shouldRepaint(covariant HeroFallbackPainter oldDelegate) => oldDelegate.dark != dark;
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

/// Logo branco (simbolo "Roda" + "volti") sobre o mapa escurecido no topo. O
/// simbolo se desenha na entrada (rodas, quadro, banco e guidao); com reduced
/// motion aparece pronto. A semantica fica no no estatico do hero.
class _Logo extends StatelessWidget {
  const _Logo();

  @override
  Widget build(BuildContext context) => VoltiLogo.animated(
    key: const Key('welcome-logo'),
    variant: VoltiLogoVariant.white,
    fontSize: 30,
    semanticLabel: null,
    shadows: [Shadow(color: VoltiColors.ink900.withValues(alpha: .35), blurRadius: 8)],
  );
}

/// Cartao branco de uma afirmacao (`hero-statement-{index}`): superficie, raio md,
/// sombra 1, icone verde num quadrado brand-soft, titulo e texto escuros. Usado no
/// carrossel do hero e, com texto grande ou reduced motion, na folha (escala com o
/// texto e quebra linha).
class HeroStatementCard extends StatelessWidget {
  const HeroStatementCard({super.key, required this.index, required this.data});
  final int index;
  final HeroStatementData data;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final text = Text(data.text, style: VoltiTypography.caption.copyWith(color: p.textSecondary));
    // Na folha, um no so com titulo e texto (no hero a camada e decorativa).
    return Semantics(
      container: true,
      label: data.label,
      excludeSemantics: true,
      child: _card(p, text),
    );
  }

  Widget _card(VoltiPalette p, Widget text) {
    return Container(
      key: Key('hero-statement-$index'),
      padding: const EdgeInsets.fromLTRB(10, 10, 14, 10),
      decoration: BoxDecoration(color: p.surfaceCard, borderRadius: VoltiRadii.rMd, boxShadow: VoltiShadows.shadow1),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            key: const Key('hero-statement-icon'),
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: p.brandSoft, borderRadius: VoltiRadii.rSm),
            child: Icon(data.icon, size: 18, color: p.textBrand),
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(data.title, style: VoltiTypography.bodyStrong.copyWith(color: p.textPrimary)),
                if (data.textIcon == null)
                  text
                else
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(data.textIcon, size: 13, color: p.textBrand),
                      const SizedBox(width: 4),
                      Flexible(child: text),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Velocidade constante a partir de [start] (px), sem fim.
class _MarqueeSimulation extends Simulation {
  _MarqueeSimulation(this.start);
  final double start;

  @override
  double x(double time) => start + kHeroMarqueeSpeed * time;

  @override
  double dx(double time) => kHeroMarqueeSpeed;

  @override
  bool isDone(double time) => false;
}

/// Faixa das afirmacoes. Com [scrolling], um marquee: os cartoes ficam em
/// sequencia (separados por [kHeroMarqueeGap], inclusive do ultimo para o
/// primeiro) e andam para a esquerda [offset] px; o render os pinta repetidos ate
/// cobrir a faixa, entao a volta nao tem fresta nem salto. Cada cartao existe uma
/// vez na arvore (as copias sao so pintura). Sem [scrolling] (reduced motion),
/// parado: so os primeiros cartoes que cabem inteiros. [onShown] recebe quantos
/// aparecem.
class HeroStatementsBand extends MultiChildRenderObjectWidget {
  const HeroStatementsBand({super.key, required this.offset, required this.scrolling, this.onShown, super.children});
  final Animation<double> offset;
  final bool scrolling;
  final ValueChanged<int>? onShown;

  @override
  RenderHeroStatements createRenderObject(BuildContext context) =>
      RenderHeroStatements(offset: offset, scrolling: scrolling, onShown: onShown);

  @override
  void updateRenderObject(BuildContext context, RenderHeroStatements renderObject) => renderObject
    ..offset = offset
    ..scrolling = scrolling
    ..onShown = onShown;
}

class HeroStatementsParentData extends ContainerBoxParentData<RenderBox> {}

/// Render do [HeroStatementsBand]. O marquee so repinta (sem layout por quadro).
class RenderHeroStatements extends RenderBox
    with ContainerRenderObjectMixin<RenderBox, HeroStatementsParentData>, RenderBoxContainerDefaultsMixin<RenderBox, HeroStatementsParentData> {
  RenderHeroStatements({required Animation<double> offset, required bool scrolling, ValueChanged<int>? onShown})
    : _offset = offset,
      _scrolling = scrolling,
      _onShown = onShown;

  /// Folga vertical (a sombra dos cartoes fica dentro da faixa e da mascara).
  static const vPad = 6.0;
  static const side = HeroLayoutDelegate.side;

  Animation<double> _offset;
  set offset(Animation<double> v) {
    if (v == _offset) return;
    if (attached) _offset.removeListener(markNeedsPaint);
    _offset = v;
    if (attached) _offset.addListener(markNeedsPaint);
    markNeedsPaint();
  }

  bool _scrolling;
  set scrolling(bool v) {
    if (v == _scrolling) return;
    _scrolling = v;
    markNeedsLayout();
  }

  ValueChanged<int>? _onShown;
  set onShown(ValueChanged<int>? v) => _onShown = v;

  double _cycle = 0;
  int _shown = 0;

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! HeroStatementsParentData) child.parentData = HeroStatementsParentData();
  }

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _offset.addListener(markNeedsPaint);
  }

  @override
  void detach() {
    _offset.removeListener(markNeedsPaint);
    super.detach();
  }

  @override
  void performLayout() {
    final width = constraints.maxWidth;
    final maxCard = math.max(0.0, width - 2 * side);
    final widths = <double>[];
    var height = 0.0;
    var child = firstChild;
    while (child != null) {
      child.layout(BoxConstraints(maxWidth: maxCard), parentUsesSize: true);
      widths.add(child.size.width);
      height = math.max(height, child.size.height);
      child = childAfter(child);
    }
    // Mesma altura para todos (o conteudo fica centrado).
    var x = side;
    var shown = 0;
    var i = 0;
    child = firstChild;
    while (child != null) {
      child.layout(BoxConstraints.tight(Size(widths[i], height)), parentUsesSize: true);
      (child.parentData! as HeroStatementsParentData).offset = Offset(x, vPad);
      if (_scrolling || x + widths[i] <= width - side + .01) {
        if (shown == i) shown++;
      }
      x += widths[i] + kHeroMarqueeGap;
      i++;
      child = childAfter(child);
    }
    _cycle = x - side;
    _shown = shown;
    size = constraints.constrain(Size(width, height + 2 * vPad));
    final cb = _onShown;
    if (cb != null) cb(shown);
  }

  /// Deslocamento atual dentro do ciclo (0 parado).
  double get _scroll => _scrolling && _cycle > 0 ? _offset.value % _cycle : 0;

  /// Onde cada cartao e pintado agora (indice, posicao local).
  List<({int index, RenderBox child, Offset at})> _placements() {
    final out = <({int index, RenderBox child, Offset at})>[];
    final width = size.width;
    final s = _scroll;
    var i = 0;
    var child = firstChild;
    while (child != null) {
      final base = (child.parentData! as HeroStatementsParentData).offset;
      if (!_scrolling) {
        if (i < _shown) out.add((index: i, child: child, at: base));
      } else {
        // Copias a cada ciclo, so as que cruzam a faixa.
        for (var x = base.dx - s - _cycle; x < width; x += _cycle) {
          if (x + child.size.width > 0) out.add((index: i, child: child, at: Offset(x, base.dy)));
        }
      }
      i++;
      child = childAfter(child);
    }
    return out;
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    if (_cycle <= 0 && _scrolling) return;
    final painted = <RenderBox>{};
    for (final p in _placements()) {
      // Um filho com camada propria nao pode ser pintado duas vezes: so a primeira copia.
      if (p.child.needsCompositing && !painted.add(p.child)) continue;
      context.paintChild(p.child, offset + p.at);
    }
  }

  @override
  void applyPaintTransform(RenderBox child, Matrix4 transform) {
    // Posicao da primeira copia visivel (os testes e o inspector a enxergam).
    final base = (child.parentData! as HeroStatementsParentData).offset;
    var x = base.dx - _scroll;
    if (_scrolling && x + child.size.width <= 0) x += _cycle;
    transform.translateByDouble(x, base.dy, 0, 1);
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) => false;

  @visibleForTesting
  List<({int index, Rect rect})> get debugPainted => [for (final p in _placements()) (index: p.index, rect: p.at & p.child.size)];

  @visibleForTesting
  double get debugOffset => _offset.value;

  @visibleForTesting
  double get debugCycle => _cycle;

  @visibleForTesting
  double get debugScroll => _scroll;

  @visibleForTesting
  int get debugShown => _shown;
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
        child: const Icon(LucideIcons.motorbike, color: VoltiColors.white, size: 15),
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
