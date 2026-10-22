//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_status.g.dart';

/// Mesmas cores de `--status-*` do design system. Retirada em galpão: disponível = `free` com `depotId`; `reserved` = separada para uma reserva; `awaiting_pickup` = devolvida em ponto verde, esperando o operador recolher ao galpão (não alugável).
class VehicleStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'free')
  static const VehicleStatus free = _$free;
  @BuiltValueEnumConst(wireName: r'rented')
  static const VehicleStatus rented = _$rented;
  @BuiltValueEnumConst(wireName: r'reserved')
  static const VehicleStatus reserved = _$reserved;
  @BuiltValueEnumConst(wireName: r'paused')
  static const VehicleStatus paused = _$paused;
  @BuiltValueEnumConst(wireName: r'blocked')
  static const VehicleStatus blocked = _$blocked;
  @BuiltValueEnumConst(wireName: r'maintenance')
  static const VehicleStatus maintenance = _$maintenance;
  @BuiltValueEnumConst(wireName: r'offline')
  static const VehicleStatus offline = _$offline;
  @BuiltValueEnumConst(wireName: r'awaiting_pickup')
  static const VehicleStatus awaitingPickup = _$awaitingPickup;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const VehicleStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<VehicleStatus> get serializer => _$vehicleStatusSerializer;

  const VehicleStatus._(String name) : super(name);

  static BuiltSet<VehicleStatus> get values => _$values;
  static VehicleStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class VehicleStatusMixin = Object with _$VehicleStatusMixin;
