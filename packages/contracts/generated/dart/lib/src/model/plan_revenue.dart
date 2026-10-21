//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/plan_code.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'plan_revenue.g.dart';

/// PlanRevenue
///
/// Properties:
/// * [planCode]
/// * [rentals]
/// * [revenueCents]
@BuiltValue()
abstract class PlanRevenue implements Built<PlanRevenue, PlanRevenueBuilder> {
  @BuiltValueField(wireName: r'planCode')
  PlanCode get planCode;
  // enum planCodeEnum {  minute,  hour,  day,  weekly,  monthly,  };

  @BuiltValueField(wireName: r'rentals')
  int get rentals;

  @BuiltValueField(wireName: r'revenueCents')
  int get revenueCents;

  PlanRevenue._();

  factory PlanRevenue([void updates(PlanRevenueBuilder b)]) = _$PlanRevenue;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PlanRevenueBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PlanRevenue> get serializer => _$PlanRevenueSerializer();
}

class _$PlanRevenueSerializer implements PrimitiveSerializer<PlanRevenue> {
  @override
  final Iterable<Type> types = const [PlanRevenue, _$PlanRevenue];

  @override
  final String wireName = r'PlanRevenue';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PlanRevenue object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'planCode';
    yield serializers.serialize(
      object.planCode,
      specifiedType: const FullType(PlanCode),
    );
    yield r'rentals';
    yield serializers.serialize(
      object.rentals,
      specifiedType: const FullType(int),
    );
    yield r'revenueCents';
    yield serializers.serialize(
      object.revenueCents,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PlanRevenue object, {
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
    required PlanRevenueBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'planCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PlanCode),
          ) as PlanCode;
          result.planCode = valueDes;
          break;
        case r'rentals':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.rentals = valueDes;
          break;
        case r'revenueCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.revenueCents = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PlanRevenue deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PlanRevenueBuilder();
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
