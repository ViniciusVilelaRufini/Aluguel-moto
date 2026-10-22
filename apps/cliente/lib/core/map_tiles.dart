import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:volti_flutter/volti_flutter.dart';

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
/// linha de log em JSON com a URL e o erro (com o status HTTP); sem dado pessoal: a
/// URL so tem o tile (z/x/y), nao a posicao do cliente.
TileLayer voltiTileLayer(BuildContext context, {TileBuilder? tileBuilder}) {
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

/// Atribuicao do mapa no estilo do DS: pilula de vidro com legenda pequena.
class MapAttribution extends StatelessWidget {
  const MapAttribution({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('map-attribution'),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: const BoxDecoration(color: VoltiColors.glassBg, borderRadius: VoltiRadii.rPill),
      child: Text(
        kMapAttribution,
        style: const TextStyle(
          fontFamily: VoltiTypography.fontSans,
          fontWeight: VoltiTypography.fwMedium,
          fontSize: 10,
          height: 1.3,
          color: VoltiColors.ink600,
        ),
      ),
    );
  }
}
