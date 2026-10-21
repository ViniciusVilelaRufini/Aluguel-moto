//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/task_priority.dart';
import 'package:volti_api/src/model/field_task_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'field_task_update.g.dart';

/// FieldTaskUpdate
///
/// Properties:
/// * [priority]
/// * [assigneeId]
/// * [notes]
/// * [dueAt]
/// * [status] - Só `canceled` é aceito aqui.
@BuiltValue()
abstract class FieldTaskUpdate
    implements Built<FieldTaskUpdate, FieldTaskUpdateBuilder> {
  @BuiltValueField(wireName: r'priority')
  TaskPriority? get priority;
  // enum priorityEnum {  low,  medium,  high,  urgent,  };

  @BuiltValueField(wireName: r'assigneeId')
  String? get assigneeId;

  @BuiltValueField(wireName: r'notes')
  String? get notes;

  @BuiltValueField(wireName: r'dueAt')
  DateTime? get dueAt;

  /// Só `canceled` é aceito aqui.
  @BuiltValueField(wireName: r'status')
  FieldTaskStatus? get status;
  // enum statusEnum {  open,  assigned,  in_progress,  done,  canceled,  };

  FieldTaskUpdate._();

  factory FieldTaskUpdate([void updates(FieldTaskUpdateBuilder b)]) =
      _$FieldTaskUpdate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(FieldTaskUpdateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<FieldTaskUpdate> get serializer =>
      _$FieldTaskUpdateSerializer();
}

class _$FieldTaskUpdateSerializer
    implements PrimitiveSerializer<FieldTaskUpdate> {
  @override
  final Iterable<Type> types = const [FieldTaskUpdate, _$FieldTaskUpdate];

  @override
  final String wireName = r'FieldTaskUpdate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    FieldTaskUpdate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.priority != null) {
      yield r'priority';
      yield serializers.serialize(
        object.priority,
        specifiedType: const FullType(TaskPriority),
      );
    }
    if (object.assigneeId != null) {
      yield r'assigneeId';
      yield serializers.serialize(
        object.assigneeId,
        specifiedType: const FullType(String),
      );
    }
    if (object.notes != null) {
      yield r'notes';
      yield serializers.serialize(
        object.notes,
        specifiedType: const FullType(String),
      );
    }
    if (object.dueAt != null) {
      yield r'dueAt';
      yield serializers.serialize(
        object.dueAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.status != null) {
      yield r'status';
      yield serializers.serialize(
        object.status,
        specifiedType: const FullType(FieldTaskStatus),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    FieldTaskUpdate object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object,
            specifiedType: specifiedType)
        .toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required FieldTaskUpdateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'priority':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(TaskPriority),
          ) as TaskPriority?;
          if (valueDes == null) continue;
          result.priority = valueDes;
          break;
        case r'assigneeId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.assigneeId = valueDes;
          break;
        case r'notes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.notes = valueDes;
          break;
        case r'dueAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.dueAt = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(FieldTaskStatus),
          ) as FieldTaskStatus?;
          if (valueDes == null) continue;
          result.status = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  FieldTaskUpdate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = FieldTaskUpdateBuilder();
    final serializedList = (serialized as Iterable<Object?>).toList();
    final unhandled = <Object?>[];
    _deserializeProperties(
      serializers,
      serialized,
      specifiedType: specifiedType,
      serializedList: serializedList,
      unhandled: unhandled,
      result: result,
    );
    return result.build();
  }
}
