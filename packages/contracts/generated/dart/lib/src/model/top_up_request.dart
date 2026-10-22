//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/top_up_method.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'top_up_request.g.dart';

/// TopUpRequest
///
/// Properties:
/// * [amountCents] - Crédito em reais (R$ 10 a R$ 1.000). Fora de `Wallet.topUpMinCents..topUpMaxCents` → `422` `top-up-amount-out-of-range`.
/// * [packageId]
/// * [method]
/// * [cardId]
@BuiltValue()
abstract class TopUpRequest
    implements Built<TopUpRequest, TopUpRequestBuilder> {
  /// Crédito em reais (R$ 10 a R$ 1.000). Fora de `Wallet.topUpMinCents..topUpMaxCents` → `422` `top-up-amount-out-of-range`.
  @BuiltValueField(wireName: r'amountCents')
  int? get amountCents;

  @BuiltValueField(wireName: r'packageId')
  String? get packageId;

  @BuiltValueField(wireName: r'method')
  TopUpMethod get method;
  // enum methodEnum {  card,  pix,  };

  @BuiltValueField(wireName: r'cardId')
  String? get cardId;

  TopUpRequest._();

  factory TopUpRequest([void updates(TopUpRequestBuilder b)]) = _$TopUpRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(TopUpRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<TopUpRequest> get serializer => _$TopUpRequestSerializer();
}

class _$TopUpRequestSerializer implements PrimitiveSerializer<TopUpRequest> {
  @override
  final Iterable<Type> types = const [TopUpRequest, _$TopUpRequest];

  @override
  final String wireName = r'TopUpRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    TopUpRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.amountCents != null) {
      yield r'amountCents';
      yield serializers.serialize(
        object.amountCents,
        specifiedType: const FullType(int),
      );
    }
    if (object.packageId != null) {
      yield r'packageId';
      yield serializers.serialize(
        object.packageId,
        specifiedType: const FullType(String),
      );
    }
    yield r'method';
    yield serializers.serialize(
      object.method,
      specifiedType: const FullType(TopUpMethod),
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
    TopUpRequest object, {
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
    required TopUpRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'amountCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.amountCents = valueDes;
          break;
        case r'packageId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.packageId = valueDes;
          break;
        case r'method':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(TopUpMethod),
          ) as TopUpMethod;
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
  TopUpRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = TopUpRequestBuilder();
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
