//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'battery_swap.g.dart';

/// BatterySwap
///
/// Properties:
/// * [id]
/// * [fieldTaskId]
/// * [vehicleId]
/// * [operatorId]
/// * [removedBatterySerial]
/// * [installedBatterySerial]
/// * [installedBatteryPct]
/// * [recordedAt]
/// * [createdAt]
@BuiltValue()
abstract class BatterySwap implements Built<BatterySwap, BatterySwapBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'fieldTaskId')
  String get fieldTaskId;

  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'operatorId')
  String get operatorId;

  @BuiltValueField(wireName: r'removedBatterySerial')
  String get removedBatterySerial;

  @BuiltValueField(wireName: r'installedBatterySerial')
  String get installedBatterySerial;

  @BuiltValueField(wireName: r'installedBatteryPct')
  int? get installedBatteryPct;

  @BuiltValueField(wireName: r'recordedAt')
  DateTime get recordedAt;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  BatterySwap._();

  factory BatterySwap([void updates(BatterySwapBuilder b)]) = _$BatterySwap;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(BatterySwapBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<BatterySwap> get serializer => _$BatterySwapSerializer();
}

class _$BatterySwapSerializer implements PrimitiveSerializer<BatterySwap> {
  @override
  final Iterable<Type> types = const [BatterySwap, _$BatterySwap];

  @override
  final String wireName = r'BatterySwap';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    BatterySwap object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'fieldTaskId';
    yield serializers.serialize(
      object.fieldTaskId,
      specifiedType: const FullType(String),
    );
    yield r'vehicleId';
    yield serializers.serialize(
      object.vehicleId,
      specifiedType: const FullType(String),
    );
    yield r'operatorId';
    yield serializers.serialize(
      object.operatorId,
      specifiedType: const FullType(String),
    );
    yield r'removedBatterySerial';
    yield serializers.serialize(
      object.removedBatterySerial,
      specifiedType: const FullType(String),
    );
    yield r'installedBatterySerial';
    yield serializers.serialize(
      object.installedBatterySerial,
      specifiedType: const FullType(String),
    );
    if (object.installedBatteryPct != null) {
      yield r'installedBatteryPct';
      yield serializers.serialize(
        object.installedBatteryPct,
        specifiedType: const FullType(int),
      );
    }
    yield r'recordedAt';
    yield serializers.serialize(
      object.recordedAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    BatterySwap object, {
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
    required BatterySwapBuilder result,
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
        case r'fieldTaskId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.fieldTaskId = valueDes;
          break;
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.vehicleId = valueDes;
          break;
        case r'operatorId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.operatorId = valueDes;
          break;
        case r'removedBatterySerial':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.removedBatterySerial = valueDes;
          break;
        case r'installedBatterySerial':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.installedBatterySerial = valueDes;
          break;
        case r'installedBatteryPct':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.installedBatteryPct = valueDes;
          break;
        case r'recordedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.recordedAt = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  BatterySwap deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = BatterySwapBuilder();
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
