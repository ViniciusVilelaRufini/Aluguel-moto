//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/subscription_plan_code.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'subscription_create.g.dart';

/// SubscriptionCreate
///
/// Properties:
/// * [planCode]
/// * [cardId] - Padrão do cliente se ausente.
/// * [vehicleId] - Moto fixa (opcional; mesmas regras de `PUT /payments/subscriptions/{id}/vehicle`).
@BuiltValue()
abstract class SubscriptionCreate
    implements Built<SubscriptionCreate, SubscriptionCreateBuilder> {
  @BuiltValueField(wireName: r'planCode')
  SubscriptionPlanCode get planCode;
  // enum planCodeEnum {  weekly,  monthly,  };

  /// Padrão do cliente se ausente.
  @BuiltValueField(wireName: r'cardId')
  String? get cardId;

  /// Moto fixa (opcional; mesmas regras de `PUT /payments/subscriptions/{id}/vehicle`).
  @BuiltValueField(wireName: r'vehicleId')
  String? get vehicleId;

  SubscriptionCreate._();

  factory SubscriptionCreate([void updates(SubscriptionCreateBuilder b)]) =
      _$SubscriptionCreate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SubscriptionCreateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SubscriptionCreate> get serializer =>
      _$SubscriptionCreateSerializer();
}

class _$SubscriptionCreateSerializer
    implements PrimitiveSerializer<SubscriptionCreate> {
  @override
  final Iterable<Type> types = const [SubscriptionCreate, _$SubscriptionCreate];

  @override
  final String wireName = r'SubscriptionCreate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SubscriptionCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'planCode';
    yield serializers.serialize(
      object.planCode,
      specifiedType: const FullType(SubscriptionPlanCode),
    );
    if (object.cardId != null) {
      yield r'cardId';
      yield serializers.serialize(
        object.cardId,
        specifiedType: const FullType(String),
      );
    }
    if (object.vehicleId != null) {
      yield r'vehicleId';
      yield serializers.serialize(
        object.vehicleId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    SubscriptionCreate object, {
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
    required SubscriptionCreateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'planCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SubscriptionPlanCode),
          ) as SubscriptionPlanCode;
          result.planCode = valueDes;
          break;
        case r'cardId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.cardId = valueDes;
          break;
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SubscriptionCreate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SubscriptionCreateBuilder();
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
