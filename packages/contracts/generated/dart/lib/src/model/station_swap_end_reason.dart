//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'station_swap_end_reason.g.dart';

/// Por que a troca terminou sem `completed`: cancelada pelo cliente; vaga fechada sem bateria; estação não abriu a vaga em 3 min (`failed`); cliente não devolveu em 3 min (`canceled`); estação não liberou a carregada em 3 min depois da devolução (`failed`, abre alerta para a operação); bateria devolvida depois do cancelamento/prazo sem carregada para liberar (`failed`, alerta: a operação leva uma bateria); bateria devolvida ou liberada consta instalada em outra moto (`failed`, alerta: conferir a estação). Uma devolução que chega depois de `canceled_by_customer`, `return_timeout` ou `station_timeout` vale: a troca volta para `releasing` (sem `endReason`) e a estação libera uma carregada.
class StationSwapEndReason extends EnumClass {
  @BuiltValueEnumConst(wireName: r'canceled_by_customer')
  static const StationSwapEndReason canceledByCustomer = _$canceledByCustomer;
  @BuiltValueEnumConst(wireName: r'slot_closed_without_return')
  static const StationSwapEndReason slotClosedWithoutReturn =
      _$slotClosedWithoutReturn;
  @BuiltValueEnumConst(wireName: r'station_timeout')
  static const StationSwapEndReason stationTimeout = _$stationTimeout;
  @BuiltValueEnumConst(wireName: r'return_timeout')
  static const StationSwapEndReason returnTimeout = _$returnTimeout;
  @BuiltValueEnumConst(wireName: r'release_timeout')
  static const StationSwapEndReason releaseTimeout = _$releaseTimeout;
  @BuiltValueEnumConst(wireName: r'no_battery_after_return')
  static const StationSwapEndReason noBatteryAfterReturn =
      _$noBatteryAfterReturn;
  @BuiltValueEnumConst(wireName: r'serial_mismatch')
  static const StationSwapEndReason serialMismatch = _$serialMismatch;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const StationSwapEndReason unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<StationSwapEndReason> get serializer =>
      _$stationSwapEndReasonSerializer;

  const StationSwapEndReason._(String name) : super(name);

  static BuiltSet<StationSwapEndReason> get values => _$values;
  static StationSwapEndReason valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class StationSwapEndReasonMixin = Object
    with _$StationSwapEndReasonMixin;
