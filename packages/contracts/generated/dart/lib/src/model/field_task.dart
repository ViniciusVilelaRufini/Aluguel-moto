//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/field_task_type.dart';
import 'package:volti_api/src/model/task_priority.dart';
import 'package:volti_api/src/model/vehicle_status.dart';
import 'package:volti_api/src/model/field_task_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'field_task.g.dart';

/// FieldTask
///
/// Properties:
/// * [id]
/// * [type]
/// * [status]
/// * [priority]
/// * [vehicleId]
/// * [vehicleCode]
/// * [vehicleLat] - Última posição conhecida da moto.
/// * [vehicleLng]
/// * [vehicleBatteryPct]
/// * [vehicleStatus]
/// * [vehicleAddress] - Endereço aproximado da moto.
/// * [vehicleBatterySerial] - Bateria instalada (retirada numa troca).
/// * [vehicleBatteryCycleCount]
/// * [targetAddress] - Endereço aproximado do destino.
/// * [targetLat] - Destino (reposicionar).
/// * [targetLng]
/// * [assigneeId]
/// * [assigneeName]
/// * [notes]
/// * [dueAt]
/// * [maintenanceTaskId]
/// * [createdById]
/// * [completionNotes]
/// * [createdAt]
/// * [updatedAt]
/// * [startedAt]
/// * [completedAt]
@BuiltValue()
abstract class FieldTask implements Built<FieldTask, FieldTaskBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'type')
  FieldTaskType get type;
  // enum typeEnum {  collect,  battery_swap,  maintenance,  reposition,  inspection,  };

  @BuiltValueField(wireName: r'status')
  FieldTaskStatus get status;
  // enum statusEnum {  open,  assigned,  in_progress,  done,  canceled,  };

  @BuiltValueField(wireName: r'priority')
  TaskPriority get priority;
  // enum priorityEnum {  low,  medium,  high,  urgent,  };

  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'vehicleCode')
  String get vehicleCode;

  /// Última posição conhecida da moto.
  @BuiltValueField(wireName: r'vehicleLat')
  double? get vehicleLat;

  @BuiltValueField(wireName: r'vehicleLng')
  double? get vehicleLng;

  @BuiltValueField(wireName: r'vehicleBatteryPct')
  int? get vehicleBatteryPct;

  @BuiltValueField(wireName: r'vehicleStatus')
  VehicleStatus? get vehicleStatus;
  // enum vehicleStatusEnum {  free,  rented,  reserved,  paused,  blocked,  maintenance,  offline,  };

  /// Endereço aproximado da moto.
  @BuiltValueField(wireName: r'vehicleAddress')
  String? get vehicleAddress;

  /// Bateria instalada (retirada numa troca).
  @BuiltValueField(wireName: r'vehicleBatterySerial')
  String? get vehicleBatterySerial;

  @BuiltValueField(wireName: r'vehicleBatteryCycleCount')
  int? get vehicleBatteryCycleCount;

  /// Endereço aproximado do destino.
  @BuiltValueField(wireName: r'targetAddress')
  String? get targetAddress;

  /// Destino (reposicionar).
  @BuiltValueField(wireName: r'targetLat')
  double? get targetLat;

  @BuiltValueField(wireName: r'targetLng')
  double? get targetLng;

  @BuiltValueField(wireName: r'assigneeId')
  String? get assigneeId;

  @BuiltValueField(wireName: r'assigneeName')
  String? get assigneeName;

  @BuiltValueField(wireName: r'notes')
  String? get notes;

  @BuiltValueField(wireName: r'dueAt')
  DateTime? get dueAt;

  @BuiltValueField(wireName: r'maintenanceTaskId')
  String? get maintenanceTaskId;

  @BuiltValueField(wireName: r'createdById')
  String? get createdById;

  @BuiltValueField(wireName: r'completionNotes')
  String? get completionNotes;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime get updatedAt;

  @BuiltValueField(wireName: r'startedAt')
  DateTime? get startedAt;

  @BuiltValueField(wireName: r'completedAt')
  DateTime? get completedAt;

  FieldTask._();

  factory FieldTask([void updates(FieldTaskBuilder b)]) = _$FieldTask;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(FieldTaskBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<FieldTask> get serializer => _$FieldTaskSerializer();
}

class _$FieldTaskSerializer implements PrimitiveSerializer<FieldTask> {
  @override
  final Iterable<Type> types = const [FieldTask, _$FieldTask];

  @override
  final String wireName = r'FieldTask';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    FieldTask object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(FieldTaskType),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(FieldTaskStatus),
    );
    yield r'priority';
    yield serializers.serialize(
      object.priority,
      specifiedType: const FullType(TaskPriority),
    );
    yield r'vehicleId';
    yield serializers.serialize(
      object.vehicleId,
      specifiedType: const FullType(String),
    );
    yield r'vehicleCode';
    yield serializers.serialize(
      object.vehicleCode,
      specifiedType: const FullType(String),
    );
    if (object.vehicleLat != null) {
      yield r'vehicleLat';
      yield serializers.serialize(
        object.vehicleLat,
        specifiedType: const FullType(double),
      );
    }
    if (object.vehicleLng != null) {
      yield r'vehicleLng';
      yield serializers.serialize(
        object.vehicleLng,
        specifiedType: const FullType(double),
      );
    }
    if (object.vehicleBatteryPct != null) {
      yield r'vehicleBatteryPct';
      yield serializers.serialize(
        object.vehicleBatteryPct,
        specifiedType: const FullType(int),
      );
    }
    if (object.vehicleStatus != null) {
      yield r'vehicleStatus';
      yield serializers.serialize(
        object.vehicleStatus,
        specifiedType: const FullType(VehicleStatus),
      );
    }
    if (object.vehicleAddress != null) {
      yield r'vehicleAddress';
      yield serializers.serialize(
        object.vehicleAddress,
        specifiedType: const FullType(String),
      );
    }
    if (object.vehicleBatterySerial != null) {
      yield r'vehicleBatterySerial';
      yield serializers.serialize(
        object.vehicleBatterySerial,
        specifiedType: const FullType(String),
      );
    }
    if (object.vehicleBatteryCycleCount != null) {
      yield r'vehicleBatteryCycleCount';
      yield serializers.serialize(
        object.vehicleBatteryCycleCount,
        specifiedType: const FullType(int),
      );
    }
    if (object.targetAddress != null) {
      yield r'targetAddress';
      yield serializers.serialize(
        object.targetAddress,
        specifiedType: const FullType(String),
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
    if (object.assigneeId != null) {
      yield r'assigneeId';
      yield serializers.serialize(
        object.assigneeId,
        specifiedType: const FullType(String),
      );
    }
    if (object.assigneeName != null) {
      yield r'assigneeName';
      yield serializers.serialize(
        object.assigneeName,
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
    if (object.maintenanceTaskId != null) {
      yield r'maintenanceTaskId';
      yield serializers.serialize(
        object.maintenanceTaskId,
        specifiedType: const FullType(String),
      );
    }
    if (object.createdById != null) {
      yield r'createdById';
      yield serializers.serialize(
        object.createdById,
        specifiedType: const FullType(String),
      );
    }
    if (object.completionNotes != null) {
      yield r'completionNotes';
      yield serializers.serialize(
        object.completionNotes,
        specifiedType: const FullType(String),
      );
    }
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'updatedAt';
    yield serializers.serialize(
      object.updatedAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.startedAt != null) {
      yield r'startedAt';
      yield serializers.serialize(
        object.startedAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.completedAt != null) {
      yield r'completedAt';
      yield serializers.serialize(
        object.completedAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    FieldTask object, {
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
    required FieldTaskBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(FieldTaskType),
          ) as FieldTaskType;
          result.type = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(FieldTaskStatus),
          ) as FieldTaskStatus;
          result.status = valueDes;
          break;
        case r'priority':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(TaskPriority),
          ) as TaskPriority;
          result.priority = valueDes;
          break;
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.vehicleId = valueDes;
          break;
        case r'vehicleCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.vehicleCode = valueDes;
          break;
        case r'vehicleLat':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.vehicleLat = valueDes;
          break;
        case r'vehicleLng':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.vehicleLng = valueDes;
          break;
        case r'vehicleBatteryPct':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.vehicleBatteryPct = valueDes;
          break;
        case r'vehicleStatus':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(VehicleStatus),
          ) as VehicleStatus?;
          if (valueDes == null) continue;
          result.vehicleStatus = valueDes;
          break;
        case r'vehicleAddress':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleAddress = valueDes;
          break;
        case r'vehicleBatterySerial':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleBatterySerial = valueDes;
          break;
        case r'vehicleBatteryCycleCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.vehicleBatteryCycleCount = valueDes;
          break;
        case r'targetAddress':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.targetAddress = valueDes;
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
        case r'assigneeId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.assigneeId = valueDes;
          break;
        case r'assigneeName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.assigneeName = valueDes;
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
        case r'maintenanceTaskId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.maintenanceTaskId = valueDes;
          break;
        case r'createdById':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.createdById = valueDes;
          break;
        case r'completionNotes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.completionNotes = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'updatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.updatedAt = valueDes;
          break;
        case r'startedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.startedAt = valueDes;
          break;
        case r'completedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.completedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  FieldTask deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = FieldTaskBuilder();
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
