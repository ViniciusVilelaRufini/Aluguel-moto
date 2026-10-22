//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/plan_code.dart';
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/discount_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'coupon_validation.g.dart';

/// CouponValidation
///
/// Properties:
/// * [code]
/// * [valid]
/// * [message] - Motivo da recusa (pt-BR) ou \"Cupom válido.\".
/// * [description]
/// * [discountType]
/// * [percentOff]
/// * [amountOffCents]
/// * [planCodes]
/// * [validUntil]
@BuiltValue()
abstract class CouponValidation
    implements Built<CouponValidation, CouponValidationBuilder> {
  @BuiltValueField(wireName: r'code')
  String get code;

  @BuiltValueField(wireName: r'valid')
  bool get valid;

  /// Motivo da recusa (pt-BR) ou \"Cupom válido.\".
  @BuiltValueField(wireName: r'message')
  String? get message;

  @BuiltValueField(wireName: r'description')
  String? get description;

  @BuiltValueField(wireName: r'discountType')
  DiscountType? get discountType;
  // enum discountTypeEnum {  percent,  fixed,  };

  @BuiltValueField(wireName: r'percentOff')
  int? get percentOff;

  @BuiltValueField(wireName: r'amountOffCents')
  int? get amountOffCents;

  @BuiltValueField(wireName: r'planCodes')
  BuiltList<PlanCode>? get planCodes;

  @BuiltValueField(wireName: r'validUntil')
  DateTime? get validUntil;

  CouponValidation._();

  factory CouponValidation([void updates(CouponValidationBuilder b)]) =
      _$CouponValidation;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CouponValidationBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CouponValidation> get serializer =>
      _$CouponValidationSerializer();
}

class _$CouponValidationSerializer
    implements PrimitiveSerializer<CouponValidation> {
  @override
  final Iterable<Type> types = const [CouponValidation, _$CouponValidation];

  @override
  final String wireName = r'CouponValidation';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CouponValidation object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(String),
    );
    yield r'valid';
    yield serializers.serialize(
      object.valid,
      specifiedType: const FullType(bool),
    );
    if (object.message != null) {
      yield r'message';
      yield serializers.serialize(
        object.message,
        specifiedType: const FullType(String),
      );
    }
    if (object.description != null) {
      yield r'description';
      yield serializers.serialize(
        object.description,
        specifiedType: const FullType(String),
      );
    }
    if (object.discountType != null) {
      yield r'discountType';
      yield serializers.serialize(
        object.discountType,
        specifiedType: const FullType(DiscountType),
      );
    }
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
  }

  @override
  Object serialize(
    Serializers serializers,
    CouponValidation object, {
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
    required CouponValidationBuilder result,
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
        case r'valid':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.valid = valueDes;
          break;
        case r'message':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.message = valueDes;
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
            specifiedType: const FullType.nullable(DiscountType),
          ) as DiscountType?;
          if (valueDes == null) continue;
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
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CouponValidation deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CouponValidationBuilder();
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
