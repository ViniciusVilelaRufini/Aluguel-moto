//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/subscription_status.dart';
import 'package:volti_api/src/model/subscription_plan_code.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'subscription.g.dart';

/// Subscription
///
/// Properties:
/// * [id]
/// * [planCode]
/// * [status]
/// * [cardId]
/// * [priceCents]
/// * [currentPeriodStart]
/// * [currentPeriodEnd]
/// * [cancelAtPeriodEnd]
/// * [canceledAt]
/// * [createdAt]
@BuiltValue()
abstract class Subscription
    implements Built<Subscription, SubscriptionBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'planCode')
  SubscriptionPlanCode get planCode;
  // enum planCodeEnum {  weekly,  monthly,  };

  @BuiltValueField(wireName: r'status')
  SubscriptionStatus get status;
  // enum statusEnum {  active,  past_due,  canceled,  expired,  };

  @BuiltValueField(wireName: r'cardId')
  String? get cardId;

  @BuiltValueField(wireName: r'priceCents')
  int get priceCents;

  @BuiltValueField(wireName: r'currentPeriodStart')
  DateTime get currentPeriodStart;

  @BuiltValueField(wireName: r'currentPeriodEnd')
  DateTime get currentPeriodEnd;

  @BuiltValueField(wireName: r'cancelAtPeriodEnd')
  bool? get cancelAtPeriodEnd;

  @BuiltValueField(wireName: r'canceledAt')
  DateTime? get canceledAt;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  Subscription._();

  factory Subscription([void updates(SubscriptionBuilder b)]) = _$Subscription;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SubscriptionBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Subscription> get serializer => _$SubscriptionSerializer();
}

class _$SubscriptionSerializer implements PrimitiveSerializer<Subscription> {
  @override
  final Iterable<Type> types = const [Subscription, _$Subscription];

  @override
  final String wireName = r'Subscription';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Subscription object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'planCode';
    yield serializers.serialize(
      object.planCode,
      specifiedType: const FullType(SubscriptionPlanCode),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(SubscriptionStatus),
    );
    if (object.cardId != null) {
      yield r'cardId';
      yield serializers.serialize(
        object.cardId,
        specifiedType: const FullType(String),
      );
    }
    yield r'priceCents';
    yield serializers.serialize(
      object.priceCents,
      specifiedType: const FullType(int),
    );
    yield r'currentPeriodStart';
    yield serializers.serialize(
      object.currentPeriodStart,
      specifiedType: const FullType(DateTime),
    );
    yield r'currentPeriodEnd';
    yield serializers.serialize(
      object.currentPeriodEnd,
      specifiedType: const FullType(DateTime),
    );
    if (object.cancelAtPeriodEnd != null) {
      yield r'cancelAtPeriodEnd';
      yield serializers.serialize(
        object.cancelAtPeriodEnd,
        specifiedType: const FullType(bool),
      );
    }
    if (object.canceledAt != null) {
      yield r'canceledAt';
      yield serializers.serialize(
        object.canceledAt,
        specifiedType: const FullType(DateTime),
      );
    }
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    Subscription object, {
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
    required SubscriptionBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        case r'planCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SubscriptionPlanCode),
          ) as SubscriptionPlanCode;
          result.planCode = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SubscriptionStatus),
          ) as SubscriptionStatus;
          result.status = valueDes;
          break;
        case r'cardId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.cardId = valueDes;
          break;
        case r'priceCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.priceCents = valueDes;
          break;
        case r'currentPeriodStart':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.currentPeriodStart = valueDes;
          break;
        case r'currentPeriodEnd':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.currentPeriodEnd = valueDes;
          break;
        case r'cancelAtPeriodEnd':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.cancelAtPeriodEnd = valueDes;
          break;
        case r'canceledAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.canceledAt = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Subscription deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SubscriptionBuilder();
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
