//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'command_status_reason.g.dart';

/// Motivo do estado do comando (`CommandOutcome.reason` da porta IoT). No WebSocket `command.updated` aparece como `reason`.
class CommandStatusReason extends EnumClass {
  @BuiltValueEnumConst(wireName: r'offline')
  static const CommandStatusReason offline = _$offline;
  @BuiltValueEnumConst(wireName: r'timeout')
  static const CommandStatusReason timeout = _$timeout;
  @BuiltValueEnumConst(wireName: r'did_not_stop')
  static const CommandStatusReason didNotStop = _$didNotStop;
  @BuiltValueEnumConst(wireName: r'invalid_limit')
  static const CommandStatusReason invalidLimit = _$invalidLimit;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const CommandStatusReason unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<CommandStatusReason> get serializer =>
      _$commandStatusReasonSerializer;

  const CommandStatusReason._(String name) : super(name);

  static BuiltSet<CommandStatusReason> get values => _$values;
  static CommandStatusReason valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class CommandStatusReasonMixin = Object
    with _$CommandStatusReasonMixin;
