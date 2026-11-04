//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'kyc_file_link.g.dart';

/// KycFileLink
///
/// Properties:
/// * [url] - Link de leitura pré-assinado (expira em `expiresAt`).
/// * [expiresAt]
@BuiltValue()
abstract class KycFileLink implements Built<KycFileLink, KycFileLinkBuilder> {
  /// Link de leitura pré-assinado (expira em `expiresAt`).
  @BuiltValueField(wireName: r'url')
  String get url;

  @BuiltValueField(wireName: r'expiresAt')
  DateTime get expiresAt;

  KycFileLink._();

  factory KycFileLink([void updates(KycFileLinkBuilder b)]) = _$KycFileLink;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(KycFileLinkBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<KycFileLink> get serializer => _$KycFileLinkSerializer();
}

class _$KycFileLinkSerializer implements PrimitiveSerializer<KycFileLink> {
  @override
  final Iterable<Type> types = const [KycFileLink, _$KycFileLink];

  @override
  final String wireName = r'KycFileLink';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    KycFileLink object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'url';
    yield serializers.serialize(
      object.url,
      specifiedType: const FullType(String),
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
    KycFileLink object, {
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
    required KycFileLinkBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'url':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.url = valueDes;
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
  KycFileLink deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = KycFileLinkBuilder();
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
