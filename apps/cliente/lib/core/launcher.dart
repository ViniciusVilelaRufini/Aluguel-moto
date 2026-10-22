import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

/// Abre um link fora do app (PDF, SMS, telefone). Devolve `false` se nenhum app abriu.
typedef UrlOpener = Future<bool> Function(Uri uri);

/// Abre a folha de compartilhar do sistema com um texto.
typedef TextSharer = Future<void> Function(String text);

final urlLauncherProvider = Provider<UrlOpener>((ref) => (uri) => launchUrl(uri, mode: LaunchMode.externalApplication));

final shareTextProvider = Provider<TextSharer>((ref) => (text) async {
      await SharePlus.instance.share(ShareParams(text: text));
    });

/// `sms:+5511...?body=...` para mandar o texto direto a um numero.
Uri smsUri(String phone, String body) => Uri(scheme: 'sms', path: phone, queryParameters: {'body': body});

/// Rota ate ([lat], [lng]) no app de mapas do aparelho ("Como chegar" ao
/// galpao), em ordem de preferencia: o app nativo da plataforma e, por ultimo, o
/// Google Maps na web (abre em qualquer aparelho). So o destino vai no link; a
/// posicao do cliente nao sai do aparelho (o app de mapas usa a dele). O modo
/// de transporte fica a criterio do cliente no app de mapas.
List<Uri> directionsUris(double lat, double lng, {TargetPlatform? platform}) {
  final p = platform ?? defaultTargetPlatform;
  final dest = '$lat,$lng';
  final web = Uri.https('www.google.com', '/maps/dir/', {'api': '1', 'destination': dest});
  return [
    if (p == TargetPlatform.android) Uri.parse('google.navigation:q=$dest'),
    if (p == TargetPlatform.iOS) Uri.https('maps.apple.com', '/', {'daddr': dest}),
    web,
  ];
}

/// Tenta cada link ate um abrir (erro do plugin conta como "nao abriu").
Future<bool> openDirections(UrlOpener open, double lat, double lng, {TargetPlatform? platform}) async {
  for (final uri in directionsUris(lat, lng, platform: platform)) {
    try {
      if (await open(uri)) return true;
    } catch (_) {}
  }
  return false;
}
