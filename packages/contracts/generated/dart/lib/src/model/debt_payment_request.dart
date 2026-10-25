//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'debt_payment_request.g.dart';

/// DebtPaymentRequest
///
/// Properties:
/// * [method]
/// * [cardId] - Cartão salvo (padrão: o cartão padrão). Só `card`.
@BuiltValue()
abstract class DebtPaymentRequest
    implements Built<DebtPaymentRequest, DebtPaymentRequestBuilder> {
  @BuiltValueField(wireName: r'method')
  DebtPaymentRequestMethodEnum get method;
  // enum methodEnum {  card,  pix,  };

  /// Cartão salvo (padrão: o cartão padrão). Só `card`.
  @BuiltValueField(wireName: r'cardId')
  String? get cardId;

  DebtPaymentRequest._();

  factory DebtPaymentRequest([void updates(DebtPaymentRequestBuilder b)]) =
      _$DebtPaymentRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DebtPaymentRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DebtPaymentRequest> get serializer =>
      _$DebtPaymentRequestSerializer();
}

class _$DebtPaymentRequestSerializer
    implements PrimitiveSerializer<DebtPaymentRequest> {
  @override
  final Iterable<Type> types = const [DebtPaymentRequest, _$DebtPaymentRequest];

  @override
  final String wireName = r'DebtPaymentRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DebtPaymentRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'method';
    yield serializers.serialize(
      object.method,
      specifiedType: const FullType(DebtPaymentRequestMethodEnum),
    );
    if (object.cardId != null) {
      yield r'cardId';
      yield serializers.serialize(
        object.cardId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    DebtPaymentRequest object, {
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
    required DebtPaymentRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'method':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DebtPaymentRequestMethodEnum),
          ) as DebtPaymentRequestMethodEnum;
          result.method = valueDes;
          break;
        case r'cardId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.cardId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DebtPaymentRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DebtPaymentRequestBuilder();
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

class DebtPaymentRequestMethodEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'card')
  static const DebtPaymentRequestMethodEnum card =
      _$debtPaymentRequestMethodEnum_card;
  @BuiltValueEnumConst(wireName: r'pix')
  static const DebtPaymentRequestMethodEnum pix =
      _$debtPaymentRequestMethodEnum_pix;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const DebtPaymentRequestMethodEnum unknownDefaultOpenApi =
      _$debtPaymentRequestMethodEnum_unknownDefaultOpenApi;

  static Serializer<DebtPaymentRequestMethodEnum> get serializer =>
      _$debtPaymentRequestMethodEnumSerializer;

  const DebtPaymentRequestMethodEnum._(String name) : super(name);

  static BuiltSet<DebtPaymentRequestMethodEnum> get values =>
      _$debtPaymentRequestMethodEnumValues;
  static DebtPaymentRequestMethodEnum valueOf(String name) =>
      _$debtPaymentRequestMethodEnumValueOf(name);
}
