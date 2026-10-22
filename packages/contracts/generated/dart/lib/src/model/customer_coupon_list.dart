//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/customer_coupon.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'customer_coupon_list.g.dart';

/// CustomerCouponList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class CustomerCouponList
    implements Built<CustomerCouponList, CustomerCouponListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<CustomerCoupon> get items;

  CustomerCouponList._();

  factory CustomerCouponList([void updates(CustomerCouponListBuilder b)]) =
      _$CustomerCouponList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CustomerCouponListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CustomerCouponList> get serializer =>
      _$CustomerCouponListSerializer();
}

class _$CustomerCouponListSerializer
    implements PrimitiveSerializer<CustomerCouponList> {
  @override
  final Iterable<Type> types = const [CustomerCouponList, _$CustomerCouponList];

  @override
  final String wireName = r'CustomerCouponList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CustomerCouponList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(CustomerCoupon)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CustomerCouponList object, {
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
    required CustomerCouponListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(CustomerCoupon)]),
          ) as BuiltList<CustomerCoupon>;
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
  CustomerCouponList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CustomerCouponListBuilder();
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
