//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'counter_refund_request.g.dart';

/// CounterRefundRequest
///
/// Properties:
/// * [amountCents]
/// * [reference]
@BuiltValue()
abstract class CounterRefundRequest
    implements Built<CounterRefundRequest, CounterRefundRequestBuilder> {
  @BuiltValueField(wireName: r'amountCents')
  int get amountCents;

  @BuiltValueField(wireName: r'reference')
  String? get reference;

  CounterRefundRequest._();

  factory CounterRefundRequest([void updates(CounterRefundRequestBuilder b)]) =
      _$CounterRefundRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CounterRefundRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CounterRefundRequest> get serializer =>
      _$CounterRefundRequestSerializer();
}

class _$CounterRefundRequestSerializer
    implements PrimitiveSerializer<CounterRefundRequest> {
  @override
  final Iterable<Type> types = const [
    CounterRefundRequest,
    _$CounterRefundRequest
  ];

  @override
  final String wireName = r'CounterRefundRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CounterRefundRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'amountCents';
    yield serializers.serialize(
      object.amountCents,
      specifiedType: const FullType(int),
    );
    if (object.reference != null) {
      yield r'reference';
      yield serializers.serialize(
        object.reference,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CounterRefundRequest object, {
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
    required CounterRefundRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'amountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.amountCents = valueDes;
          break;
        case r'reference':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.reference = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CounterRefundRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CounterRefundRequestBuilder();
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
