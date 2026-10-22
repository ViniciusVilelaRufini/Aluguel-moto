//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'pickup_mode.g.dart';

/// `now` = retirar agora (prazo `pickupNowWindowMinutes`); `scheduled` = dia e hora agendados.
class PickupMode extends EnumClass {
  @BuiltValueEnumConst(wireName: r'now')
  static const PickupMode now = _$now;
  @BuiltValueEnumConst(wireName: r'scheduled')
  static const PickupMode scheduled = _$scheduled;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const PickupMode unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<PickupMode> get serializer => _$pickupModeSerializer;

  const PickupMode._(String name) : super(name);

  static BuiltSet<PickupMode> get values => _$values;
  static PickupMode valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class PickupModeMixin = Object with _$PickupModeMixin;
