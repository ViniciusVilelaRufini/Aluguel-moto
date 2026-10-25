//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/conversation_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'support_conversation.g.dart';

/// SupportConversation
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
@BuiltValue(instantiable: false)
abstract class SupportConversation {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'customerId')
  String get customerId;

  /// staff.
  @BuiltValueField(wireName: r'customerName')
  String? get customerName;

  @BuiltValueField(wireName: r'rentalId')
  String? get rentalId;

  @BuiltValueField(wireName: r'subject')
  String get subject;

  @BuiltValueField(wireName: r'status')
  ConversationStatus get status;
  // enum statusEnum {  open,  closed,  };

  /// Mensagens não lidas por quem consulta.
  @BuiltValueField(wireName: r'unreadCount')
  int? get unreadCount;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'lastMessageAt')
  DateTime get lastMessageAt;

  @BuiltValueSerializer(custom: true)
  static Serializer<SupportConversation> get serializer =>
      _$SupportConversationSerializer();
}

class _$SupportConversationSerializer
    implements PrimitiveSerializer<SupportConversation> {
  @override
  final Iterable<Type> types = const [SupportConversation];

  @override
  final String wireName = r'SupportConversation';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SupportConversation object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'customerId';
    yield serializers.serialize(
      object.customerId,
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
    yield r'subject';
    yield serializers.serialize(
      object.subject,
      specifiedType: const FullType(String),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(ConversationStatus),
    );
    if (object.unreadCount != null) {
      yield r'unreadCount';
      yield serializers.serialize(
        object.unreadCount,
        specifiedType: const FullType(int),
      );
    }
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
  }

  @override
  Object serialize(
    Serializers serializers,
    SupportConversation object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object,
            specifiedType: specifiedType)
        .toList();
  }

  @override
  SupportConversation deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return serializers.deserialize(serialized,
        specifiedType: FullType($SupportConversation)) as $SupportConversation;
  }
}

/// a concrete implementation of [SupportConversation], since [SupportConversation] is not instantiable
@BuiltValue(instantiable: true)
abstract class $SupportConversation
    implements
        SupportConversation,
        Built<$SupportConversation, $SupportConversationBuilder> {
  $SupportConversation._();

  factory $SupportConversation(
          [void Function($SupportConversationBuilder)? updates]) =
      _$$SupportConversation;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults($SupportConversationBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<$SupportConversation> get serializer =>
      _$$SupportConversationSerializer();
}

class _$$SupportConversationSerializer
    implements PrimitiveSerializer<$SupportConversation> {
  @override
  final Iterable<Type> types = const [
    $SupportConversation,
    _$$SupportConversation
  ];

  @override
  final String wireName = r'$SupportConversation';

  @override
  Object serialize(
    Serializers serializers,
    $SupportConversation object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return serializers.serialize(object,
        specifiedType: FullType(SupportConversation))!;
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required SupportConversationBuilder result,
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
        case r'customerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.customerId = valueDes;
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
        case r'subject':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.subject = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ConversationStatus),
          ) as ConversationStatus;
          result.status = valueDes;
          break;
        case r'unreadCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.unreadCount = valueDes;
          break;
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
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  $SupportConversation deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = $SupportConversationBuilder();
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
