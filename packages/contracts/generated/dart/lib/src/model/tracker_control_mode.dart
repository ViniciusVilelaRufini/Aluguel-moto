//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'tracker_control_mode.g.dart';

/// Capacidade do rastreador. `speed_control` (padrão): limita velocidade e faz o bloqueio seguro com rampa (firmware F1–F12). `relay_only` (ex.: Concox J16, protocolo GT06 via Traccar): só rastreia e corta pelo relé — o `lock` espera a moto parar (2 telemetrias frescas < 3 km/h cobrindo pelo menos 10 s) e então corta; limites de zona viram aviso ao cliente e alerta `zone_speed_exceeded`; o limite de 32 km/h fica com o controlador da moto.
class TrackerControlMode extends EnumClass {
  @BuiltValueEnumConst(wireName: r'speed_control')
  static const TrackerControlMode speedControl = _$speedControl;
  @BuiltValueEnumConst(wireName: r'relay_only')
  static const TrackerControlMode relayOnly = _$relayOnly;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const TrackerControlMode unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<TrackerControlMode> get serializer =>
      _$trackerControlModeSerializer;

  const TrackerControlMode._(String name) : super(name);

  static BuiltSet<TrackerControlMode> get values => _$values;
  static TrackerControlMode valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class TrackerControlModeMixin = Object with _$TrackerControlModeMixin;
