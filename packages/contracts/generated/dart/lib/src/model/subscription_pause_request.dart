//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'subscription_pause_request.g.dart';

/// SubscriptionPauseRequest
///
/// Properties:
/// * [days] - Máximo: 3 no semanal, 7 no mensal.
@BuiltValue()
abstract class SubscriptionPauseRequest
    implements
        Built<SubscriptionPauseRequest, SubscriptionPauseRequestBuilder> {
  /// Máximo: 3 no semanal, 7 no mensal.
  @BuiltValueField(wireName: r'days')
  int get days;

  SubscriptionPauseRequest._();

  factory SubscriptionPauseRequest(
          [void updates(SubscriptionPauseRequestBuilder b)]) =
      _$SubscriptionPauseRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SubscriptionPauseRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SubscriptionPauseRequest> get serializer =>
      _$SubscriptionPauseRequestSerializer();
}

class _$SubscriptionPauseRequestSerializer
    implements PrimitiveSerializer<SubscriptionPauseRequest> {
  @override
  final Iterable<Type> types = const [
    SubscriptionPauseRequest,
    _$SubscriptionPauseRequest
  ];

  @override
  final String wireName = r'SubscriptionPauseRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SubscriptionPauseRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'days';
    yield serializers.serialize(
      object.days,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SubscriptionPauseRequest object, {
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
    required SubscriptionPauseRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'days':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.days = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SubscriptionPauseRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SubscriptionPauseRequestBuilder();
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
