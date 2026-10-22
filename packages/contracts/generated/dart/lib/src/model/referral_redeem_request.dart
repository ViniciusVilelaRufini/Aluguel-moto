//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'referral_redeem_request.g.dart';

/// ReferralRedeemRequest
///
/// Properties:
/// * [code]
@BuiltValue()
abstract class ReferralRedeemRequest
    implements Built<ReferralRedeemRequest, ReferralRedeemRequestBuilder> {
  @BuiltValueField(wireName: r'code')
  String get code;

  ReferralRedeemRequest._();

  factory ReferralRedeemRequest(
      [void updates(ReferralRedeemRequestBuilder b)]) = _$ReferralRedeemRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ReferralRedeemRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ReferralRedeemRequest> get serializer =>
      _$ReferralRedeemRequestSerializer();
}

class _$ReferralRedeemRequestSerializer
    implements PrimitiveSerializer<ReferralRedeemRequest> {
  @override
  final Iterable<Type> types = const [
    ReferralRedeemRequest,
    _$ReferralRedeemRequest
  ];

  @override
  final String wireName = r'ReferralRedeemRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ReferralRedeemRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    ReferralRedeemRequest object, {
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
    required ReferralRedeemRequestBuilder result,
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
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ReferralRedeemRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ReferralRedeemRequestBuilder();
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
