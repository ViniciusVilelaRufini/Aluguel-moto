//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/upload_content_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'upload_request.g.dart';

/// UploadRequest
///
/// Properties:
/// * [contentType]
@BuiltValue()
abstract class UploadRequest
    implements Built<UploadRequest, UploadRequestBuilder> {
  @BuiltValueField(wireName: r'contentType')
  UploadContentType get contentType;
  // enum contentTypeEnum {  image/jpeg,  image/png,  image/heic,  application/pdf,  };

  UploadRequest._();

  factory UploadRequest([void updates(UploadRequestBuilder b)]) =
      _$UploadRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(UploadRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<UploadRequest> get serializer =>
      _$UploadRequestSerializer();
}

class _$UploadRequestSerializer implements PrimitiveSerializer<UploadRequest> {
  @override
  final Iterable<Type> types = const [UploadRequest, _$UploadRequest];

  @override
  final String wireName = r'UploadRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    UploadRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'contentType';
    yield serializers.serialize(
      object.contentType,
      specifiedType: const FullType(UploadContentType),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    UploadRequest object, {
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
    required UploadRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'contentType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(UploadContentType),
          ) as UploadContentType;
          result.contentType = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  UploadRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = UploadRequestBuilder();
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
