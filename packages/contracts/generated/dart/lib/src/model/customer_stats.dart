//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'customer_stats.g.dart';

/// CustomerStats
///
/// Properties:
/// * [rentalsCount]
/// * [totalSpentCents]
/// * [openDisputes]
/// * [lastRentalAt]
@BuiltValue()
abstract class CustomerStats
    implements Built<CustomerStats, CustomerStatsBuilder> {
  @BuiltValueField(wireName: r'rentalsCount')
  int get rentalsCount;

  @BuiltValueField(wireName: r'totalSpentCents')
  int get totalSpentCents;

  @BuiltValueField(wireName: r'openDisputes')
  int get openDisputes;

  @BuiltValueField(wireName: r'lastRentalAt')
  DateTime? get lastRentalAt;

  CustomerStats._();

  factory CustomerStats([void updates(CustomerStatsBuilder b)]) =
      _$CustomerStats;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CustomerStatsBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CustomerStats> get serializer =>
      _$CustomerStatsSerializer();
}

class _$CustomerStatsSerializer implements PrimitiveSerializer<CustomerStats> {
  @override
  final Iterable<Type> types = const [CustomerStats, _$CustomerStats];

  @override
  final String wireName = r'CustomerStats';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CustomerStats object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'rentalsCount';
    yield serializers.serialize(
      object.rentalsCount,
      specifiedType: const FullType(int),
    );
    yield r'totalSpentCents';
    yield serializers.serialize(
      object.totalSpentCents,
      specifiedType: const FullType(int),
    );
    yield r'openDisputes';
    yield serializers.serialize(
      object.openDisputes,
      specifiedType: const FullType(int),
    );
    if (object.lastRentalAt != null) {
      yield r'lastRentalAt';
      yield serializers.serialize(
        object.lastRentalAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CustomerStats object, {
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
    required CustomerStatsBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'rentalsCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.rentalsCount = valueDes;
          break;
        case r'totalSpentCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.totalSpentCents = valueDes;
          break;
        case r'openDisputes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.openDisputes = valueDes;
          break;
        case r'lastRentalAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.lastRentalAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CustomerStats deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CustomerStatsBuilder();
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
