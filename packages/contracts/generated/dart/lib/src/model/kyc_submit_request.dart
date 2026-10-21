//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/date.dart';
import 'package:volti_api/src/model/document_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'kyc_submit_request.g.dart';

/// KycSubmitRequest
///
/// Properties:
/// * [fullName]
/// * [cpf] - Só dígitos.
/// * [birthDate]
/// * [documentType]
/// * [documentFrontObjectKey]
/// * [documentBackObjectKey]
/// * [selfieObjectKey]
/// * [livenessSessionId] - Sessão de prova de vida do SDK do provedor (quando houver).
@BuiltValue()
abstract class KycSubmitRequest
    implements Built<KycSubmitRequest, KycSubmitRequestBuilder> {
  @BuiltValueField(wireName: r'fullName')
  String get fullName;

  /// Só dígitos.
  @BuiltValueField(wireName: r'cpf')
  String get cpf;

  @BuiltValueField(wireName: r'birthDate')
  Date get birthDate;

  @BuiltValueField(wireName: r'documentType')
  DocumentType get documentType;
  // enum documentTypeEnum {  rg,  cnh,  rne,  };

  @BuiltValueField(wireName: r'documentFrontObjectKey')
  String get documentFrontObjectKey;

  @BuiltValueField(wireName: r'documentBackObjectKey')
  String? get documentBackObjectKey;

  @BuiltValueField(wireName: r'selfieObjectKey')
  String get selfieObjectKey;

  /// Sessão de prova de vida do SDK do provedor (quando houver).
  @BuiltValueField(wireName: r'livenessSessionId')
  String? get livenessSessionId;

  KycSubmitRequest._();

  factory KycSubmitRequest([void updates(KycSubmitRequestBuilder b)]) =
      _$KycSubmitRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(KycSubmitRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<KycSubmitRequest> get serializer =>
      _$KycSubmitRequestSerializer();
}

class _$KycSubmitRequestSerializer
    implements PrimitiveSerializer<KycSubmitRequest> {
  @override
  final Iterable<Type> types = const [KycSubmitRequest, _$KycSubmitRequest];

  @override
  final String wireName = r'KycSubmitRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    KycSubmitRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'fullName';
    yield serializers.serialize(
      object.fullName,
      specifiedType: const FullType(String),
    );
    yield r'cpf';
    yield serializers.serialize(
      object.cpf,
      specifiedType: const FullType(String),
    );
    yield r'birthDate';
    yield serializers.serialize(
      object.birthDate,
      specifiedType: const FullType(Date),
    );
    yield r'documentType';
    yield serializers.serialize(
      object.documentType,
      specifiedType: const FullType(DocumentType),
    );
    yield r'documentFrontObjectKey';
    yield serializers.serialize(
      object.documentFrontObjectKey,
      specifiedType: const FullType(String),
    );
    if (object.documentBackObjectKey != null) {
      yield r'documentBackObjectKey';
      yield serializers.serialize(
        object.documentBackObjectKey,
        specifiedType: const FullType(String),
      );
    }
    yield r'selfieObjectKey';
    yield serializers.serialize(
      object.selfieObjectKey,
      specifiedType: const FullType(String),
    );
    if (object.livenessSessionId != null) {
      yield r'livenessSessionId';
      yield serializers.serialize(
        object.livenessSessionId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    KycSubmitRequest object, {
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
    required KycSubmitRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'fullName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.fullName = valueDes;
          break;
        case r'cpf':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.cpf = valueDes;
          break;
        case r'birthDate':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(Date),
          ) as Date;
          result.birthDate = valueDes;
          break;
        case r'documentType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DocumentType),
          ) as DocumentType;
          result.documentType = valueDes;
          break;
        case r'documentFrontObjectKey':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.documentFrontObjectKey = valueDes;
          break;
        case r'documentBackObjectKey':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.documentBackObjectKey = valueDes;
          break;
        case r'selfieObjectKey':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.selfieObjectKey = valueDes;
          break;
        case r'livenessSessionId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.livenessSessionId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  KycSubmitRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = KycSubmitRequestBuilder();
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
