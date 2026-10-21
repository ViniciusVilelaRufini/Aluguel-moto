//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/field_task_type.dart';
import 'package:volti_api/src/model/task_priority.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'field_task_create.g.dart';

/// FieldTaskCreate
///
/// Properties:
/// * [type]
/// * [vehicleId]
/// * [priority]
/// * [assigneeId]
/// * [notes]
/// * [dueAt]
/// * [targetLat]
/// * [targetLng]
/// * [maintenanceTaskId]
@BuiltValue()
abstract class FieldTaskCreate
    implements Built<FieldTaskCreate, FieldTaskCreateBuilder> {
  @BuiltValueField(wireName: r'type')
  FieldTaskType get type;
  // enum typeEnum {  collect,  battery_swap,  maintenance,  reposition,  inspection,  };

  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'priority')
  TaskPriority get priority;
  // enum priorityEnum {  low,  medium,  high,  urgent,  };

  @BuiltValueField(wireName: r'assigneeId')
  String? get assigneeId;

  @BuiltValueField(wireName: r'notes')
  String? get notes;

  @BuiltValueField(wireName: r'dueAt')
  DateTime? get dueAt;

  @BuiltValueField(wireName: r'targetLat')
  double? get targetLat;

  @BuiltValueField(wireName: r'targetLng')
  double? get targetLng;

  @BuiltValueField(wireName: r'maintenanceTaskId')
  String? get maintenanceTaskId;

  FieldTaskCreate._();

  factory FieldTaskCreate([void updates(FieldTaskCreateBuilder b)]) =
      _$FieldTaskCreate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(FieldTaskCreateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<FieldTaskCreate> get serializer =>
      _$FieldTaskCreateSerializer();
}

class _$FieldTaskCreateSerializer
    implements PrimitiveSerializer<FieldTaskCreate> {
  @override
  final Iterable<Type> types = const [FieldTaskCreate, _$FieldTaskCreate];

  @override
  final String wireName = r'FieldTaskCreate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    FieldTaskCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(FieldTaskType),
    );
    yield r'vehicleId';
    yield serializers.serialize(
      object.vehicleId,
      specifiedType: const FullType(String),
    );
    yield r'priority';
    yield serializers.serialize(
      object.priority,
      specifiedType: const FullType(TaskPriority),
    );
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
    if (object.targetLat != null) {
      yield r'targetLat';
      yield serializers.serialize(
        object.targetLat,
        specifiedType: const FullType(double),
      );
    }
    if (object.targetLng != null) {
      yield r'targetLng';
      yield serializers.serialize(
        object.targetLng,
        specifiedType: const FullType(double),
      );
    }
    if (object.maintenanceTaskId != null) {
      yield r'maintenanceTaskId';
      yield serializers.serialize(
        object.maintenanceTaskId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    FieldTaskCreate object, {
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
    required FieldTaskCreateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(FieldTaskType),
          ) as FieldTaskType;
          result.type = valueDes;
          break;
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.vehicleId = valueDes;
          break;
        case r'priority':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(TaskPriority),
          ) as TaskPriority;
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
        case r'targetLat':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.targetLat = valueDes;
          break;
        case r'targetLng':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.targetLng = valueDes;
          break;
        case r'maintenanceTaskId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.maintenanceTaskId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  FieldTaskCreate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = FieldTaskCreateBuilder();
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
