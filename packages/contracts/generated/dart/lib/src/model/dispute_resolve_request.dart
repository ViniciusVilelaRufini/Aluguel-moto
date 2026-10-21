//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/dispute_decision.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'dispute_resolve_request.g.dart';

/// DisputeResolveRequest
///
/// Properties:
/// * [decision]
/// * [resolution]
/// * [refundAmountCents] - Só com `accepted`.
@BuiltValue()
abstract class DisputeResolveRequest
    implements Built<DisputeResolveRequest, DisputeResolveRequestBuilder> {
  @BuiltValueField(wireName: r'decision')
  DisputeDecision get decision;
  // enum decisionEnum {  accepted,  rejected,  };

  @BuiltValueField(wireName: r'resolution')
  String get resolution;

  /// Só com `accepted`.
  @BuiltValueField(wireName: r'refundAmountCents')
  int? get refundAmountCents;

  DisputeResolveRequest._();

  factory DisputeResolveRequest(
      [void updates(DisputeResolveRequestBuilder b)]) = _$DisputeResolveRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DisputeResolveRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DisputeResolveRequest> get serializer =>
      _$DisputeResolveRequestSerializer();
}

class _$DisputeResolveRequestSerializer
    implements PrimitiveSerializer<DisputeResolveRequest> {
  @override
  final Iterable<Type> types = const [
    DisputeResolveRequest,
    _$DisputeResolveRequest
  ];

  @override
  final String wireName = r'DisputeResolveRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DisputeResolveRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'decision';
    yield serializers.serialize(
      object.decision,
      specifiedType: const FullType(DisputeDecision),
    );
    yield r'resolution';
    yield serializers.serialize(
      object.resolution,
      specifiedType: const FullType(String),
    );
    if (object.refundAmountCents != null) {
      yield r'refundAmountCents';
      yield serializers.serialize(
        object.refundAmountCents,
        specifiedType: const FullType(int),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    DisputeResolveRequest object, {
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
    required DisputeResolveRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'decision':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DisputeDecision),
          ) as DisputeDecision;
          result.decision = valueDes;
          break;
        case r'resolution':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.resolution = valueDes;
          break;
        case r'refundAmountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.refundAmountCents = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DisputeResolveRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DisputeResolveRequestBuilder();
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
