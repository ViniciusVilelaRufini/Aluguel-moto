//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/pricing_plan.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'pricing_plan_list.g.dart';

/// PricingPlanList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class PricingPlanList
    implements Built<PricingPlanList, PricingPlanListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<PricingPlan> get items;

  PricingPlanList._();

  factory PricingPlanList([void updates(PricingPlanListBuilder b)]) =
      _$PricingPlanList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PricingPlanListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PricingPlanList> get serializer =>
      _$PricingPlanListSerializer();
}

class _$PricingPlanListSerializer
    implements PrimitiveSerializer<PricingPlanList> {
  @override
  final Iterable<Type> types = const [PricingPlanList, _$PricingPlanList];

  @override
  final String wireName = r'PricingPlanList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PricingPlanList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(PricingPlan)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PricingPlanList object, {
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
    required PricingPlanListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(PricingPlan)]),
          ) as BuiltList<PricingPlan>;
          result.items.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PricingPlanList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PricingPlanListBuilder();
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
