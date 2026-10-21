//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/presigned_upload.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'kyc_uploads.g.dart';

/// KycUploads
///
/// Properties:
/// * [documentFront]
/// * [documentBack]
/// * [selfie]
@BuiltValue()
abstract class KycUploads implements Built<KycUploads, KycUploadsBuilder> {
  @BuiltValueField(wireName: r'documentFront')
  PresignedUpload get documentFront;

  @BuiltValueField(wireName: r'documentBack')
  PresignedUpload? get documentBack;

  @BuiltValueField(wireName: r'selfie')
  PresignedUpload get selfie;

  KycUploads._();

  factory KycUploads([void updates(KycUploadsBuilder b)]) = _$KycUploads;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(KycUploadsBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<KycUploads> get serializer => _$KycUploadsSerializer();
}

class _$KycUploadsSerializer implements PrimitiveSerializer<KycUploads> {
  @override
  final Iterable<Type> types = const [KycUploads, _$KycUploads];

  @override
  final String wireName = r'KycUploads';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    KycUploads object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'documentFront';
    yield serializers.serialize(
      object.documentFront,
      specifiedType: const FullType(PresignedUpload),
    );
    if (object.documentBack != null) {
      yield r'documentBack';
      yield serializers.serialize(
        object.documentBack,
        specifiedType: const FullType(PresignedUpload),
      );
    }
    yield r'selfie';
    yield serializers.serialize(
      object.selfie,
      specifiedType: const FullType(PresignedUpload),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    KycUploads object, {
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
    required KycUploadsBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'documentFront':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PresignedUpload),
          ) as PresignedUpload;
          result.documentFront.replace(valueDes);
          break;
        case r'documentBack':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(PresignedUpload),
          ) as PresignedUpload?;
          if (valueDes == null) continue;
          result.documentBack.replace(valueDes);
          break;
        case r'selfie':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PresignedUpload),
          ) as PresignedUpload;
          result.selfie.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  KycUploads deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = KycUploadsBuilder();
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
