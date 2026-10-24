//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'battery_status_counts.g.dart';

/// Quantidade de baterias por status.
///
/// Properties:
/// * [inVehicle]
/// * [inVan]
/// * [charging]
/// * [charged]
/// * [inStation]
/// * [defective]
/// * [retired]
@BuiltValue()
abstract class BatteryStatusCounts
    implements Built<BatteryStatusCounts, BatteryStatusCountsBuilder> {
  @BuiltValueField(wireName: r'in_vehicle')
  int get inVehicle;

  @BuiltValueField(wireName: r'in_van')
  int get inVan;

  @BuiltValueField(wireName: r'charging')
  int get charging;

  @BuiltValueField(wireName: r'charged')
  int get charged;

  @BuiltValueField(wireName: r'in_station')
  int get inStation;

  @BuiltValueField(wireName: r'defective')
  int get defective;

  @BuiltValueField(wireName: r'retired')
  int get retired;

  BatteryStatusCounts._();

  factory BatteryStatusCounts([void updates(BatteryStatusCountsBuilder b)]) =
      _$BatteryStatusCounts;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(BatteryStatusCountsBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<BatteryStatusCounts> get serializer =>
      _$BatteryStatusCountsSerializer();
}

class _$BatteryStatusCountsSerializer
    implements PrimitiveSerializer<BatteryStatusCounts> {
  @override
  final Iterable<Type> types = const [
    BatteryStatusCounts,
    _$BatteryStatusCounts
  ];

  @override
  final String wireName = r'BatteryStatusCounts';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    BatteryStatusCounts object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'in_vehicle';
    yield serializers.serialize(
      object.inVehicle,
      specifiedType: const FullType(int),
    );
    yield r'in_van';
    yield serializers.serialize(
      object.inVan,
      specifiedType: const FullType(int),
    );
    yield r'charging';
    yield serializers.serialize(
      object.charging,
      specifiedType: const FullType(int),
    );
    yield r'charged';
    yield serializers.serialize(
      object.charged,
      specifiedType: const FullType(int),
    );
    yield r'in_station';
    yield serializers.serialize(
      object.inStation,
      specifiedType: const FullType(int),
    );
    yield r'defective';
    yield serializers.serialize(
      object.defective,
      specifiedType: const FullType(int),
    );
    yield r'retired';
    yield serializers.serialize(
      object.retired,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    BatteryStatusCounts object, {
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
    required BatteryStatusCountsBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'in_vehicle':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.inVehicle = valueDes;
          break;
        case r'in_van':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.inVan = valueDes;
          break;
        case r'charging':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.charging = valueDes;
          break;
        case r'charged':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.charged = valueDes;
          break;
        case r'in_station':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.inStation = valueDes;
          break;
        case r'defective':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.defective = valueDes;
          break;
        case r'retired':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.retired = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  BatteryStatusCounts deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = BatteryStatusCountsBuilder();
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
