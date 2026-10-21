//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'command_type.g.dart';

class CommandType extends EnumClass {
  @BuiltValueEnumConst(wireName: r'lock')
  static const CommandType lock = _$lock;
  @BuiltValueEnumConst(wireName: r'unlock')
  static const CommandType unlock = _$unlock;
  @BuiltValueEnumConst(wireName: r'horn')
  static const CommandType horn = _$horn;
  @BuiltValueEnumConst(wireName: r'speed_limit')
  static const CommandType speedLimit = _$speedLimit;
  @BuiltValueEnumConst(wireName: r'stolen_mode')
  static const CommandType stolenMode = _$stolenMode;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const CommandType unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<CommandType> get serializer => _$commandTypeSerializer;

  const CommandType._(String name) : super(name);

  static BuiltSet<CommandType> get values => _$values;
  static CommandType valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class CommandTypeMixin = Object with _$CommandTypeMixin;
