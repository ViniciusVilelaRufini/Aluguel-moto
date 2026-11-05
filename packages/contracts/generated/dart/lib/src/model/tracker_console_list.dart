//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/tracker_console_command.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'tracker_console_list.g.dart';

/// TrackerConsoleList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class TrackerConsoleList
    implements Built<TrackerConsoleList, TrackerConsoleListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<TrackerConsoleCommand> get items;

  TrackerConsoleList._();

  factory TrackerConsoleList([void updates(TrackerConsoleListBuilder b)]) =
      _$TrackerConsoleList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(TrackerConsoleListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<TrackerConsoleList> get serializer =>
      _$TrackerConsoleListSerializer();
}

class _$TrackerConsoleListSerializer
    implements PrimitiveSerializer<TrackerConsoleList> {
  @override
  final Iterable<Type> types = const [TrackerConsoleList, _$TrackerConsoleList];

  @override
  final String wireName = r'TrackerConsoleList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    TrackerConsoleList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType:
          const FullType(BuiltList, [FullType(TrackerConsoleCommand)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    TrackerConsoleList object, {
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
    required TrackerConsoleListBuilder result,
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
                const FullType(BuiltList, [FullType(TrackerConsoleCommand)]),
          ) as BuiltList<TrackerConsoleCommand>;
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
  TrackerConsoleList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = TrackerConsoleListBuilder();
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
