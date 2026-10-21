//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'reason_request.g.dart';

/// ReasonRequest
///
/// Properties:
/// * [reason]
@BuiltValue()
abstract class ReasonRequest
    implements Built<ReasonRequest, ReasonRequestBuilder> {
  @BuiltValueField(wireName: r'reason')
  String get reason;

  ReasonRequest._();

  factory ReasonRequest([void updates(ReasonRequestBuilder b)]) =
      _$ReasonRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ReasonRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ReasonRequest> get serializer =>
      _$ReasonRequestSerializer();
}

class _$ReasonRequestSerializer implements PrimitiveSerializer<ReasonRequest> {
  @override
  final Iterable<Type> types = const [ReasonRequest, _$ReasonRequest];

  @override
  final String wireName = r'ReasonRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ReasonRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    ReasonRequest object, {
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
    required ReasonRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
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
  ReasonRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ReasonRequestBuilder();
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
