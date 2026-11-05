//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'sim_card_status.g.dart';

class SimCardStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'active')
  static const SimCardStatus active = _$active;
  @BuiltValueEnumConst(wireName: r'suspended')
  static const SimCardStatus suspended = _$suspended;
  @BuiltValueEnumConst(wireName: r'cancelled')
  static const SimCardStatus cancelled = _$cancelled;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const SimCardStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<SimCardStatus> get serializer => _$simCardStatusSerializer;

  const SimCardStatus._(String name) : super(name);

  static BuiltSet<SimCardStatus> get values => _$values;
  static SimCardStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class SimCardStatusMixin = Object with _$SimCardStatusMixin;
