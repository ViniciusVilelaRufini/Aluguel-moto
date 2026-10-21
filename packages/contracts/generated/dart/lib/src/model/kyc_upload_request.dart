//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/upload_content_type.dart';
import 'package:volti_api/src/model/document_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'kyc_upload_request.g.dart';

/// KycUploadRequest
///
/// Properties:
/// * [documentType]
/// * [contentType]
/// * [withBack] - Pede também a URL do verso do documento.
@BuiltValue()
abstract class KycUploadRequest
    implements Built<KycUploadRequest, KycUploadRequestBuilder> {
  @BuiltValueField(wireName: r'documentType')
  DocumentType get documentType;
  // enum documentTypeEnum {  rg,  cnh,  rne,  };

  @BuiltValueField(wireName: r'contentType')
  UploadContentType get contentType;
  // enum contentTypeEnum {  image/jpeg,  image/png,  image/heic,  application/pdf,  };

  /// Pede também a URL do verso do documento.
  @BuiltValueField(wireName: r'withBack')
  bool? get withBack;

  KycUploadRequest._();

  factory KycUploadRequest([void updates(KycUploadRequestBuilder b)]) =
      _$KycUploadRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(KycUploadRequestBuilder b) => b..withBack = true;

  @BuiltValueSerializer(custom: true)
  static Serializer<KycUploadRequest> get serializer =>
      _$KycUploadRequestSerializer();
}

class _$KycUploadRequestSerializer
    implements PrimitiveSerializer<KycUploadRequest> {
  @override
  final Iterable<Type> types = const [KycUploadRequest, _$KycUploadRequest];

  @override
  final String wireName = r'KycUploadRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    KycUploadRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'documentType';
    yield serializers.serialize(
      object.documentType,
      specifiedType: const FullType(DocumentType),
    );
    yield r'contentType';
    yield serializers.serialize(
      object.contentType,
      specifiedType: const FullType(UploadContentType),
    );
    if (object.withBack != null) {
      yield r'withBack';
      yield serializers.serialize(
        object.withBack,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    KycUploadRequest object, {
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
    required KycUploadRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'documentType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DocumentType),
          ) as DocumentType;
          result.documentType = valueDes;
          break;
        case r'contentType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(UploadContentType),
          ) as UploadContentType;
          result.contentType = valueDes;
          break;
        case r'withBack':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.withBack = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  KycUploadRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = KycUploadRequestBuilder();
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
