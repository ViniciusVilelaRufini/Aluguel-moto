import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:volti_api/volti_api.dart' show DevicePlatform;
import 'package:volti_flutter/volti_flutter.dart';

import '../features/payments/card_form_sheet.dart';
import 'backend.dart';
import 'mercadopago_gateway.dart';

// ---------------------------------------------------------------------------
// Tempo real (Socket.IO, namespace /realtime, sala rental:{id})
// ---------------------------------------------------------------------------

sealed class RealtimeEvent {
  const RealtimeEvent();
}

class RentalUpdated extends RealtimeEvent {
  const RentalUpdated({required this.rentalId, required this.status, required this.elapsedSeconds, required this.costCents});
  final String rentalId;
  final String status;
  final int elapsedSeconds;
  final int costCents;
}

class VehiclePositionEvent extends RealtimeEvent {
  const VehiclePositionEvent({
    required this.lat,
    required this.lng,
    required this.speedKmh,
    required this.batteryPct,
    required this.speedLimitKmh,
  });
  final double lat;
  final double lng;
  final double speedKmh;
  final int batteryPct;
  final int speedLimitKmh;
}

class ZoneNotice extends RealtimeEvent {
  const ZoneNotice({required this.zoneType, required this.transition, required this.message, this.speedLimitKmh});
  final String zoneType;
  final String transition;
  final String message;
  final int? speedLimitKmh;
}

class DeviceEventReceived extends RealtimeEvent {
  const DeviceEventReceived({required this.type});
  final String type;
}

/// Entrega de saida criada pelo operador (sala `customer:{id}`): abre "Confira sua moto".
class HandoverPending extends RealtimeEvent {
  const HandoverPending({required this.handoverId, required this.reservationId});
  final String handoverId;
  final String reservationId;
}

/// Entrega mudou de status (ou o aceite falhou, com [lastError]). Chegada no
/// galpao (`return_depot`) tambem chega aqui.
class HandoverUpdated extends RealtimeEvent {
  const HandoverUpdated({required this.handoverId, required this.status, this.lastError});
  final String handoverId;

  /// `pending_customer`, `accepted`, `disputed` ou `canceled`.
  final String status;
  final String? lastError;
}

/// Troca de bateria na estacao mudou de status (sala `customer:{id}`, so o
/// dono). [status] e o nome do fio (`awaiting_return`, `completed`...);
/// detalhes (vaga, prazo, motivo) pelo GET da troca.
class StationSwapUpdated extends RealtimeEvent {
  const StationSwapUpdated({required this.swapId, required this.status});
  final String swapId;
  final String status;
}

abstract class RealtimeService {
  Stream<RealtimeEvent> get events;

  /// `false` quando a conexao cai ou falha (o socket reconecta sozinho).
  Stream<bool> get connected;
  Future<void> connect();
  void dispose();
}

class SocketRealtimeService implements RealtimeService {
  SocketRealtimeService({required this.baseUrl, required this.auth});
  final String baseUrl;
  final AuthRepository auth;
  final _controller = StreamController<RealtimeEvent>.broadcast();
  final _conn = StreamController<bool>.broadcast();
  io.Socket? _socket;

  @override
  Stream<bool> get connected => _conn.stream;

  @override
  Stream<RealtimeEvent> get events => _controller.stream;

  @override
  Future<void> connect() async {
    final token = await auth.accessToken();
    final socket = io.io(
      '$baseUrl/realtime',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token ?? ''})
          .enableReconnection()
          .disableAutoConnect()
          .build(),
    );
    // Reconecta com o token atual (pode ter sido renovado).
    socket.onReconnectAttempt((_) async {
      socket.auth = {'token': await auth.accessToken() ?? ''};
    });
    Map<String, dynamic> m(dynamic d) => d is Map ? Map<String, dynamic>.from(d) : jsonDecode(d.toString());
    socket.on('rental.updated', (d) {
      final j = m(d);
      _controller.add(RentalUpdated(
        rentalId: j['rentalId'] as String,
        status: j['status'] as String,
        elapsedSeconds: (j['elapsedSeconds'] as num).toInt(),
        costCents: (j['costCents'] as num).toInt(),
      ));
    });
    socket.on('vehicle.position', (d) {
      final j = m(d);
      _controller.add(VehiclePositionEvent(
        lat: (j['lat'] as num).toDouble(),
        lng: (j['lng'] as num).toDouble(),
        speedKmh: (j['speedKmh'] as num).toDouble(),
        batteryPct: (j['batteryPct'] as num).toInt(),
        speedLimitKmh: (j['speedLimitKmh'] as num).toInt(),
      ));
    });
    socket.on('zone.notice', (d) {
      final j = m(d);
      _controller.add(ZoneNotice(
        zoneType: j['zoneType'] as String,
        transition: j['transition'] as String,
        message: (j['message'] ?? '') as String,
        speedLimitKmh: (j['speedLimitKmh'] as num?)?.toInt(),
      ));
    });
    socket.on('device.event', (d) {
      final j = m(d);
      _controller.add(DeviceEventReceived(type: j['type'] as String));
    });
    socket.on('handover.pending', (d) {
      final j = m(d);
      _controller.add(HandoverPending(handoverId: j['handoverId'] as String, reservationId: j['reservationId'] as String));
    });
    socket.on('handover.updated', (d) {
      final j = m(d);
      _controller.add(HandoverUpdated(
        handoverId: j['handoverId'] as String,
        status: j['status'] as String,
        lastError: j['lastError'] as String?,
      ));
    });
    socket.on('station_swap.updated', (d) {
      final j = m(d);
      _controller.add(StationSwapUpdated(swapId: j['swapId'] as String, status: j['status'] as String));
    });
    socket.onConnect((_) => _conn.add(true));
    socket.onDisconnect((_) => _conn.add(false));
    socket.onConnectError((_) => _conn.add(false));
    socket.connect();
    _socket = socket;
  }

  @override
  void dispose() {
    _socket?.dispose();
    _controller.close();
    _conn.close();
  }
}

/// Uma instancia por tela de aluguel (criada e descartada pelo controlador).
final realtimeFactoryProvider = Provider<RealtimeService Function()>((ref) {
  final baseUrl = ref.watch(apiBaseUrlProvider);
  final auth = ref.watch(authRepositoryProvider);
  return () => SocketRealtimeService(baseUrl: baseUrl, auth: auth);
});

/// Conexao do cliente fora da corrida (reserva, entrega, devolucao no galpao):
/// a API poe o socket na sala `customer:{id}`. Uma so enquanto alguma tela ouve.
final customerRealtimeProvider = Provider.autoDispose<RealtimeService>((ref) {
  final rt = ref.watch(realtimeFactoryProvider)();
  ref.onDispose(rt.dispose);
  // Sem tempo real a tela segue pelo GET (e pela consulta periodica de quem usa).
  rt.connect().catchError((Object _) {});
  return rt;
});

/// Eventos da [customerRealtimeProvider] (cada evento e um valor novo).
final customerEventsProvider = StreamProvider.autoDispose<RealtimeEvent>((ref) => ref.watch(customerRealtimeProvider).events);

// ---------------------------------------------------------------------------
// Localizacao (em segundo plano so durante o aluguel ativo)
// ---------------------------------------------------------------------------

abstract class LocationService {
  /// Pede a permissao em primeiro plano. `false` se negada.
  Future<bool> ensurePermission();

  /// Permissao ja concedida? Nunca abre o dialogo do sistema.
  Future<bool> hasPermission();

  /// Posicao atual. So pede permissao se [requestPermission] for true.
  Future<LatLng?> currentPosition({bool requestPermission = false});

  /// Rastreio que continua com o app em segundo plano. Cancele a assinatura ao encerrar o aluguel.
  Stream<LatLng> trackDuringRental({required String notificationTitle, required String notificationText});
}

class GeolocatorLocationService implements LocationService {
  @override
  Future<bool> ensurePermission() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return false;
      var p = await Geolocator.checkPermission();
      if (p == LocationPermission.denied) p = await Geolocator.requestPermission();
      return p == LocationPermission.always || p == LocationPermission.whileInUse;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<bool> hasPermission() async {
    try {
      final p = await Geolocator.checkPermission();
      return p == LocationPermission.always || p == LocationPermission.whileInUse;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<LatLng?> currentPosition({bool requestPermission = false}) async {
    if (requestPermission ? !await ensurePermission() : !await hasPermission()) return null;
    try {
      final p = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 8)),
      );
      return LatLng(p.latitude, p.longitude);
    } catch (_) {
      return null;
    }
  }

  @override
  Stream<LatLng> trackDuringRental({required String notificationTitle, required String notificationText}) {
    final LocationSettings settings;
    if (kIsWeb) {
      settings = const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 10);
    } else if (defaultTargetPlatform == TargetPlatform.android) {
      settings = AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
        foregroundNotificationConfig: ForegroundNotificationConfig(
          notificationTitle: notificationTitle,
          notificationText: notificationText,
          enableWakeLock: true,
        ),
      );
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      settings = AppleSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
        activityType: ActivityType.otherNavigation,
        allowBackgroundLocationUpdates: true,
        showBackgroundLocationIndicator: true,
        pauseLocationUpdatesAutomatically: false,
      );
    } else {
      settings = const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 10);
    }
    return Geolocator.getPositionStream(locationSettings: settings).map((p) => LatLng(p.latitude, p.longitude));
  }
}

final locationServiceProvider = Provider<LocationService>((ref) => GeolocatorLocationService());

// ---------------------------------------------------------------------------
// Push (Firebase Cloud Messaging) atras de interface
// ---------------------------------------------------------------------------

abstract class PushService {
  /// Registra o token FCM na API. Sem Firebase configurado, nao faz nada.
  Future<void> register(Backend backend);
}

class NoopPushService implements PushService {
  @override
  Future<void> register(Backend backend) async {}
}

class FirebasePushService implements PushService {
  @override
  Future<void> register(Backend backend) async {
    if (kIsWeb) return;
    try {
      // Falha sem google-services.json / GoogleService-Info.plist: o app segue sem push.
      if (Firebase.apps.isEmpty) await Firebase.initializeApp();
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
      final platform = defaultTargetPlatform == TargetPlatform.iOS ? DevicePlatform.ios : DevicePlatform.android;
      final token = await messaging.getToken();
      if (token != null) await backend.registerDevice(token, platform);
      messaging.onTokenRefresh.listen((t) => backend.registerDevice(t, platform).catchError((_) {}));
    } catch (e) {
      debugPrint('Push desativado: $e');
    }
  }
}

final pushServiceProvider = Provider<PushService>((ref) => FirebasePushService());

// ---------------------------------------------------------------------------
// Tokenizacao de cartao (nunca enviar numero de cartao a API)
// ---------------------------------------------------------------------------

abstract class CardTokenizer {
  /// Coleta o cartao pelo SDK do gateway e devolve so o token. `null` se o cliente cancelou.
  Future<String?> tokenize(BuildContext context);
}

/// Implementacao de desenvolvimento: devolve o token de teste do gateway falso (`PAYMENT_PROVIDER=fake`).
/// So e usada fora de release e sem `MP_PUBLIC_KEY`.
class DevCardTokenizer implements CardTokenizer {
  @override
  Future<String?> tokenize(BuildContext context) async => 'tok_visa_4242';
}

/// Tokenizador real: abre o formulario de cartao e envia os dados DIRETO ao
/// Mercado Pago (chave publica). So o token volta para o app e segue para a API.
class MercadoPagoCardTokenizer implements CardTokenizer {
  MercadoPagoCardTokenizer(this.gateway);
  final MercadoPagoGateway gateway;

  @override
  Future<String?> tokenize(BuildContext context) => CardFormSheet.show(context, submit: gateway.createToken);
}

/// `--dart-define=MP_PUBLIC_KEY=TEST-...` (chave PUBLICA do Mercado Pago; nunca o access token).
const kMpPublicKey = String.fromEnvironment('MP_PUBLIC_KEY');

/// Com chave: tokenizador real. Sem chave: o de desenvolvimento; em release isso e
/// erro de configuracao (o `main` ja barra antes), entao falha alto em vez de usar token falso.
CardTokenizer selectCardTokenizer({required String publicKey, required bool isRelease, MercadoPagoGateway? gateway}) {
  final key = publicKey.trim();
  if (key.isNotEmpty) return MercadoPagoCardTokenizer(gateway ?? MercadoPagoGateway(publicKey: key));
  if (isRelease) throw StateError('MP_PUBLIC_KEY ausente em release');
  return DevCardTokenizer();
}

final cardTokenizerProvider = Provider<CardTokenizer>(
  (ref) => selectCardTokenizer(publicKey: kMpPublicKey, isRelease: kReleaseMode),
);

// ---------------------------------------------------------------------------
// Camera / galeria
// ---------------------------------------------------------------------------

abstract class PhotoPicker {
  Future<Uint8List?> take({bool front = false});
}

class ImagePickerPhotoPicker implements PhotoPicker {
  final _picker = ImagePicker();

  @override
  Future<Uint8List?> take({bool front = false}) async {
    final f = await _picker.pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: front ? CameraDevice.front : CameraDevice.rear,
      maxWidth: 1600,
      imageQuality: 85,
    );
    return f?.readAsBytes();
  }
}

final photoPickerProvider = Provider<PhotoPicker>((ref) => ImagePickerPhotoPicker());
