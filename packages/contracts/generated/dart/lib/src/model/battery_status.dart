//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'battery_status.g.dart';

/// `in_vehicle` instalada numa moto; `in_van` na van de um operador; `charging` carregando (no galpão `depotId` ou na estação `stationId`); `charged` carregada e pronta no galpão; `in_station` na estação de troca; `defective` com defeito, fora de uso; `retired` baixada.
class BatteryStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'in_vehicle')
  static const BatteryStatus inVehicle = _$inVehicle;
  @BuiltValueEnumConst(wireName: r'in_van')
  static const BatteryStatus inVan = _$inVan;
  @BuiltValueEnumConst(wireName: r'charging')
  static const BatteryStatus charging = _$charging;
  @BuiltValueEnumConst(wireName: r'in_station')
  static const BatteryStatus inStation = _$inStation;
  @BuiltValueEnumConst(wireName: r'retired')
  static const BatteryStatus retired = _$retired;
  @BuiltValueEnumConst(wireName: r'charged')
  static const BatteryStatus charged = _$charged;
  @BuiltValueEnumConst(wireName: r'defective')
  static const BatteryStatus defective = _$defective;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const BatteryStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<BatteryStatus> get serializer => _$batteryStatusSerializer;

  const BatteryStatus._(String name) : super(name);

  static BuiltSet<BatteryStatus> get values => _$values;
  static BatteryStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class BatteryStatusMixin = Object with _$BatteryStatusMixin;
