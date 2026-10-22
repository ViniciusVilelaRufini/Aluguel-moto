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
