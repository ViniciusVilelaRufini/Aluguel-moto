//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'support_message_create.g.dart';

/// SupportMessageCreate
///
/// Properties:
/// * [body]
/// * [attachmentObjectKeys]
@BuiltValue()
abstract class SupportMessageCreate
    implements Built<SupportMessageCreate, SupportMessageCreateBuilder> {
  @BuiltValueField(wireName: r'body')
  String get body;

  @BuiltValueField(wireName: r'attachmentObjectKeys')
  BuiltList<String>? get attachmentObjectKeys;

  SupportMessageCreate._();

  factory SupportMessageCreate([void updates(SupportMessageCreateBuilder b)]) =
      _$SupportMessageCreate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SupportMessageCreateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SupportMessageCreate> get serializer =>
      _$SupportMessageCreateSerializer();
}

class _$SupportMessageCreateSerializer
    implements PrimitiveSerializer<SupportMessageCreate> {
  @override
  final Iterable<Type> types = const [
    SupportMessageCreate,
    _$SupportMessageCreate
  ];

  @override
  final String wireName = r'SupportMessageCreate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SupportMessageCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
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
  }

  @override
  Object serialize(
    Serializers serializers,
    SupportMessageCreate object, {
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
    required SupportMessageCreateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
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
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  SupportMessageCreate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SupportMessageCreateBuilder();
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
