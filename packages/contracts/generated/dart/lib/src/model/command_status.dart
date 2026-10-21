//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'command_status.g.dart';

class CommandStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'pending')
  static const CommandStatus pending = _$pending;
  @BuiltValueEnumConst(wireName: r'in_progress')
  static const CommandStatus inProgress = _$inProgress;
  @BuiltValueEnumConst(wireName: r'confirmed')
  static const CommandStatus confirmed = _$confirmed;
  @BuiltValueEnumConst(wireName: r'failed')
  static const CommandStatus failed = _$failed;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const CommandStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<CommandStatus> get serializer => _$commandStatusSerializer;

  const CommandStatus._(String name) : super(name);

  static BuiltSet<CommandStatus> get values => _$values;
  static CommandStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class CommandStatusMixin = Object with _$CommandStatusMixin;
