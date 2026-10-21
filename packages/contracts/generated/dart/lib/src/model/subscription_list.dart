//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/subscription.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'subscription_list.g.dart';

/// SubscriptionList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class SubscriptionList
    implements Built<SubscriptionList, SubscriptionListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<Subscription> get items;

  SubscriptionList._();

  factory SubscriptionList([void updates(SubscriptionListBuilder b)]) =
      _$SubscriptionList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SubscriptionListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SubscriptionList> get serializer =>
      _$SubscriptionListSerializer();
}

class _$SubscriptionListSerializer
    implements PrimitiveSerializer<SubscriptionList> {
  @override
  final Iterable<Type> types = const [SubscriptionList, _$SubscriptionList];

  @override
  final String wireName = r'SubscriptionList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SubscriptionList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Subscription)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    SubscriptionList object, {
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
    required SubscriptionListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Subscription)]),
          ) as BuiltList<Subscription>;
          result.items.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SubscriptionList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SubscriptionListBuilder();
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
