//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/plan_code.dart';
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/discount_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'coupon_input.g.dart';

/// CouponInput
///
/// Properties:
/// * [code]
/// * [description]
/// * [discountType]
/// * [percentOff]
/// * [amountOffCents]
/// * [planCodes]
/// * [validFrom]
/// * [validUntil]
/// * [maxRedemptions]
/// * [maxRedemptionsPerCustomer]
/// * [active]
@BuiltValue()
abstract class CouponInput implements Built<CouponInput, CouponInputBuilder> {
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

  @BuiltValueField(wireName: r'planCodes')
  BuiltList<PlanCode>? get planCodes;

  @BuiltValueField(wireName: r'validFrom')
  DateTime? get validFrom;

  @BuiltValueField(wireName: r'validUntil')
  DateTime? get validUntil;

  @BuiltValueField(wireName: r'maxRedemptions')
  int? get maxRedemptions;

  @BuiltValueField(wireName: r'maxRedemptionsPerCustomer')
  int? get maxRedemptionsPerCustomer;

  @BuiltValueField(wireName: r'active')
  bool? get active;

  CouponInput._();

  factory CouponInput([void updates(CouponInputBuilder b)]) = _$CouponInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CouponInputBuilder b) => b..active = true;

  @BuiltValueSerializer(custom: true)
  static Serializer<CouponInput> get serializer => _$CouponInputSerializer();
}

class _$CouponInputSerializer implements PrimitiveSerializer<CouponInput> {
  @override
  final Iterable<Type> types = const [CouponInput, _$CouponInput];

  @override
  final String wireName = r'CouponInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CouponInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
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
    if (object.validFrom != null) {
      yield r'validFrom';
      yield serializers.serialize(
        object.validFrom,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.validUntil != null) {
      yield r'validUntil';
      yield serializers.serialize(
        object.validUntil,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.maxRedemptions != null) {
      yield r'maxRedemptions';
      yield serializers.serialize(
        object.maxRedemptions,
        specifiedType: const FullType(int),
      );
    }
    if (object.maxRedemptionsPerCustomer != null) {
      yield r'maxRedemptionsPerCustomer';
      yield serializers.serialize(
        object.maxRedemptionsPerCustomer,
        specifiedType: const FullType(int),
      );
    }
    if (object.active != null) {
      yield r'active';
      yield serializers.serialize(
        object.active,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CouponInput object, {
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
    required CouponInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
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
        case r'validFrom':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.validFrom = valueDes;
          break;
        case r'validUntil':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.validUntil = valueDes;
          break;
        case r'maxRedemptions':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.maxRedemptions = valueDes;
          break;
        case r'maxRedemptionsPerCustomer':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.maxRedemptionsPerCustomer = valueDes;
          break;
        case r'active':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.active = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CouponInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CouponInputBuilder();
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
