//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/support_message_status.dart';
import 'package:volti_api/src/model/message_author_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'support_message.g.dart';

/// SupportMessage
///
/// Properties:
/// * [id]
/// * [conversationId]
/// * [authorType]
/// * [authorId]
/// * [authorName] - Primeiro nome do atendente (staff) ou \"Você\".
/// * [body]
/// * [attachmentObjectKeys]
/// * [status]
/// * [deliveredAt] - O outro lado buscou a mensagem.
/// * [readAt] - O outro lado marcou como lida.
/// * [createdAt]
@BuiltValue()
abstract class SupportMessage
    implements Built<SupportMessage, SupportMessageBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'conversationId')
  String get conversationId;

  @BuiltValueField(wireName: r'authorType')
  MessageAuthorType get authorType;
  // enum authorTypeEnum {  customer,  staff,  system,  };

  @BuiltValueField(wireName: r'authorId')
  String? get authorId;

  /// Primeiro nome do atendente (staff) ou \"Você\".
  @BuiltValueField(wireName: r'authorName')
  String? get authorName;

  @BuiltValueField(wireName: r'body')
  String get body;

  @BuiltValueField(wireName: r'attachmentObjectKeys')
  BuiltList<String>? get attachmentObjectKeys;

  @BuiltValueField(wireName: r'status')
  SupportMessageStatus? get status;
  // enum statusEnum {  sent,  delivered,  read,  };

  /// O outro lado buscou a mensagem.
  @BuiltValueField(wireName: r'deliveredAt')
  DateTime? get deliveredAt;

  /// O outro lado marcou como lida.
  @BuiltValueField(wireName: r'readAt')
  DateTime? get readAt;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  SupportMessage._();

  factory SupportMessage([void updates(SupportMessageBuilder b)]) =
      _$SupportMessage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SupportMessageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SupportMessage> get serializer =>
      _$SupportMessageSerializer();
}

class _$SupportMessageSerializer
    implements PrimitiveSerializer<SupportMessage> {
  @override
  final Iterable<Type> types = const [SupportMessage, _$SupportMessage];

  @override
  final String wireName = r'SupportMessage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SupportMessage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'conversationId';
    yield serializers.serialize(
      object.conversationId,
      specifiedType: const FullType(String),
    );
    yield r'authorType';
    yield serializers.serialize(
      object.authorType,
      specifiedType: const FullType(MessageAuthorType),
    );
    if (object.authorId != null) {
      yield r'authorId';
      yield serializers.serialize(
        object.authorId,
        specifiedType: const FullType(String),
      );
    }
    if (object.authorName != null) {
      yield r'authorName';
      yield serializers.serialize(
        object.authorName,
        specifiedType: const FullType(String),
      );
    }
    yield r'body';
    yield serializers.serialize(
      object.body,
      specifiedType: const FullType(String),
    );
    if (object.attachmentObjectKeys != null) {
      yield r'attachmentObjectKeys';
      yield serializers.serialize(
        object.attachmentObjectKeys,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
    if (object.status != null) {
      yield r'status';
      yield serializers.serialize(
        object.status,
        specifiedType: const FullType(SupportMessageStatus),
      );
    }
    if (object.deliveredAt != null) {
      yield r'deliveredAt';
      yield serializers.serialize(
        object.deliveredAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.readAt != null) {
      yield r'readAt';
      yield serializers.serialize(
        object.readAt,
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
    SupportMessage object, {
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
    required SupportMessageBuilder result,
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
        case r'conversationId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.conversationId = valueDes;
          break;
        case r'authorType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(MessageAuthorType),
          ) as MessageAuthorType;
          result.authorType = valueDes;
          break;
        case r'authorId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.authorId = valueDes;
          break;
        case r'authorName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.authorName = valueDes;
          break;
        case r'body':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.body = valueDes;
          break;
        case r'attachmentObjectKeys':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType.nullable(BuiltList, [FullType(String)]),
          ) as BuiltList<String>?;
          if (valueDes == null) continue;
          result.attachmentObjectKeys.replace(valueDes);
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(SupportMessageStatus),
          ) as SupportMessageStatus?;
          if (valueDes == null) continue;
          result.status = valueDes;
          break;
        case r'deliveredAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.deliveredAt = valueDes;
          break;
        case r'readAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.readAt = valueDes;
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
  SupportMessage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SupportMessageBuilder();
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
