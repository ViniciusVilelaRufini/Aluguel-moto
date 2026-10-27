//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'command_status_reason.g.dart';

/// Motivo do estado do comando (`CommandOutcome.reason` da porta IoT). No WebSocket `command.updated` aparece como `reason`. `locked_by_staff`: destravar pedido por cliente ou campo recusado (trava da equipe ou do sistema, limite segurado em 0 ou modo roubada); nada é publicado e só admin/operacao desfaz. `did_not_stop`: em rastreador `speed_control`, a moto não parou em 120 s e o limite fica segurado em 0; em `relay_only`, a moto não parou em 120 s e nenhum corte foi enviado. `unsupported_by_tracker`: comando que o rastreador não executa (`speed_limit` e `horn` em `relay_only`); o shadow não é tocado.
class CommandStatusReason extends EnumClass {
  @BuiltValueEnumConst(wireName: r'offline')
  static const CommandStatusReason offline = _$offline;
  @BuiltValueEnumConst(wireName: r'timeout')
  static const CommandStatusReason timeout = _$timeout;
  @BuiltValueEnumConst(wireName: r'did_not_stop')
  static const CommandStatusReason didNotStop = _$didNotStop;
  @BuiltValueEnumConst(wireName: r'invalid_limit')
  static const CommandStatusReason invalidLimit = _$invalidLimit;
  @BuiltValueEnumConst(wireName: r'locked_by_staff')
  static const CommandStatusReason lockedByStaff = _$lockedByStaff;
  @BuiltValueEnumConst(wireName: r'unsupported_by_tracker')
  static const CommandStatusReason unsupportedByTracker =
      _$unsupportedByTracker;
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
