import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

/// Abre URLs fora do app (app de mapas). Falso nos testes.
abstract class ExternalLauncher {
  Future<bool> open(Uri uri);
}

class UrlExternalLauncher implements ExternalLauncher {
  @override
  Future<bool> open(Uri uri) async {
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  }
}

final externalLauncherProvider = Provider<ExternalLauncher>((ref) => UrlExternalLauncher());

/// Rota a pe ate ([lat], [lng]) no app de mapas do aparelho, em ordem de
/// preferencia: o app nativo da plataforma e, por ultimo, o Google Maps na web
/// (abre em qualquer aparelho). So a moto vai no link; a posicao do cliente
/// nao sai do aparelho (o app de mapas usa a dele).
List<Uri> walkingRouteUris(double lat, double lng, {TargetPlatform? platform}) {
  final p = platform ?? defaultTargetPlatform;
  final dest = '$lat,$lng';
  final web = Uri.https('www.google.com', '/maps/dir/', {'api': '1', 'destination': dest, 'travelmode': 'walking'});
  return [
    if (p == TargetPlatform.android) Uri.parse('google.navigation:q=$dest&mode=w'),
    if (p == TargetPlatform.iOS) Uri.https('maps.apple.com', '/', {'daddr': dest, 'dirflg': 'w'}),
    web,
  ];
}

/// Tenta cada link ate um abrir.
Future<bool> openWalkingRoute(ExternalLauncher launcher, double lat, double lng, {TargetPlatform? platform}) async {
  for (final uri in walkingRouteUris(lat, lng, platform: platform)) {
    if (await launcher.open(uri)) return true;
  }
  return false;
}
