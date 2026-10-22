import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';

/// Cliente HTTP base dos tiles (Android/iOS): ate 6 conexoes simultaneas por host,
/// para um mapa grande nao abrir dezenas de conexoes de uma vez com o servidor.
http.Client createTileBaseClient() => IOClient(HttpClient()..maxConnectionsPerHost = 6);
