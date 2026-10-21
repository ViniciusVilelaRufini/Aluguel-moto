//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/support_message.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'support_message_page.g.dart';

/// SupportMessagePage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class SupportMessagePage
    implements Built<SupportMessagePage, SupportMessagePageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<SupportMessage> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  SupportMessagePage._();

  factory SupportMessagePage([void updates(SupportMessagePageBuilder b)]) =
      _$SupportMessagePage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(SupportMessagePageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<SupportMessagePage> get serializer =>
      _$SupportMessagePageSerializer();
}

class _$SupportMessagePageSerializer
    implements PrimitiveSerializer<SupportMessagePage> {
  @override
  final Iterable<Type> types = const [SupportMessagePage, _$SupportMessagePage];

  @override
  final String wireName = r'SupportMessagePage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    SupportMessagePage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(SupportMessage)]),
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
    SupportMessagePage object, {
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
    required SupportMessagePageBuilder result,
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
                const FullType(BuiltList, [FullType(SupportMessage)]),
          ) as BuiltList<SupportMessage>;
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
  SupportMessagePage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = SupportMessagePageBuilder();
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
