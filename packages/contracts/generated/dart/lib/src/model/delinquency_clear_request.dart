//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'delinquency_clear_request.g.dart';

/// DelinquencyClearRequest
///
/// Properties:
/// * [reason] - Como a dívida foi paga (ex.: \"Transferência recebida em 20/10\").
@BuiltValue()
abstract class DelinquencyClearRequest
    implements Built<DelinquencyClearRequest, DelinquencyClearRequestBuilder> {
  /// Como a dívida foi paga (ex.: \"Transferência recebida em 20/10\").
  @BuiltValueField(wireName: r'reason')
  String get reason;

  DelinquencyClearRequest._();

  factory DelinquencyClearRequest(
          [void updates(DelinquencyClearRequestBuilder b)]) =
      _$DelinquencyClearRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DelinquencyClearRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DelinquencyClearRequest> get serializer =>
      _$DelinquencyClearRequestSerializer();
}

class _$DelinquencyClearRequestSerializer
    implements PrimitiveSerializer<DelinquencyClearRequest> {
  @override
  final Iterable<Type> types = const [
    DelinquencyClearRequest,
    _$DelinquencyClearRequest
  ];

  @override
  final String wireName = r'DelinquencyClearRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DelinquencyClearRequest object, {
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
    DelinquencyClearRequest object, {
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
    required DelinquencyClearRequestBuilder result,
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
  DelinquencyClearRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DelinquencyClearRequestBuilder();
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
