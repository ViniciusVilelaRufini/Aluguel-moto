//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/handover_upload_purpose.dart';
import 'package:volti_api/src/model/upload_content_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'handover_upload_request.g.dart';

/// HandoverUploadRequest
///
/// Properties:
/// * [contentType]
/// * [purpose]
@BuiltValue()
abstract class HandoverUploadRequest
    implements Built<HandoverUploadRequest, HandoverUploadRequestBuilder> {
  @BuiltValueField(wireName: r'contentType')
  UploadContentType get contentType;
  // enum contentTypeEnum {  image/jpeg,  image/png,  image/heic,  application/pdf,  };

  @BuiltValueField(wireName: r'purpose')
  HandoverUploadPurpose? get purpose;
  // enum purposeEnum {  photo,  contract,  };

  HandoverUploadRequest._();

  factory HandoverUploadRequest(
      [void updates(HandoverUploadRequestBuilder b)]) = _$HandoverUploadRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(HandoverUploadRequestBuilder b) =>
      b..purpose = HandoverUploadPurpose.photo;

  @BuiltValueSerializer(custom: true)
  static Serializer<HandoverUploadRequest> get serializer =>
      _$HandoverUploadRequestSerializer();
}

class _$HandoverUploadRequestSerializer
    implements PrimitiveSerializer<HandoverUploadRequest> {
  @override
  final Iterable<Type> types = const [
    HandoverUploadRequest,
    _$HandoverUploadRequest
  ];

  @override
  final String wireName = r'HandoverUploadRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    HandoverUploadRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'contentType';
    yield serializers.serialize(
      object.contentType,
      specifiedType: const FullType(UploadContentType),
    );
    if (object.purpose != null) {
      yield r'purpose';
      yield serializers.serialize(
        object.purpose,
        specifiedType: const FullType(HandoverUploadPurpose),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    HandoverUploadRequest object, {
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
    required HandoverUploadRequestBuilder result,
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
        case r'purpose':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(HandoverUploadPurpose),
          ) as HandoverUploadPurpose?;
          if (valueDes == null) continue;
          result.purpose = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  HandoverUploadRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = HandoverUploadRequestBuilder();
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
