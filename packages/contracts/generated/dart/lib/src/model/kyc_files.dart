//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/kyc_file_link.dart';
import 'package:volti_api/src/model/document_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'kyc_files.g.dart';

/// KycFiles
///
/// Properties:
/// * [customerId]
/// * [documentType]
/// * [documentFront]
/// * [documentBack]
/// * [selfie]
@BuiltValue()
abstract class KycFiles implements Built<KycFiles, KycFilesBuilder> {
  @BuiltValueField(wireName: r'customerId')
  String get customerId;

  @BuiltValueField(wireName: r'documentType')
  DocumentType? get documentType;
  // enum documentTypeEnum {  rg,  cnh,  rne,  };

  @BuiltValueField(wireName: r'documentFront')
  KycFileLink? get documentFront;

  @BuiltValueField(wireName: r'documentBack')
  KycFileLink? get documentBack;

  @BuiltValueField(wireName: r'selfie')
  KycFileLink? get selfie;

  KycFiles._();

  factory KycFiles([void updates(KycFilesBuilder b)]) = _$KycFiles;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(KycFilesBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<KycFiles> get serializer => _$KycFilesSerializer();
}

class _$KycFilesSerializer implements PrimitiveSerializer<KycFiles> {
  @override
  final Iterable<Type> types = const [KycFiles, _$KycFiles];

  @override
  final String wireName = r'KycFiles';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    KycFiles object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'customerId';
    yield serializers.serialize(
      object.customerId,
      specifiedType: const FullType(String),
    );
    if (object.documentType != null) {
      yield r'documentType';
      yield serializers.serialize(
        object.documentType,
        specifiedType: const FullType(DocumentType),
      );
    }
    if (object.documentFront != null) {
      yield r'documentFront';
      yield serializers.serialize(
        object.documentFront,
        specifiedType: const FullType(KycFileLink),
      );
    }
    if (object.documentBack != null) {
      yield r'documentBack';
      yield serializers.serialize(
        object.documentBack,
        specifiedType: const FullType(KycFileLink),
      );
    }
    if (object.selfie != null) {
      yield r'selfie';
      yield serializers.serialize(
        object.selfie,
        specifiedType: const FullType(KycFileLink),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    KycFiles object, {
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
    required KycFilesBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'customerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.customerId = valueDes;
          break;
        case r'documentType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DocumentType),
          ) as DocumentType?;
          if (valueDes == null) continue;
          result.documentType = valueDes;
          break;
        case r'documentFront':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(KycFileLink),
          ) as KycFileLink?;
          if (valueDes == null) continue;
          result.documentFront.replace(valueDes);
          break;
        case r'documentBack':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(KycFileLink),
          ) as KycFileLink?;
          if (valueDes == null) continue;
          result.documentBack.replace(valueDes);
          break;
        case r'selfie':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(KycFileLink),
          ) as KycFileLink?;
          if (valueDes == null) continue;
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
  KycFiles deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = KycFilesBuilder();
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
