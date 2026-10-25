//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/battery_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'battery_movement.g.dart';

/// Uma mudança de status da bateria. `fromStatus` ausente = cadastro.
///
/// Properties:
/// * [id]
/// * [batteryId]
/// * [fromStatus]
/// * [toStatus]
/// * [depotId]
/// * [stationId]
/// * [vehicleId]
/// * [actorId] - Staff que fez a movimentação (cliente na troca por QR).
/// * [reason]
/// * [at]
@BuiltValue()
abstract class BatteryMovement
    implements Built<BatteryMovement, BatteryMovementBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'batteryId')
  String get batteryId;

  @BuiltValueField(wireName: r'fromStatus')
  BatteryStatus? get fromStatus;
  // enum fromStatusEnum {  in_vehicle,  in_van,  charging,  in_station,  retired,  charged,  defective,  };

  @BuiltValueField(wireName: r'toStatus')
  BatteryStatus get toStatus;
  // enum toStatusEnum {  in_vehicle,  in_van,  charging,  in_station,  retired,  charged,  defective,  };

  @BuiltValueField(wireName: r'depotId')
  String? get depotId;

  @BuiltValueField(wireName: r'stationId')
  String? get stationId;

  @BuiltValueField(wireName: r'vehicleId')
  String? get vehicleId;

  /// Staff que fez a movimentação (cliente na troca por QR).
  @BuiltValueField(wireName: r'actorId')
  String get actorId;

  @BuiltValueField(wireName: r'reason')
  String? get reason;

  @BuiltValueField(wireName: r'at')
  DateTime get at;

  BatteryMovement._();

  factory BatteryMovement([void updates(BatteryMovementBuilder b)]) =
      _$BatteryMovement;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(BatteryMovementBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<BatteryMovement> get serializer =>
      _$BatteryMovementSerializer();
}

class _$BatteryMovementSerializer
    implements PrimitiveSerializer<BatteryMovement> {
  @override
  final Iterable<Type> types = const [BatteryMovement, _$BatteryMovement];

  @override
  final String wireName = r'BatteryMovement';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    BatteryMovement object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'batteryId';
    yield serializers.serialize(
      object.batteryId,
      specifiedType: const FullType(String),
    );
    if (object.fromStatus != null) {
      yield r'fromStatus';
      yield serializers.serialize(
        object.fromStatus,
        specifiedType: const FullType(BatteryStatus),
      );
    }
    yield r'toStatus';
    yield serializers.serialize(
      object.toStatus,
      specifiedType: const FullType(BatteryStatus),
    );
    if (object.depotId != null) {
      yield r'depotId';
      yield serializers.serialize(
        object.depotId,
        specifiedType: const FullType(String),
      );
    }
    if (object.stationId != null) {
      yield r'stationId';
      yield serializers.serialize(
        object.stationId,
        specifiedType: const FullType(String),
      );
    }
    if (object.vehicleId != null) {
      yield r'vehicleId';
      yield serializers.serialize(
        object.vehicleId,
        specifiedType: const FullType(String),
      );
    }
    yield r'actorId';
    yield serializers.serialize(
      object.actorId,
      specifiedType: const FullType(String),
    );
    if (object.reason != null) {
      yield r'reason';
      yield serializers.serialize(
        object.reason,
        specifiedType: const FullType(String),
      );
    }
    yield r'at';
    yield serializers.serialize(
      object.at,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    BatteryMovement object, {
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
    required BatteryMovementBuilder result,
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
        case r'batteryId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.batteryId = valueDes;
          break;
        case r'fromStatus':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(BatteryStatus),
          ) as BatteryStatus?;
          if (valueDes == null) continue;
          result.fromStatus = valueDes;
          break;
        case r'toStatus':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BatteryStatus),
          ) as BatteryStatus;
          result.toStatus = valueDes;
          break;
        case r'depotId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.depotId = valueDes;
          break;
        case r'stationId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.stationId = valueDes;
          break;
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleId = valueDes;
          break;
        case r'actorId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.actorId = valueDes;
          break;
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.reason = valueDes;
          break;
        case r'at':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.at = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  BatteryMovement deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = BatteryMovementBuilder();
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
