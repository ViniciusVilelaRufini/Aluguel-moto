import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

/// Abre um link fora do app (PDF, SMS, telefone). Devolve `false` se nenhum app abriu.
typedef UrlOpener = Future<bool> Function(Uri uri);

/// Abre a folha de compartilhar do sistema com um texto.
typedef TextSharer = Future<void> Function(String text);

/// Termos de uso e politica de privacidade publicados (links do rodape da
/// boas-vindas). O app ainda nao tem paginas proprias nem URL fixa: cada
/// ambiente passa `--dart-define=TERMS_URL=...` e `PRIVACY_URL=...`; sem o
/// define, o link avisa que o documento nao esta publicado neste ambiente.
class LegalLinks {
  const LegalLinks({this.terms, this.privacy});
  final Uri? terms, privacy;
}

const kTermsUrl = String.fromEnvironment('TERMS_URL');
const kPrivacyUrl = String.fromEnvironment('PRIVACY_URL');

Uri? _httpsUri(String raw) {
  final u = Uri.tryParse(raw.trim());
  return u != null && (u.scheme == 'https' || u.scheme == 'http') && u.host.isNotEmpty ? u : null;
}

final legalLinksProvider = Provider<LegalLinks>((ref) => LegalLinks(terms: _httpsUri(kTermsUrl), privacy: _httpsUri(kPrivacyUrl)));

final urlLauncherProvider = Provider<UrlOpener>((ref) => (uri) => launchUrl(uri, mode: LaunchMode.externalApplication));

final shareTextProvider = Provider<TextSharer>((ref) => (text) async {
      await SharePlus.instance.share(ShareParams(text: text));
    });

/// `sms:+5511...?body=...` para mandar o texto direto a um numero.
Uri smsUri(String phone, String body) => Uri(scheme: 'sms', path: phone, queryParameters: {'body': body});

/// Rota ate ([lat], [lng]) no app de mapas ("Como chegar" ao galpao). No
/// Android, primeiro `geo:` (o sistema oferece os apps de mapas instalados);
/// por ultimo, o Google Maps na web (`/maps/dir/?api=1`), que abre em qualquer
/// aparelho. So o destino vai no link; a posicao do cliente nao sai do aparelho.
List<Uri> directionsUris(double lat, double lng, {TargetPlatform? platform}) {
  final p = platform ?? defaultTargetPlatform;
  final dest = '$lat,$lng';
  return [
    if (p == TargetPlatform.android) Uri.parse('geo:$dest?q=$dest'),
    Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$dest'),
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
