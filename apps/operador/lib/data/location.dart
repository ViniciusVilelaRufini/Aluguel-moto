import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

/// Acesso a localizacao do aparelho.
enum LocationAccess {
  /// Ainda nao perguntado (ou negado uma vez: pode perguntar de novo).
  notAsked,
  granted,

  /// Negado de vez: so pelos ajustes do sistema.
  deniedForever,

  /// GPS desligado no aparelho.
  serviceDisabled,
}

class GeoPoint {
  const GeoPoint(this.lat, this.lng, {this.heading});

  final double lat;
  final double lng;

  /// Rumo em graus (0 = norte), quando o aparelho informa.
  final double? heading;
}

/// Abstrai o `geolocator` (testes usam um fake).
abstract class LocationService {
  Future<LocationAccess> check();

  /// Pede a permissao "durante o uso do app" (nunca em segundo plano).
  Future<LocationAccess> request();

  Stream<GeoPoint> watch();

  Future<bool> openSettings();
}

class GeolocatorLocationService implements LocationService {
  LocationAccess _map(LocationPermission p) => switch (p) {
        LocationPermission.always || LocationPermission.whileInUse => LocationAccess.granted,
        LocationPermission.deniedForever => LocationAccess.deniedForever,
        _ => LocationAccess.notAsked,
      };

  @override
  Future<LocationAccess> check() async {
    if (!await Geolocator.isLocationServiceEnabled()) return LocationAccess.serviceDisabled;
    return _map(await Geolocator.checkPermission());
  }

  @override
  Future<LocationAccess> request() async {
    if (!await Geolocator.isLocationServiceEnabled()) return LocationAccess.serviceDisabled;
    return _map(await Geolocator.requestPermission());
  }

  @override
  Stream<GeoPoint> watch() => Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10,
        ),
      ).map((p) => GeoPoint(p.latitude, p.longitude, heading: p.heading >= 0 ? p.heading : null));

  @override
  Future<bool> openSettings() async {
    final ok = await Geolocator.openAppSettings();
    return ok || await Geolocator.openLocationSettings();
  }
}

final locationServiceProvider =
    Provider<LocationService>((ref) => GeolocatorLocationService());

class LocationState {
  const LocationState({this.access = LocationAccess.notAsked, this.position, this.checked = false});

  final LocationAccess access;
  final GeoPoint? position;

  /// `true` depois da primeira verificacao de permissao.
  final bool checked;

  LocationState copyWith({LocationAccess? access, GeoPoint? position, bool? checked}) =>
      LocationState(
        access: access ?? this.access,
        position: position ?? this.position,
        checked: checked ?? this.checked,
      );
}

/// Ultima posicao conhecida (sobrevive ao autoDispose do [locationProvider]):
/// ao descobrir a lista, a distancia aparece na hora em vez de piscar.
class LastPositionController extends Notifier<(GeoPoint, DateTime)?> {
  @override
  (GeoPoint, DateTime)? build() => null;

  void set(GeoPoint p) => state = (p, DateTime.now());

  /// Posicao com no maximo [maxAge].
  GeoPoint? fresh({Duration maxAge = const Duration(minutes: 2)}) {
    final s = state;
    if (s == null || DateTime.now().difference(s.$2) > maxAge) return null;
    return s.$1;
  }
}

final lastPositionProvider =
    NotifierProvider<LastPositionController, (GeoPoint, DateTime)?>(LastPositionController.new);

/// Posicao do operador, so com o app em primeiro plano: o stream para quando
/// o app vai para segundo plano e volta ao retomar.
class LocationController extends Notifier<LocationState> {
  StreamSubscription<GeoPoint>? _sub;
  bool _foreground = true;

  /// `true` depois do onDispose: nenhuma continuacao assincrona assina o GPS
  /// nem escreve estado (evita assinatura orfa com o autoDispose).
  bool _disposed = false;

  LocationService get _service => ref.read(locationServiceProvider);

  @override
  LocationState build() {
    _disposed = false;
    final lifecycle = AppLifecycleListener(
      onResume: () {
        _foreground = true;
        unawaited(_refresh());
      },
      onHide: () {
        _foreground = false;
        _stop();
      },
    );
    ref.onDispose(() {
      _disposed = true;
      lifecycle.dispose();
      _stop();
    });
    unawaited(_refresh());
    return LocationState(position: ref.read(lastPositionProvider.notifier).fresh());
  }

  Future<void> _refresh() async {
    try {
      final access = await _service.check();
      if (_disposed) return;
      state = state.copyWith(access: access, checked: true);
      _apply();
    } catch (e) {
      debugPrint('localizacao indisponivel: $e');
      if (!_disposed) state = state.copyWith(checked: true);
    }
  }

  void _apply() {
    if (_disposed) return;
    if (state.access == LocationAccess.granted && _foreground) {
      _sub ??= _service.watch().listen(
            (p) {
              if (_disposed) return;
              ref.read(lastPositionProvider.notifier).set(p);
              state = state.copyWith(position: p);
            },
            onError: (Object e) => debugPrint('gps: $e'),
          );
    } else {
      _stop();
    }
  }

  void _stop() {
    _sub?.cancel();
    _sub = null;
  }

  /// Chamado depois de o operador ler a explicacao (rationale).
  Future<void> requestAccess() async {
    if (state.access == LocationAccess.deniedForever ||
        state.access == LocationAccess.serviceDisabled) {
      await _service.openSettings();
      return;
    }
    final access = await _service.request();
    if (_disposed) return;
    state = state.copyWith(access: access, checked: true);
    _apply();
  }
}

/// Some sozinho (e o GPS para) quando nenhuma tela visivel precisa de
/// distancia ou mapa: ver [watchLocationWhenVisible].
final locationProvider =
    NotifierProvider.autoDispose<LocationController, LocationState>(LocationController.new);

/// Observa a localizacao so enquanto a tela esta visivel. Rotas cobertas por
/// outra tela ficam com `TickerMode` desligado e soltam o provider; sem
/// ninguem observando, o stream do GPS e cancelado.
LocationState? watchLocationWhenVisible(WidgetRef ref, BuildContext context) =>
    TickerMode.valuesOf(context).enabled ? ref.watch(locationProvider) : null;
