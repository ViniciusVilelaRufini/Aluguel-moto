//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'support_read_request.g.dart';

/// SupportReadRequest
///
/// Properties:
/// * [upToMessageId] - Última mensagem lida (inclusive). Ausente = todas.
@BuiltValue()
abstract class SupportReadRequest
    implements Built<SupportReadRequest, SupportReadRequestBuilder> {
  /// Última mensagem lida (inclusive). Ausente = todas.
  @BuiltValueField(wireName: r'upToMessageId')
  String? get upToMessageId;

  SupportReadRequest._();

  factory SupportReadRequest([void updates(SupportReadRequestBuilder b)]) =
      _$SupportReadRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SupportReadRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SupportReadRequest> get serializer =>
      _$SupportReadRequestSerializer();
}

class _$SupportReadRequestSerializer
    implements PrimitiveSerializer<SupportReadRequest> {
  @override
  final Iterable<Type> types = const [SupportReadRequest, _$SupportReadRequest];

  @override
  final String wireName = r'SupportReadRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SupportReadRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.upToMessageId != null) {
      yield r'upToMessageId';
      yield serializers.serialize(
        object.upToMessageId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    SupportReadRequest object, {
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
    required SupportReadRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'upToMessageId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.upToMessageId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SupportReadRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SupportReadRequestBuilder();
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
