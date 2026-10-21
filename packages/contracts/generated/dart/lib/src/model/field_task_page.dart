//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/field_task.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'field_task_page.g.dart';

/// FieldTaskPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class FieldTaskPage
    implements Built<FieldTaskPage, FieldTaskPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<FieldTask> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  FieldTaskPage._();

  factory FieldTaskPage([void updates(FieldTaskPageBuilder b)]) =
      _$FieldTaskPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(FieldTaskPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<FieldTaskPage> get serializer =>
      _$FieldTaskPageSerializer();
}

class _$FieldTaskPageSerializer implements PrimitiveSerializer<FieldTaskPage> {
  @override
  final Iterable<Type> types = const [FieldTaskPage, _$FieldTaskPage];

  @override
  final String wireName = r'FieldTaskPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    FieldTaskPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(FieldTask)]),
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
    FieldTaskPage object, {
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
    required FieldTaskPageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(FieldTask)]),
          ) as BuiltList<FieldTask>;
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
  FieldTaskPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = FieldTaskPageBuilder();
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
