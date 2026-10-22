import 'dart:convert';
import 'dart:developer' as developer;
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:volti_flutter/volti_flutter.dart';

import 'launcher.dart';

/// Base padrao de desenvolvimento: Esri World Light Gray Canvas (raster sem chave).
/// Atencao a ordem `{y}/{x}` do ArcGIS. **So dev/teste** (docs/decisoes.md): lancar
/// exige um provedor licenciado (MapTiler, Stadia ou Esri com chave) via
/// `MAP_TILE_URL`. O OSM publico e proibido para apps e o CARTO passou a exigir
/// chave (sem ela devolve um tile "API KEY" com status 200).
const kDevMapTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

/// Camada de rotulos (nomes de ruas) por cima da base de desenvolvimento.
const kDevMapReferenceUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';

/// Servidor de tiles raster de todos os mapas do app. Troca com
/// `--dart-define=MAP_TILE_URL=...` (placeholders `{z}`, `{x}`, `{y}` e, opcionais,
/// `{s}` = subdominio e `{r}` = `@2x` em telas densas).
const kMapTileUrl = String.fromEnvironment('MAP_TILE_URL', defaultValue: kDevMapTileUrl);

/// Camada opcional de rotulos por cima da base (`MAP_TILE_REFERENCE_URL`; vazio
/// desliga). Com um `MAP_TILE_URL` proprio e sem este define, fica desligada.
const kMapReferenceUrl = String.fromEnvironment(
  'MAP_TILE_REFERENCE_URL',
  defaultValue: kMapTileUrl == kDevMapTileUrl ? kDevMapReferenceUrl : '',
);

/// Subdominios de `{s}` (so usados se o template tiver `{s}`).
const kMapTileSubdomains = ['a', 'b', 'c'];

/// Atribuicao exigida pelo provedor e pelos dados. Troca com
/// `--dart-define=MAP_TILE_ATTRIBUTION=...` junto com o servidor.
const kMapAttribution = String.fromEnvironment(
  'MAP_TILE_ATTRIBUTION',
  defaultValue: 'Esri, HERE, Garmin, © OpenStreetMap contributors',
);

/// Hosts de basemaps publicos que so servem para dev/teste (nao podem ir para a loja).
const kDevTileHosts = ['server.arcgisonline.com', 'basemaps.cartocdn.com', 'tile.openstreetmap.org'];

/// O template usa um provedor de dev/teste (bloqueio de lancamento).
bool isDevTileProvider(String template) => kDevTileHosts.any(template.contains);

/// Coordenadas do tile (Web Mercator) que contem ([lat], [lng]) no [zoom].
(int x, int y) tileXY(double lat, double lng, int zoom) {
  final n = 1 << zoom;
  final x = ((lng + 180) / 360 * n).floor();
  final r = lat * math.pi / 180;
  final y = ((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n).floor();
  return (x, y);
}

/// URL de um tile a partir do template (`{s}` = primeiro subdominio, `{r}` vazio).
String tileUrl(String template, int z, int x, int y) => template
    .replaceAll('{s}', kMapTileSubdomains.first)
    .replaceAll('{z}', '$z')
    .replaceAll('{x}', '$x')
    .replaceAll('{y}', '$y')
    .replaceAll('{r}', '');

/// Tiles de lugares diferentes com bytes identicos = tile de aviso (ex.: o "API KEY"
/// do CARTO, que vem com status 200) e nao mapa.
bool tilesLookLikePlaceholder(List<Uint8List> bodies) {
  if (bodies.length < 2 || bodies.any((b) => b.isEmpty)) return false;
  final first = bodies.first;
  return bodies.skip(1).every((b) => listEquals(b, first));
}

/// Sonda de saude do provedor: baixa dois tiles de ruas diferentes de Sao Paulo
/// (Pinheiros e Av. Paulista, zoom 15). Devolve uma mensagem de problema (tile nao
/// imagem, erro HTTP ou tile de aviso repetido) ou `null` se parece mapa de verdade.
Future<String?> probeTileProvider(http.Client client, {String template = kMapTileUrl}) async {
  final coords = [tileXY(-23.5654, -46.6847, 15), tileXY(-23.5614, -46.6559, 15)];
  final bodies = <Uint8List>[];
  for (final (x, y) in coords) {
    final res = await client.get(Uri.parse(tileUrl(template, 15, x, y)), headers: {'User-Agent': kMapUserAgentPackage});
    final type = res.headers['content-type'] ?? '';
    if (res.statusCode != 200) return 'tile HTTP ${res.statusCode}';
    if (!type.startsWith('image/')) return 'tile nao e imagem ($type)';
    bodies.add(res.bodyBytes);
  }
  return tilesLookLikePlaceholder(bodies) ? 'tiles identicos em lugares diferentes (tile de aviso, ex.: falta de chave)' : null;
}

/// Avisos de inicializacao sobre os tiles: em release com provedor de dev, um aviso
/// no log do sistema (bloqueio de lancamento); em debug, a sonda acima.
Future<void> checkMapTilesAtStartup({http.Client? client}) async {
  if (kReleaseMode) {
    if (isDevTileProvider(kMapTileUrl)) {
      developer.log('Provedor de tiles de desenvolvimento em build release: troque MAP_TILE_URL por um provedor licenciado.',
          name: 'volti.map', level: 900);
    }
    return;
  }
  if (isDevTileProvider(kMapTileUrl)) {
    debugPrint(jsonEncode({'event': 'map.dev_provider', 'warning': 'tiles de dev/teste (bloqueio de lancamento)'}));
  }
  final c = client ?? http.Client();
  try {
    final problem = await probeTileProvider(c);
    if (problem != null) debugPrint(jsonEncode({'event': 'map.tile_probe_failed', 'problem': problem}));
  } catch (_) {
    // sem rede: o mapa mostra a ilustracao/fundo
  } finally {
    if (client == null) c.close();
  }
}

/// Id real do pacote (Android `applicationId`), mandado no User-Agent dos tiles.
const kMapUserAgentPackage = 'br.com.volti.volti_cliente';

/// So testes: troca o provedor de rede por um que devolve imagens locais.
@visibleForTesting
TileProvider Function()? debugTileProviderFactory;

/// Provedor de tiles de rede (ou o de teste). Sem `abortObsoleteRequests`: no
/// flutter_map 8, um pedido abortado (tile que saiu da faixa por um instante, ex.:
/// quando a camera se move logo apos abrir) "carrega" um PNG transparente e o tile
/// continua na tela vazio para sempre, sem erro nem nova tentativa: era a costura
/// vertical do hero no emulador (as colunas da direita ficavam transparentes).
TileProvider newTileProvider() => debugTileProviderFactory?.call() ?? NetworkTileProvider(abortObsoleteRequests: false);

/// Camada de tiles comum: servidor configuravel, `@2x` em telas densas, retentativa
/// (o `NetworkTileProvider` ja usa `RetryClient`) e tiles com erro descartados quando
/// saem da tela, para serem pedidos de novo ao voltar. Em debug, cada falha vira uma
/// linha de log em JSON com a URL e o erro (com o status HTTP). Atencao (LGPD): o
/// z/x/y do tile revela a regiao aproximada que o mapa mostra, que pode ser onde o
/// cliente esta; por isso o log so existe em debug (e o `main` cala o `debugPrint`
/// em release). [onError] avisa quem desenha o mapa (ex.: a boas-vindas troca pela
/// ilustracao quando os tiles nao carregam).
///
/// [provider] deve ser estavel entre reconstrucoes (o `VoltiMap` guarda um por
/// camada): um provedor novo a cada build trocaria o cliente HTTP no meio das
/// cargas. [reset] recarrega os tiles (nova tentativa dos que falharam).
TileLayer voltiTileLayer(
  BuildContext context, {
  String template = kMapTileUrl,
  TileProvider? provider,
  TileBuilder? tileBuilder,
  VoidCallback? onError,
  Stream<void>? reset,
}) {
  provider ??= newTileProvider();
  final p = provider;
  late final TileLayer layer;
  layer = TileLayer(
    urlTemplate: template,
    subdomains: kMapTileSubdomains,
    userAgentPackageName: kMapUserAgentPackage,
    // `@2x` so quando o provedor tem `{r}` (sem ele o flutter_map pediria 4x mais tiles).
    retinaMode: template.contains('{r}') && RetinaMode.isHighDensity(context),
    tileProvider: p,
    reset: reset,
    // Uma volta extra de tiles alem da tela (a deriva e o mapa maior que a caixa).
    panBuffer: 1,
    keepBuffer: 2,
    evictErrorTileStrategy: EvictErrorTileStrategy.notVisibleRespectMargin,
    errorTileCallback: (tile, error, _) {
      onError?.call();
      if (!kDebugMode) return;
      String url;
      try {
        url = p.getTileUrl(tile.coordinates, layer);
      } catch (_) {
        url = template;
      }
      debugPrint(jsonEncode({'event': 'map.tile_error', 'url': url, 'error': error.toString()}));
    },
    tileBuilder: tileBuilder,
  );
  return layer;
}

/// Pagina de direitos autorais dos dados do mapa (aberta ao tocar na atribuicao).
final kOsmCopyrightUri = Uri.parse('https://www.openstreetmap.org/copyright');

/// Atribuicao do mapa no estilo do DS: pilula de vidro com legenda pequena. Texto
/// escala ate 1,3x (cabe sobre o mapa); o toque abre a pagina de direitos do OSM.
class MapAttribution extends ConsumerWidget {
  const MapAttribution({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Semantics(
      link: true,
      label: kMapAttribution,
      excludeSemantics: true,
      child: GestureDetector(
        key: const Key('map-attribution'),
        behavior: HitTestBehavior.opaque,
        onTap: () async {
          try {
            await ref.read(urlLauncherProvider)(kOsmCopyrightUri);
          } catch (_) {}
        },
        // Area de toque maior que a pilula.
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: const BoxDecoration(color: VoltiColors.glassBg, borderRadius: VoltiRadii.rPill),
            child: MediaQuery.withClampedTextScaling(
              maxScaleFactor: 1.3,
              child: const Text(
                kMapAttribution,
                style: TextStyle(
                  fontFamily: VoltiTypography.fontSans,
                  fontWeight: VoltiTypography.fwMedium,
                  fontSize: 10,
                  height: 1.3,
                  color: VoltiColors.ink600,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
