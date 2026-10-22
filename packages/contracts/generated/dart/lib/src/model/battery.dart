//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/battery_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'battery.g.dart';

/// Battery
///
/// Properties:
/// * [id]
/// * [serial]
/// * [chargePct]
/// * [cycleCount] - Ciclos de carga (+1 a cada instalação numa moto).
/// * [status]
/// * [vehicleId]
/// * [vehicleCode]
/// * [holderId] - Operador com a bateria na van.
/// * [stationId]
/// * [updatedAt]
@BuiltValue()
abstract class Battery implements Built<Battery, BatteryBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'serial')
  String get serial;

  @BuiltValueField(wireName: r'chargePct')
  int get chargePct;

  /// Ciclos de carga (+1 a cada instalação numa moto).
  @BuiltValueField(wireName: r'cycleCount')
  int get cycleCount;

  @BuiltValueField(wireName: r'status')
  BatteryStatus get status;
  // enum statusEnum {  in_vehicle,  in_van,  charging,  in_station,  retired,  };

  @BuiltValueField(wireName: r'vehicleId')
  String? get vehicleId;

  @BuiltValueField(wireName: r'vehicleCode')
  String? get vehicleCode;

  /// Operador com a bateria na van.
  @BuiltValueField(wireName: r'holderId')
  String? get holderId;

  @BuiltValueField(wireName: r'stationId')
  String? get stationId;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime get updatedAt;

  Battery._();

  factory Battery([void updates(BatteryBuilder b)]) = _$Battery;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(BatteryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Battery> get serializer => _$BatterySerializer();
}

class _$BatterySerializer implements PrimitiveSerializer<Battery> {
  @override
  final Iterable<Type> types = const [Battery, _$Battery];

  @override
  final String wireName = r'Battery';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Battery object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'serial';
    yield serializers.serialize(
      object.serial,
      specifiedType: const FullType(String),
    );
    yield r'chargePct';
    yield serializers.serialize(
      object.chargePct,
      specifiedType: const FullType(int),
    );
    yield r'cycleCount';
    yield serializers.serialize(
      object.cycleCount,
      specifiedType: const FullType(int),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(BatteryStatus),
    );
    if (object.vehicleId != null) {
      yield r'vehicleId';
      yield serializers.serialize(
        object.vehicleId,
        specifiedType: const FullType(String),
      );
    }
    if (object.vehicleCode != null) {
      yield r'vehicleCode';
      yield serializers.serialize(
        object.vehicleCode,
        specifiedType: const FullType(String),
      );
    }
    if (object.holderId != null) {
      yield r'holderId';
      yield serializers.serialize(
        object.holderId,
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
    yield r'updatedAt';
    yield serializers.serialize(
      object.updatedAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    Battery object, {
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
    required BatteryBuilder result,
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
        case r'serial':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.serial = valueDes;
          break;
        case r'chargePct':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.chargePct = valueDes;
          break;
        case r'cycleCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.cycleCount = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BatteryStatus),
          ) as BatteryStatus;
          result.status = valueDes;
          break;
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleId = valueDes;
          break;
        case r'vehicleCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleCode = valueDes;
          break;
        case r'holderId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.holderId = valueDes;
          break;
        case r'stationId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.stationId = valueDes;
          break;
        case r'updatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.updatedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Battery deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = BatteryBuilder();
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
