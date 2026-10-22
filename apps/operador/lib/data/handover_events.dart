import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

/// `handover.updated` (`realtime.md`): aceite, disputa, cancelamento ou falha
/// no aceite (`lastError`, com a entrega ainda `pending_customer`).
class HandoverUpdate {
  const HandoverUpdate({required this.handoverId, required this.status, this.lastError});

  final String handoverId;
  final HandoverStatus status;
  final String? lastError;

  static HandoverUpdate? fromJson(Object? data) {
    final Map<String, dynamic> j;
    if (data is Map) {
      j = Map<String, dynamic>.from(data);
    } else if (data is String) {
      final decoded = jsonDecode(data);
      if (decoded is! Map) return null;
      j = Map<String, dynamic>.from(decoded);
    } else {
      return null;
    }
    final id = j['handoverId'];
    final status = j['status'];
    if (id is! String || status is! String) return null;
    final parsed = standardSerializers.deserializeWith(HandoverStatus.serializer, status) ??
        HandoverStatus.unknownDefaultOpenApi;
    return HandoverUpdate(
        handoverId: id, status: parsed, lastError: j['lastError'] as String?);
  }
}

/// Eventos das entregas do galpao (sala `depot:{id}`, entra ao conectar).
abstract class HandoverEvents {
  Stream<HandoverUpdate> get updates;

  /// `true` ao (re)conectar: a tela recarrega para nao perder eventos.
  Stream<bool> get connected;

  void dispose();
}

class SocketHandoverEvents implements HandoverEvents {
  SocketHandoverEvents({required this.baseUrl, required this.auth});

  final String baseUrl;
  final AuthRepository auth;
  final _updates = StreamController<HandoverUpdate>.broadcast();
  final _conn = StreamController<bool>.broadcast();
  io.Socket? _socket;
  bool _disposed = false;

  @override
  Stream<HandoverUpdate> get updates => _updates.stream;

  @override
  Stream<bool> get connected => _conn.stream;

  Future<void> connect() async {
    final token = await auth.accessToken();
    if (_disposed) return;
    final socket = io.io(
      '$baseUrl/realtime',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token ?? ''})
          .enableReconnection()
          .disableAutoConnect()
          .build(),
    );
    socket.onReconnectAttempt((_) async {
      socket.auth = {'token': await auth.accessToken() ?? ''};
    });
    socket.on('handover.updated', (d) {
      final u = HandoverUpdate.fromJson(d);
      if (u != null && !_updates.isClosed) _updates.add(u);
    });
    void conn(bool v) {
      if (!_conn.isClosed) _conn.add(v);
    }

    socket.onConnect((_) => conn(true));
    socket.onDisconnect((_) => conn(false));
    socket.onConnectError((_) => conn(false));
    socket.connect();
    _socket = socket;
  }

  @override
  void dispose() {
    _disposed = true;
    _socket?.dispose();
    _updates.close();
    _conn.close();
  }
}

/// Conecta so quando uma tela do galpao le o provider.
final handoverEventsProvider = Provider<HandoverEvents>((ref) {
  final events = SocketHandoverEvents(
    baseUrl: ref.watch(apiBaseUrlProvider),
    auth: ref.watch(authRepositoryProvider),
  );
  unawaited(events.connect());
  ref.onDispose(events.dispose);
  return events;
});
