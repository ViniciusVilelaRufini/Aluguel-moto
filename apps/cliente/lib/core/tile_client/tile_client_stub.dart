import 'package:http/http.dart' as http;

/// Cliente HTTP base dos tiles (web: o padrao do navegador).
http.Client createTileBaseClient() => http.Client();
