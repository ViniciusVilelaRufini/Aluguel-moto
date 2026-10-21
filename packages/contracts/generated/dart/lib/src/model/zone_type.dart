//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'zone_type.g.dart';

class ZoneType extends EnumClass {
  @BuiltValueEnumConst(wireName: r'operation')
  static const ZoneType operation = _$operation;
  @BuiltValueEnumConst(wireName: r'return')
  static const ZoneType return_ = _$return_;
  @BuiltValueEnumConst(wireName: r'forbidden')
  static const ZoneType forbidden = _$forbidden;
  @BuiltValueEnumConst(wireName: r'reduced_speed')
  static const ZoneType reducedSpeed = _$reducedSpeed;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const ZoneType unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<ZoneType> get serializer => _$zoneTypeSerializer;

  const ZoneType._(String name) : super(name);

  static BuiltSet<ZoneType> get values => _$values;
  static ZoneType valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class ZoneTypeMixin = Object with _$ZoneTypeMixin;
