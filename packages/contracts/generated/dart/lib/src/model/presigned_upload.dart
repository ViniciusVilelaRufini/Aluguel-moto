//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'presigned_upload.g.dart';

/// Upload direto para o S3/MinIO. O app faz `PUT uploadUrl` com os `headers` informados e depois envia `objectKey` à API.
///
/// Properties:
/// * [objectKey]
/// * [uploadUrl]
/// * [method]
/// * [headers] - Cabeçalhos obrigatórios no `PUT` (ex. `Content-Type`).
/// * [expiresAt]
@BuiltValue()
abstract class PresignedUpload
    implements Built<PresignedUpload, PresignedUploadBuilder> {
  @BuiltValueField(wireName: r'objectKey')
  String get objectKey;

  @BuiltValueField(wireName: r'uploadUrl')
  String get uploadUrl;

  @BuiltValueField(wireName: r'method')
  PresignedUploadMethodEnum get method;
  // enum methodEnum {  PUT,  };

  /// Cabeçalhos obrigatórios no `PUT` (ex. `Content-Type`).
  @BuiltValueField(wireName: r'headers')
  BuiltMap<String, String> get headers;

  @BuiltValueField(wireName: r'expiresAt')
  DateTime get expiresAt;

  PresignedUpload._();

  factory PresignedUpload([void updates(PresignedUploadBuilder b)]) =
      _$PresignedUpload;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PresignedUploadBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PresignedUpload> get serializer =>
      _$PresignedUploadSerializer();
}

class _$PresignedUploadSerializer
    implements PrimitiveSerializer<PresignedUpload> {
  @override
  final Iterable<Type> types = const [PresignedUpload, _$PresignedUpload];

  @override
  final String wireName = r'PresignedUpload';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PresignedUpload object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'objectKey';
    yield serializers.serialize(
      object.objectKey,
      specifiedType: const FullType(String),
    );
    yield r'uploadUrl';
    yield serializers.serialize(
      object.uploadUrl,
      specifiedType: const FullType(String),
    );
    yield r'method';
    yield serializers.serialize(
      object.method,
      specifiedType: const FullType(PresignedUploadMethodEnum),
    );
    yield r'headers';
    yield serializers.serialize(
      object.headers,
      specifiedType:
          const FullType(BuiltMap, [FullType(String), FullType(String)]),
    );
    yield r'expiresAt';
    yield serializers.serialize(
      object.expiresAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PresignedUpload object, {
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
    required PresignedUploadBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'objectKey':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.objectKey = valueDes;
          break;
        case r'uploadUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.uploadUrl = valueDes;
          break;
        case r'method':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PresignedUploadMethodEnum),
          ) as PresignedUploadMethodEnum;
          result.method = valueDes;
          break;
        case r'headers':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltMap, [FullType(String), FullType(String)]),
          ) as BuiltMap<String, String>;
          result.headers.replace(valueDes);
          break;
        case r'expiresAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.expiresAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PresignedUpload deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PresignedUploadBuilder();
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

class PresignedUploadMethodEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'PUT')
  static const PresignedUploadMethodEnum PUT = _$presignedUploadMethodEnum_PUT;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const PresignedUploadMethodEnum unknownDefaultOpenApi =
      _$presignedUploadMethodEnum_unknownDefaultOpenApi;

  static Serializer<PresignedUploadMethodEnum> get serializer =>
      _$presignedUploadMethodEnumSerializer;

  const PresignedUploadMethodEnum._(String name) : super(name);

  static BuiltSet<PresignedUploadMethodEnum> get values =>
      _$presignedUploadMethodEnumValues;
  static PresignedUploadMethodEnum valueOf(String name) =>
      _$presignedUploadMethodEnumValueOf(name);
}
