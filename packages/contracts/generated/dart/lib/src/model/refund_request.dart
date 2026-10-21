//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'refund_request.g.dart';

/// RefundRequest
///
/// Properties:
/// * [amountCents] - Ausente = estorno do saldo restante.
/// * [reason]
@BuiltValue()
abstract class RefundRequest
    implements Built<RefundRequest, RefundRequestBuilder> {
  /// Ausente = estorno do saldo restante.
  @BuiltValueField(wireName: r'amountCents')
  int? get amountCents;

  @BuiltValueField(wireName: r'reason')
  String get reason;

  RefundRequest._();

  factory RefundRequest([void updates(RefundRequestBuilder b)]) =
      _$RefundRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RefundRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RefundRequest> get serializer =>
      _$RefundRequestSerializer();
}

class _$RefundRequestSerializer implements PrimitiveSerializer<RefundRequest> {
  @override
  final Iterable<Type> types = const [RefundRequest, _$RefundRequest];

  @override
  final String wireName = r'RefundRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RefundRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.amountCents != null) {
      yield r'amountCents';
      yield serializers.serialize(
        object.amountCents,
        specifiedType: const FullType(int),
      );
    }
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RefundRequest object, {
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
    required RefundRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'amountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.amountCents = valueDes;
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
  RefundRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RefundRequestBuilder();
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
