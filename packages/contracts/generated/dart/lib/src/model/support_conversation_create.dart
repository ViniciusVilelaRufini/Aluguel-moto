//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'support_conversation_create.g.dart';

/// SupportConversationCreate
///
/// Properties:
/// * [subject]
/// * [message]
/// * [rentalId]
@BuiltValue()
abstract class SupportConversationCreate
    implements
        Built<SupportConversationCreate, SupportConversationCreateBuilder> {
  @BuiltValueField(wireName: r'subject')
  String get subject;

  @BuiltValueField(wireName: r'message')
  String get message;

  @BuiltValueField(wireName: r'rentalId')
  String? get rentalId;

  SupportConversationCreate._();

  factory SupportConversationCreate(
          [void updates(SupportConversationCreateBuilder b)]) =
      _$SupportConversationCreate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SupportConversationCreateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SupportConversationCreate> get serializer =>
      _$SupportConversationCreateSerializer();
}

class _$SupportConversationCreateSerializer
    implements PrimitiveSerializer<SupportConversationCreate> {
  @override
  final Iterable<Type> types = const [
    SupportConversationCreate,
    _$SupportConversationCreate
  ];

  @override
  final String wireName = r'SupportConversationCreate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SupportConversationCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'subject';
    yield serializers.serialize(
      object.subject,
      specifiedType: const FullType(String),
    );
    yield r'message';
    yield serializers.serialize(
      object.message,
      specifiedType: const FullType(String),
    );
    if (object.rentalId != null) {
      yield r'rentalId';
      yield serializers.serialize(
        object.rentalId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    SupportConversationCreate object, {
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
    required SupportConversationCreateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'subject':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.subject = valueDes;
          break;
        case r'message':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.message = valueDes;
          break;
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.rentalId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SupportConversationCreate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SupportConversationCreateBuilder();
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
