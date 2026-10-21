//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/support_conversation.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'support_conversation_page.g.dart';

/// SupportConversationPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class SupportConversationPage
    implements Built<SupportConversationPage, SupportConversationPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<SupportConversation> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  SupportConversationPage._();

  factory SupportConversationPage(
          [void updates(SupportConversationPageBuilder b)]) =
      _$SupportConversationPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SupportConversationPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SupportConversationPage> get serializer =>
      _$SupportConversationPageSerializer();
}

class _$SupportConversationPageSerializer
    implements PrimitiveSerializer<SupportConversationPage> {
  @override
  final Iterable<Type> types = const [
    SupportConversationPage,
    _$SupportConversationPage
  ];

  @override
  final String wireName = r'SupportConversationPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SupportConversationPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(SupportConversation)]),
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
    SupportConversationPage object, {
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
    required SupportConversationPageBuilder result,
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
                const FullType(BuiltList, [FullType(SupportConversation)]),
          ) as BuiltList<SupportConversation>;
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
  SupportConversationPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SupportConversationPageBuilder();
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
