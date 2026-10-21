//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'rental_status.g.dart';

class RentalStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'active')
  static const RentalStatus active = _$active;
  @BuiltValueEnumConst(wireName: r'paused')
  static const RentalStatus paused = _$paused;
  @BuiltValueEnumConst(wireName: r'ending')
  static const RentalStatus ending = _$ending;
  @BuiltValueEnumConst(wireName: r'ended')
  static const RentalStatus ended = _$ended;
  @BuiltValueEnumConst(wireName: r'force_ended')
  static const RentalStatus forceEnded = _$forceEnded;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const RentalStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<RentalStatus> get serializer => _$rentalStatusSerializer;

  const RentalStatus._(String name) : super(name);

  static BuiltSet<RentalStatus> get values => _$values;
  static RentalStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class RentalStatusMixin = Object with _$RentalStatusMixin;
