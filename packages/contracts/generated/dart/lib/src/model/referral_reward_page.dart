//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/referral_reward.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'referral_reward_page.g.dart';

/// ReferralRewardPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class ReferralRewardPage
    implements Built<ReferralRewardPage, ReferralRewardPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<ReferralReward> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  ReferralRewardPage._();

  factory ReferralRewardPage([void updates(ReferralRewardPageBuilder b)]) =
      _$ReferralRewardPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ReferralRewardPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ReferralRewardPage> get serializer =>
      _$ReferralRewardPageSerializer();
}

class _$ReferralRewardPageSerializer
    implements PrimitiveSerializer<ReferralRewardPage> {
  @override
  final Iterable<Type> types = const [ReferralRewardPage, _$ReferralRewardPage];

  @override
  final String wireName = r'ReferralRewardPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ReferralRewardPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(ReferralReward)]),
    );
    if (object.nextCursor != null) {
      yield r'nextCursor';
      yield serializers.serialize(
        object.nextCursor,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    ReferralRewardPage object, {
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
    required ReferralRewardPageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(ReferralReward)]),
          ) as BuiltList<ReferralReward>;
          result.items.replace(valueDes);
          break;
        case r'nextCursor':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.nextCursor = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ReferralRewardPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ReferralRewardPageBuilder();
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
