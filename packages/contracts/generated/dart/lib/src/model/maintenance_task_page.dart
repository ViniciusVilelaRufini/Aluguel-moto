//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/maintenance_task.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'maintenance_task_page.g.dart';

/// MaintenanceTaskPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class MaintenanceTaskPage
    implements Built<MaintenanceTaskPage, MaintenanceTaskPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<MaintenanceTask> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  MaintenanceTaskPage._();

  factory MaintenanceTaskPage([void updates(MaintenanceTaskPageBuilder b)]) =
      _$MaintenanceTaskPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(MaintenanceTaskPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<MaintenanceTaskPage> get serializer =>
      _$MaintenanceTaskPageSerializer();
}

class _$MaintenanceTaskPageSerializer
    implements PrimitiveSerializer<MaintenanceTaskPage> {
  @override
  final Iterable<Type> types = const [
    MaintenanceTaskPage,
    _$MaintenanceTaskPage
  ];

  @override
  final String wireName = r'MaintenanceTaskPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    MaintenanceTaskPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(MaintenanceTask)]),
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
    MaintenanceTaskPage object, {
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
    required MaintenanceTaskPageBuilder result,
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
                const FullType(BuiltList, [FullType(MaintenanceTask)]),
          ) as BuiltList<MaintenanceTask>;
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
  MaintenanceTaskPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = MaintenanceTaskPageBuilder();
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
