//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/handover.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'handover_page.g.dart';

/// HandoverPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class HandoverPage
    implements Built<HandoverPage, HandoverPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<Handover> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  HandoverPage._();

  factory HandoverPage([void updates(HandoverPageBuilder b)]) = _$HandoverPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(HandoverPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<HandoverPage> get serializer => _$HandoverPageSerializer();
}

class _$HandoverPageSerializer implements PrimitiveSerializer<HandoverPage> {
  @override
  final Iterable<Type> types = const [HandoverPage, _$HandoverPage];

  @override
  final String wireName = r'HandoverPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    HandoverPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Handover)]),
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
    HandoverPage object, {
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
    required HandoverPageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Handover)]),
          ) as BuiltList<Handover>;
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
  HandoverPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = HandoverPageBuilder();
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
