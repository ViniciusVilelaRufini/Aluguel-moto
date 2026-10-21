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

import 'backend.dart';

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

abstract class RealtimeService {
  Stream<RealtimeEvent> get events;
  Future<void> connect();
  void dispose();
}

class SocketRealtimeService implements RealtimeService {
  SocketRealtimeService({required this.baseUrl, required this.auth});
  final String baseUrl;
  final AuthRepository auth;
  final _controller = StreamController<RealtimeEvent>.broadcast();
  io.Socket? _socket;

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
    socket.connect();
    _socket = socket;
  }

  @override
  void dispose() {
    _socket?.dispose();
    _controller.close();
  }
}

/// Uma instancia por tela de aluguel (criada e descartada pelo controlador).
final realtimeFactoryProvider = Provider<RealtimeService Function()>((ref) {
  final baseUrl = ref.watch(apiBaseUrlProvider);
  final auth = ref.watch(authRepositoryProvider);
  return () => SocketRealtimeService(baseUrl: baseUrl, auth: auth);
});

// ---------------------------------------------------------------------------
// Localizacao (em segundo plano so durante o aluguel ativo)
// ---------------------------------------------------------------------------

abstract class LocationService {
  /// Pede a permissao em primeiro plano. `false` se negada.
  Future<bool> ensurePermission();
  Future<LatLng?> currentPosition();

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
  Future<LatLng?> currentPosition() async {
    if (!await ensurePermission()) return null;
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
/// Ponto de troca: implemente [CardTokenizer] com o SDK do Mercado Pago (CardForm) e
/// sobrescreva [cardTokenizerProvider] no `main.dart`.
class DevCardTokenizer implements CardTokenizer {
  @override
  Future<String?> tokenize(BuildContext context) async => 'tok_visa_4242';
}

final cardTokenizerProvider = Provider<CardTokenizer>((ref) => DevCardTokenizer());

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
