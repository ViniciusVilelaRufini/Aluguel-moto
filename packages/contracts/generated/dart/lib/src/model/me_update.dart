//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/pix_key_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'me_update.g.dart';

/// MeUpdate
///
/// Properties:
/// * [name]
/// * [phone] - E.164, ex. `+5511987654321`.
/// * [emergencyContactName]
/// * [emergencyContactPhone]
/// * [pixRefundKeyType]
/// * [pixRefundKey] - Chave Pix para estornos. Envie junto com `pixRefundKeyType`; validada pelo tipo (`422` `pix-key-invalid`): CPF com dígitos verificadores e igual ao CPF da conta, e-mail, celular E.164 `+55` ou chave aleatória (UUID). É normalizada (CPF só dígitos, e-mail minúsculo). String vazia remove a chave. Grava AuditLog.
@BuiltValue()
abstract class MeUpdate implements Built<MeUpdate, MeUpdateBuilder> {
  @BuiltValueField(wireName: r'name')
  String? get name;

  /// E.164, ex. `+5511987654321`.
  @BuiltValueField(wireName: r'phone')
  String? get phone;

  @BuiltValueField(wireName: r'emergencyContactName')
  String? get emergencyContactName;

  @BuiltValueField(wireName: r'emergencyContactPhone')
  String? get emergencyContactPhone;

  @BuiltValueField(wireName: r'pixRefundKeyType')
  PixKeyType? get pixRefundKeyType;
  // enum pixRefundKeyTypeEnum {  cpf,  email,  phone,  random,  };

  /// Chave Pix para estornos. Envie junto com `pixRefundKeyType`; validada pelo tipo (`422` `pix-key-invalid`): CPF com dígitos verificadores e igual ao CPF da conta, e-mail, celular E.164 `+55` ou chave aleatória (UUID). É normalizada (CPF só dígitos, e-mail minúsculo). String vazia remove a chave. Grava AuditLog.
  @BuiltValueField(wireName: r'pixRefundKey')
  String? get pixRefundKey;

  MeUpdate._();

  factory MeUpdate([void updates(MeUpdateBuilder b)]) = _$MeUpdate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(MeUpdateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<MeUpdate> get serializer => _$MeUpdateSerializer();
}

class _$MeUpdateSerializer implements PrimitiveSerializer<MeUpdate> {
  @override
  final Iterable<Type> types = const [MeUpdate, _$MeUpdate];

  @override
  final String wireName = r'MeUpdate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    MeUpdate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.name != null) {
      yield r'name';
      yield serializers.serialize(
        object.name,
        specifiedType: const FullType(String),
      );
    }
    if (object.phone != null) {
      yield r'phone';
      yield serializers.serialize(
        object.phone,
        specifiedType: const FullType(String),
      );
    }
    if (object.emergencyContactName != null) {
      yield r'emergencyContactName';
      yield serializers.serialize(
        object.emergencyContactName,
        specifiedType: const FullType(String),
      );
    }
    if (object.emergencyContactPhone != null) {
      yield r'emergencyContactPhone';
      yield serializers.serialize(
        object.emergencyContactPhone,
        specifiedType: const FullType(String),
      );
    }
    if (object.pixRefundKeyType != null) {
      yield r'pixRefundKeyType';
      yield serializers.serialize(
        object.pixRefundKeyType,
        specifiedType: const FullType(PixKeyType),
      );
    }
    if (object.pixRefundKey != null) {
      yield r'pixRefundKey';
      yield serializers.serialize(
        object.pixRefundKey,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    MeUpdate object, {
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
    required MeUpdateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.name = valueDes;
          break;
        case r'phone':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.phone = valueDes;
          break;
        case r'emergencyContactName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.emergencyContactName = valueDes;
          break;
        case r'emergencyContactPhone':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.emergencyContactPhone = valueDes;
          break;
        case r'pixRefundKeyType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(PixKeyType),
          ) as PixKeyType?;
          if (valueDes == null) continue;
          result.pixRefundKeyType = valueDes;
          break;
        case r'pixRefundKey':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.pixRefundKey = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  MeUpdate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = MeUpdateBuilder();
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
