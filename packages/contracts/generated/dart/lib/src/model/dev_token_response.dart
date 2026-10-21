//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'dev_token_response.g.dart';

/// DevTokenResponse
///
/// Properties:
/// * [accessToken]
/// * [tokenType]
/// * [expiresIn] - Validade em segundos.
@BuiltValue()
abstract class DevTokenResponse
    implements Built<DevTokenResponse, DevTokenResponseBuilder> {
  @BuiltValueField(wireName: r'accessToken')
  String get accessToken;

  @BuiltValueField(wireName: r'tokenType')
  DevTokenResponseTokenTypeEnum get tokenType;
  // enum tokenTypeEnum {  Bearer,  };

  /// Validade em segundos.
  @BuiltValueField(wireName: r'expiresIn')
  int get expiresIn;

  DevTokenResponse._();

  factory DevTokenResponse([void updates(DevTokenResponseBuilder b)]) =
      _$DevTokenResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DevTokenResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DevTokenResponse> get serializer =>
      _$DevTokenResponseSerializer();
}

class _$DevTokenResponseSerializer
    implements PrimitiveSerializer<DevTokenResponse> {
  @override
  final Iterable<Type> types = const [DevTokenResponse, _$DevTokenResponse];

  @override
  final String wireName = r'DevTokenResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DevTokenResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'accessToken';
    yield serializers.serialize(
      object.accessToken,
      specifiedType: const FullType(String),
    );
    yield r'tokenType';
    yield serializers.serialize(
      object.tokenType,
      specifiedType: const FullType(DevTokenResponseTokenTypeEnum),
    );
    yield r'expiresIn';
    yield serializers.serialize(
      object.expiresIn,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    DevTokenResponse object, {
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
    required DevTokenResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'accessToken':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.accessToken = valueDes;
          break;
        case r'tokenType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DevTokenResponseTokenTypeEnum),
          ) as DevTokenResponseTokenTypeEnum;
          result.tokenType = valueDes;
          break;
        case r'expiresIn':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.expiresIn = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DevTokenResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DevTokenResponseBuilder();
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

class DevTokenResponseTokenTypeEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'Bearer')
  static const DevTokenResponseTokenTypeEnum bearer =
      _$devTokenResponseTokenTypeEnum_bearer;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const DevTokenResponseTokenTypeEnum unknownDefaultOpenApi =
      _$devTokenResponseTokenTypeEnum_unknownDefaultOpenApi;

  static Serializer<DevTokenResponseTokenTypeEnum> get serializer =>
      _$devTokenResponseTokenTypeEnumSerializer;

  const DevTokenResponseTokenTypeEnum._(String name) : super(name);

  static BuiltSet<DevTokenResponseTokenTypeEnum> get values =>
      _$devTokenResponseTokenTypeEnumValues;
  static DevTokenResponseTokenTypeEnum valueOf(String name) =>
      _$devTokenResponseTokenTypeEnumValueOf(name);
}
