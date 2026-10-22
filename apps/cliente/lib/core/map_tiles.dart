import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'launcher.dart';

/// Servidor de tiles raster de todos os mapas do app. O servidor publico do
/// OpenStreetMap (`tile.openstreetmap.org`) nao pode ser usado por apps (politica
/// de uso de tiles da OSMF) e corta quem usa muito; o padrao e o CARTO Voyager.
/// Troca com `--dart-define=MAP_TILE_URL=...` (placeholders `{z}`, `{x}`, `{y}` e,
/// opcionais, `{s}` = subdominio e `{r}` = `@2x` em telas densas).
const kMapTileUrl = String.fromEnvironment(
  'MAP_TILE_URL',
  defaultValue: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
);

/// Subdominios de `{s}` (os do CARTO).
const kMapTileSubdomains = ['a', 'b', 'c'];

/// Atribuicao exigida pelos dados (ODbL) e pelo provedor. Troca com
/// `--dart-define=MAP_ATTRIBUTION=...` junto com o servidor.
const kMapAttribution = String.fromEnvironment(
  'MAP_ATTRIBUTION',
  defaultValue: '© OpenStreetMap contributors © CARTO',
);

/// Id real do pacote (Android `applicationId`), mandado no User-Agent dos tiles.
const kMapUserAgentPackage = 'br.com.volti.volti_cliente';

/// Camada de tiles comum: servidor configuravel, `@2x` em telas densas, retentativa
/// (o `NetworkTileProvider` ja usa `RetryClient`) e tiles com erro descartados quando
/// saem da tela, para serem pedidos de novo ao voltar. Em debug, cada falha vira uma
/// linha de log em JSON com a URL e o erro (com o status HTTP). Atencao (LGPD): o
/// z/x/y do tile revela a regiao aproximada que o mapa mostra, que pode ser onde o
/// cliente esta; por isso o log so existe em debug (e o `main` cala o `debugPrint`
/// em release). [onError] avisa quem desenha o mapa (ex.: a boas-vindas troca pela
/// ilustracao quando os tiles nao carregam).
TileLayer voltiTileLayer(BuildContext context, {TileBuilder? tileBuilder, VoidCallback? onError}) {
  final provider = NetworkTileProvider();
  late final TileLayer layer;
  layer = TileLayer(
    urlTemplate: kMapTileUrl,
    subdomains: kMapTileSubdomains,
    userAgentPackageName: kMapUserAgentPackage,
    retinaMode: RetinaMode.isHighDensity(context),
    tileProvider: provider,
    evictErrorTileStrategy: EvictErrorTileStrategy.notVisibleRespectMargin,
    errorTileCallback: (tile, error, _) {
      onError?.call();
      if (!kDebugMode) return;
      String url;
      try {
        url = provider.getTileUrl(tile.coordinates, layer);
      } catch (_) {
        url = kMapTileUrl;
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
