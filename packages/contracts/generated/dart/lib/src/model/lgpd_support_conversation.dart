//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/support_message.dart';
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/support_conversation.dart';
import 'package:volti_api/src/model/conversation_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'lgpd_support_conversation.g.dart';

/// LgpdSupportConversation
///
/// Properties:
/// * [id]
/// * [customerId]
/// * [customerName] - staff.
/// * [rentalId]
/// * [subject]
/// * [status]
/// * [unreadCount] - Mensagens não lidas por quem consulta.
/// * [createdAt]
/// * [lastMessageAt]
/// * [messages]
@BuiltValue()
abstract class LgpdSupportConversation
    implements
        SupportConversation,
        Built<LgpdSupportConversation, LgpdSupportConversationBuilder> {
  @BuiltValueField(wireName: r'messages')
  BuiltList<SupportMessage> get messages;

  LgpdSupportConversation._();

  factory LgpdSupportConversation(
          [void updates(LgpdSupportConversationBuilder b)]) =
      _$LgpdSupportConversation;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(LgpdSupportConversationBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<LgpdSupportConversation> get serializer =>
      _$LgpdSupportConversationSerializer();
}

class _$LgpdSupportConversationSerializer
    implements PrimitiveSerializer<LgpdSupportConversation> {
  @override
  final Iterable<Type> types = const [
    LgpdSupportConversation,
    _$LgpdSupportConversation
  ];

  @override
  final String wireName = r'LgpdSupportConversation';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    LgpdSupportConversation object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'lastMessageAt';
    yield serializers.serialize(
      object.lastMessageAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'subject';
    yield serializers.serialize(
      object.subject,
      specifiedType: const FullType(String),
    );
    yield r'customerId';
    yield serializers.serialize(
      object.customerId,
      specifiedType: const FullType(String),
    );
    yield r'messages';
    yield serializers.serialize(
      object.messages,
      specifiedType: const FullType(BuiltList, [FullType(SupportMessage)]),
    );
    if (object.unreadCount != null) {
      yield r'unreadCount';
      yield serializers.serialize(
        object.unreadCount,
        specifiedType: const FullType(int),
      );
    }
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    if (object.customerName != null) {
      yield r'customerName';
      yield serializers.serialize(
        object.customerName,
        specifiedType: const FullType(String),
      );
    }
    if (object.rentalId != null) {
      yield r'rentalId';
      yield serializers.serialize(
        object.rentalId,
        specifiedType: const FullType(String),
      );
    }
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(ConversationStatus),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    LgpdSupportConversation object, {
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
    required LgpdSupportConversationBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'lastMessageAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.lastMessageAt = valueDes;
          break;
        case r'subject':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.subject = valueDes;
          break;
        case r'customerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.customerId = valueDes;
          break;
        case r'messages':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(SupportMessage)]),
          ) as BuiltList<SupportMessage>;
          result.messages.replace(valueDes);
          break;
        case r'unreadCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.unreadCount = valueDes;
          break;
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        case r'customerName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.customerName = valueDes;
          break;
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.rentalId = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ConversationStatus),
          ) as ConversationStatus;
          result.status = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  LgpdSupportConversation deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = LgpdSupportConversationBuilder();
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
