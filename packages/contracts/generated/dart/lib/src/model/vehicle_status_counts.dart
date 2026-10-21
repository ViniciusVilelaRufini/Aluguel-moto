//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_status_counts.g.dart';

/// VehicleStatusCounts
///
/// Properties:
/// * [free]
/// * [rented]
/// * [reserved]
/// * [paused]
/// * [blocked]
/// * [maintenance]
/// * [offline]
@BuiltValue()
abstract class VehicleStatusCounts
    implements Built<VehicleStatusCounts, VehicleStatusCountsBuilder> {
  @BuiltValueField(wireName: r'free')
  int get free;

  @BuiltValueField(wireName: r'rented')
  int get rented;

  @BuiltValueField(wireName: r'reserved')
  int get reserved;

  @BuiltValueField(wireName: r'paused')
  int get paused;

  @BuiltValueField(wireName: r'blocked')
  int get blocked;

  @BuiltValueField(wireName: r'maintenance')
  int get maintenance;

  @BuiltValueField(wireName: r'offline')
  int get offline;

  VehicleStatusCounts._();

  factory VehicleStatusCounts([void updates(VehicleStatusCountsBuilder b)]) =
      _$VehicleStatusCounts;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleStatusCountsBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleStatusCounts> get serializer =>
      _$VehicleStatusCountsSerializer();
}

class _$VehicleStatusCountsSerializer
    implements PrimitiveSerializer<VehicleStatusCounts> {
  @override
  final Iterable<Type> types = const [
    VehicleStatusCounts,
    _$VehicleStatusCounts
  ];

  @override
  final String wireName = r'VehicleStatusCounts';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleStatusCounts object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'free';
    yield serializers.serialize(
      object.free,
      specifiedType: const FullType(int),
    );
    yield r'rented';
    yield serializers.serialize(
      object.rented,
      specifiedType: const FullType(int),
    );
    yield r'reserved';
    yield serializers.serialize(
      object.reserved,
      specifiedType: const FullType(int),
    );
    yield r'paused';
    yield serializers.serialize(
      object.paused,
      specifiedType: const FullType(int),
    );
    yield r'blocked';
    yield serializers.serialize(
      object.blocked,
      specifiedType: const FullType(int),
    );
    yield r'maintenance';
    yield serializers.serialize(
      object.maintenance,
      specifiedType: const FullType(int),
    );
    yield r'offline';
    yield serializers.serialize(
      object.offline,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    VehicleStatusCounts object, {
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
    required VehicleStatusCountsBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'free':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.free = valueDes;
          break;
        case r'rented':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.rented = valueDes;
          break;
        case r'reserved':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.reserved = valueDes;
          break;
        case r'paused':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.paused = valueDes;
          break;
        case r'blocked':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.blocked = valueDes;
          break;
        case r'maintenance':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.maintenance = valueDes;
          break;
        case r'offline':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.offline = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  VehicleStatusCounts deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleStatusCountsBuilder();
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
