//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/plan_code.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'coupon_code_request.g.dart';

/// CouponCodeRequest
///
/// Properties:
/// * [code] - Sem diferenciar maiúsculas.
/// * [planCode]
@BuiltValue()
abstract class CouponCodeRequest
    implements Built<CouponCodeRequest, CouponCodeRequestBuilder> {
  /// Sem diferenciar maiúsculas.
  @BuiltValueField(wireName: r'code')
  String get code;

  @BuiltValueField(wireName: r'planCode')
  PlanCode? get planCode;
  // enum planCodeEnum {  minute,  hour,  day,  weekly,  monthly,  };

  CouponCodeRequest._();

  factory CouponCodeRequest([void updates(CouponCodeRequestBuilder b)]) =
      _$CouponCodeRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CouponCodeRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CouponCodeRequest> get serializer =>
      _$CouponCodeRequestSerializer();
}

class _$CouponCodeRequestSerializer
    implements PrimitiveSerializer<CouponCodeRequest> {
  @override
  final Iterable<Type> types = const [CouponCodeRequest, _$CouponCodeRequest];

  @override
  final String wireName = r'CouponCodeRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CouponCodeRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(String),
    );
    if (object.planCode != null) {
      yield r'planCode';
      yield serializers.serialize(
        object.planCode,
        specifiedType: const FullType(PlanCode),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CouponCodeRequest object, {
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
    required CouponCodeRequestBuilder result,
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
        case r'planCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(PlanCode),
          ) as PlanCode?;
          if (valueDes == null) continue;
          result.planCode = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CouponCodeRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CouponCodeRequestBuilder();
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
