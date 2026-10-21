//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/kyc_decision.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'kyc_review_request.g.dart';

/// KycReviewRequest
///
/// Properties:
/// * [decision]
/// * [reason]
@BuiltValue()
abstract class KycReviewRequest
    implements Built<KycReviewRequest, KycReviewRequestBuilder> {
  @BuiltValueField(wireName: r'decision')
  KycDecision get decision;
  // enum decisionEnum {  approved,  rejected,  };

  @BuiltValueField(wireName: r'reason')
  String get reason;

  KycReviewRequest._();

  factory KycReviewRequest([void updates(KycReviewRequestBuilder b)]) =
      _$KycReviewRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(KycReviewRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<KycReviewRequest> get serializer =>
      _$KycReviewRequestSerializer();
}

class _$KycReviewRequestSerializer
    implements PrimitiveSerializer<KycReviewRequest> {
  @override
  final Iterable<Type> types = const [KycReviewRequest, _$KycReviewRequest];

  @override
  final String wireName = r'KycReviewRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    KycReviewRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'decision';
    yield serializers.serialize(
      object.decision,
      specifiedType: const FullType(KycDecision),
    );
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    KycReviewRequest object, {
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
    required KycReviewRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'decision':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(KycDecision),
          ) as KycDecision;
          result.decision = valueDes;
          break;
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reason = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  KycReviewRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = KycReviewRequestBuilder();
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
