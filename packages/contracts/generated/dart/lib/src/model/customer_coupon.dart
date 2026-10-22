//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/customer_coupon_source.dart';
import 'package:volti_api/src/model/plan_code.dart';
import 'package:volti_api/src/model/customer_coupon_status.dart';
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/discount_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'customer_coupon.g.dart';

/// CustomerCoupon
///
/// Properties:
/// * [id]
/// * [code]
/// * [description]
/// * [discountType]
/// * [percentOff]
/// * [amountOffCents]
/// * [planCodes] - Planos elegíveis (vazio = todos).
/// * [validUntil]
/// * [usesRemaining] - Usos que ainda restam para o cliente (ausente = sem limite).
/// * [status]
/// * [source_]
/// * [addedAt]
@BuiltValue()
abstract class CustomerCoupon
    implements Built<CustomerCoupon, CustomerCouponBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'code')
  String get code;

  @BuiltValueField(wireName: r'description')
  String? get description;

  @BuiltValueField(wireName: r'discountType')
  DiscountType get discountType;
  // enum discountTypeEnum {  percent,  fixed,  };

  @BuiltValueField(wireName: r'percentOff')
  int? get percentOff;

  @BuiltValueField(wireName: r'amountOffCents')
  int? get amountOffCents;

  /// Planos elegíveis (vazio = todos).
  @BuiltValueField(wireName: r'planCodes')
  BuiltList<PlanCode>? get planCodes;

  @BuiltValueField(wireName: r'validUntil')
  DateTime? get validUntil;

  /// Usos que ainda restam para o cliente (ausente = sem limite).
  @BuiltValueField(wireName: r'usesRemaining')
  int? get usesRemaining;

  @BuiltValueField(wireName: r'status')
  CustomerCouponStatus get status;
  // enum statusEnum {  available,  used,  expired,  };

  @BuiltValueField(wireName: r'source')
  CustomerCouponSource get source_;
  // enum source_Enum {  manual,  referral,  };

  @BuiltValueField(wireName: r'addedAt')
  DateTime get addedAt;

  CustomerCoupon._();

  factory CustomerCoupon([void updates(CustomerCouponBuilder b)]) =
      _$CustomerCoupon;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CustomerCouponBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CustomerCoupon> get serializer =>
      _$CustomerCouponSerializer();
}

class _$CustomerCouponSerializer
    implements PrimitiveSerializer<CustomerCoupon> {
  @override
  final Iterable<Type> types = const [CustomerCoupon, _$CustomerCoupon];

  @override
  final String wireName = r'CustomerCoupon';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CustomerCoupon object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(String),
    );
    if (object.description != null) {
      yield r'description';
      yield serializers.serialize(
        object.description,
        specifiedType: const FullType(String),
      );
    }
    yield r'discountType';
    yield serializers.serialize(
      object.discountType,
      specifiedType: const FullType(DiscountType),
    );
    if (object.percentOff != null) {
      yield r'percentOff';
      yield serializers.serialize(
        object.percentOff,
        specifiedType: const FullType(int),
      );
    }
    if (object.amountOffCents != null) {
      yield r'amountOffCents';
      yield serializers.serialize(
        object.amountOffCents,
        specifiedType: const FullType(int),
      );
    }
    if (object.planCodes != null) {
      yield r'planCodes';
      yield serializers.serialize(
        object.planCodes,
        specifiedType: const FullType(BuiltList, [FullType(PlanCode)]),
      );
    }
    if (object.validUntil != null) {
      yield r'validUntil';
      yield serializers.serialize(
        object.validUntil,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.usesRemaining != null) {
      yield r'usesRemaining';
      yield serializers.serialize(
        object.usesRemaining,
        specifiedType: const FullType(int),
      );
    }
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(CustomerCouponStatus),
    );
    yield r'source';
    yield serializers.serialize(
      object.source_,
      specifiedType: const FullType(CustomerCouponSource),
    );
    yield r'addedAt';
    yield serializers.serialize(
      object.addedAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CustomerCoupon object, {
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
    required CustomerCouponBuilder result,
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
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.code = valueDes;
          break;
        case r'description':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.description = valueDes;
          break;
        case r'discountType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DiscountType),
          ) as DiscountType;
          result.discountType = valueDes;
          break;
        case r'percentOff':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.percentOff = valueDes;
          break;
        case r'amountOffCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.amountOffCents = valueDes;
          break;
        case r'planCodes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType.nullable(BuiltList, [FullType(PlanCode)]),
          ) as BuiltList<PlanCode>?;
          if (valueDes == null) continue;
          result.planCodes.replace(valueDes);
          break;
        case r'validUntil':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.validUntil = valueDes;
          break;
        case r'usesRemaining':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.usesRemaining = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CustomerCouponStatus),
          ) as CustomerCouponStatus;
          result.status = valueDes;
          break;
        case r'source':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CustomerCouponSource),
          ) as CustomerCouponSource;
          result.source_ = valueDes;
          break;
        case r'addedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.addedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CustomerCoupon deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CustomerCouponBuilder();
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
