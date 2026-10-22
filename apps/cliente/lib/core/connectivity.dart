import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Fonte do estado da rede (connectivity_plus; falso nos testes).
abstract class ConnectivitySource {
  /// Estado atual: `true` com alguma interface de rede ativa.
  Future<bool> isOnline();

  /// Mudancas do estado.
  Stream<bool> get changes;
}

class PlatformConnectivitySource implements ConnectivitySource {
  final _c = Connectivity();
  static bool _online(List<ConnectivityResult> r) => r.any((e) => e != ConnectivityResult.none);

  @override
  Future<bool> isOnline() async {
    try {
      return _online(await _c.checkConnectivity());
    } catch (_) {
      // Sem o plugin (web antiga, testes): assume online em vez de travar o app com a faixa.
      return true;
    }
  }

  @override
  Stream<bool> get changes => _c.onConnectivityChanged.map(_online).handleError((Object _) {});
}

final connectivitySourceProvider = Provider<ConnectivitySource>((ref) => PlatformConnectivitySource());

/// `true` = online. Comeca online (sem faixa ate saber que caiu).
final onlineProvider = StreamProvider<bool>((ref) async* {
  final src = ref.watch(connectivitySourceProvider);
  yield await src.isOnline();
  yield* src.changes;
});
