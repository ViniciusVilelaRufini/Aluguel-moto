//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/actor_type.dart';
import 'package:volti_api/src/model/command_status.dart';
import 'package:volti_api/src/model/command_type.dart';
import 'package:volti_api/src/model/command_status_reason.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_command.g.dart';

/// VehicleCommand
///
/// Properties:
/// * [id]
/// * [vehicleId]
/// * [type]
/// * [status]
/// * [statusReason]
/// * [reason] - Motivo informado por quem pediu.
/// * [speedLimitKmh]
/// * [on_]
/// * [requestedById]
/// * [requestedByName]
/// * [requestedByType]
/// * [createdAt]
/// * [updatedAt]
/// * [confirmedAt]
@BuiltValue()
abstract class VehicleCommand
    implements Built<VehicleCommand, VehicleCommandBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'type')
  CommandType get type;
  // enum typeEnum {  lock,  unlock,  horn,  speed_limit,  stolen_mode,  };

  @BuiltValueField(wireName: r'status')
  CommandStatus get status;
  // enum statusEnum {  pending,  in_progress,  confirmed,  failed,  };

  @BuiltValueField(wireName: r'statusReason')
  CommandStatusReason? get statusReason;
  // enum statusReasonEnum {  offline,  timeout,  did_not_stop,  invalid_limit,  locked_by_staff,  unsupported_by_tracker,  };

  /// Motivo informado por quem pediu.
  @BuiltValueField(wireName: r'reason')
  String get reason;

  @BuiltValueField(wireName: r'speedLimitKmh')
  int? get speedLimitKmh;

  @BuiltValueField(wireName: r'on')
  bool? get on_;

  @BuiltValueField(wireName: r'requestedById')
  String? get requestedById;

  @BuiltValueField(wireName: r'requestedByName')
  String? get requestedByName;

  @BuiltValueField(wireName: r'requestedByType')
  ActorType? get requestedByType;
  // enum requestedByTypeEnum {  customer,  staff,  system,  };

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime get updatedAt;

  @BuiltValueField(wireName: r'confirmedAt')
  DateTime? get confirmedAt;

  VehicleCommand._();

  factory VehicleCommand([void updates(VehicleCommandBuilder b)]) =
      _$VehicleCommand;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleCommandBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleCommand> get serializer =>
      _$VehicleCommandSerializer();
}

class _$VehicleCommandSerializer
    implements PrimitiveSerializer<VehicleCommand> {
  @override
  final Iterable<Type> types = const [VehicleCommand, _$VehicleCommand];

  @override
  final String wireName = r'VehicleCommand';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleCommand object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'vehicleId';
    yield serializers.serialize(
      object.vehicleId,
      specifiedType: const FullType(String),
    );
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(CommandType),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(CommandStatus),
    );
    if (object.statusReason != null) {
      yield r'statusReason';
      yield serializers.serialize(
        object.statusReason,
        specifiedType: const FullType(CommandStatusReason),
      );
    }
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
    if (object.speedLimitKmh != null) {
      yield r'speedLimitKmh';
      yield serializers.serialize(
        object.speedLimitKmh,
        specifiedType: const FullType(int),
      );
    }
    if (object.on_ != null) {
      yield r'on';
      yield serializers.serialize(
        object.on_,
        specifiedType: const FullType(bool),
      );
    }
    if (object.requestedById != null) {
      yield r'requestedById';
      yield serializers.serialize(
        object.requestedById,
        specifiedType: const FullType(String),
      );
    }
    if (object.requestedByName != null) {
      yield r'requestedByName';
      yield serializers.serialize(
        object.requestedByName,
        specifiedType: const FullType(String),
      );
    }
    if (object.requestedByType != null) {
      yield r'requestedByType';
      yield serializers.serialize(
        object.requestedByType,
        specifiedType: const FullType(ActorType),
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
    if (object.confirmedAt != null) {
      yield r'confirmedAt';
      yield serializers.serialize(
        object.confirmedAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    VehicleCommand object, {
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
    required VehicleCommandBuilder result,
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
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.vehicleId = valueDes;
          break;
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CommandType),
          ) as CommandType;
          result.type = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CommandStatus),
          ) as CommandStatus;
          result.status = valueDes;
          break;
        case r'statusReason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(CommandStatusReason),
          ) as CommandStatusReason?;
          if (valueDes == null) continue;
          result.statusReason = valueDes;
          break;
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reason = valueDes;
          break;
        case r'speedLimitKmh':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.speedLimitKmh = valueDes;
          break;
        case r'on':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.on_ = valueDes;
          break;
        case r'requestedById':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.requestedById = valueDes;
          break;
        case r'requestedByName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.requestedByName = valueDes;
          break;
        case r'requestedByType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(ActorType),
          ) as ActorType?;
          if (valueDes == null) continue;
          result.requestedByType = valueDes;
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
        case r'confirmedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.confirmedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  VehicleCommand deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleCommandBuilder();
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
