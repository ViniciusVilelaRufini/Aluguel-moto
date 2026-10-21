//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/maintenance_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'maintenance_task_update.g.dart';

/// MaintenanceTaskUpdate
///
/// Properties:
/// * [title]
/// * [description]
/// * [status]
/// * [scheduledFor]
/// * [notes]
@BuiltValue()
abstract class MaintenanceTaskUpdate
    implements Built<MaintenanceTaskUpdate, MaintenanceTaskUpdateBuilder> {
  @BuiltValueField(wireName: r'title')
  String? get title;

  @BuiltValueField(wireName: r'description')
  String? get description;

  @BuiltValueField(wireName: r'status')
  MaintenanceStatus? get status;
  // enum statusEnum {  scheduled,  in_progress,  done,  canceled,  };

  @BuiltValueField(wireName: r'scheduledFor')
  DateTime? get scheduledFor;

  @BuiltValueField(wireName: r'notes')
  String? get notes;

  MaintenanceTaskUpdate._();

  factory MaintenanceTaskUpdate(
      [void updates(MaintenanceTaskUpdateBuilder b)]) = _$MaintenanceTaskUpdate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(MaintenanceTaskUpdateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<MaintenanceTaskUpdate> get serializer =>
      _$MaintenanceTaskUpdateSerializer();
}

class _$MaintenanceTaskUpdateSerializer
    implements PrimitiveSerializer<MaintenanceTaskUpdate> {
  @override
  final Iterable<Type> types = const [
    MaintenanceTaskUpdate,
    _$MaintenanceTaskUpdate
  ];

  @override
  final String wireName = r'MaintenanceTaskUpdate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    MaintenanceTaskUpdate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.title != null) {
      yield r'title';
      yield serializers.serialize(
        object.title,
        specifiedType: const FullType(String),
      );
    }
    if (object.description != null) {
      yield r'description';
      yield serializers.serialize(
        object.description,
        specifiedType: const FullType(String),
      );
    }
    if (object.status != null) {
      yield r'status';
      yield serializers.serialize(
        object.status,
        specifiedType: const FullType(MaintenanceStatus),
      );
    }
    if (object.scheduledFor != null) {
      yield r'scheduledFor';
      yield serializers.serialize(
        object.scheduledFor,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.notes != null) {
      yield r'notes';
      yield serializers.serialize(
        object.notes,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    MaintenanceTaskUpdate object, {
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
    required MaintenanceTaskUpdateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'title':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.title = valueDes;
          break;
        case r'description':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.description = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(MaintenanceStatus),
          ) as MaintenanceStatus?;
          if (valueDes == null) continue;
          result.status = valueDes;
          break;
        case r'scheduledFor':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.scheduledFor = valueDes;
          break;
        case r'notes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.notes = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  MaintenanceTaskUpdate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = MaintenanceTaskUpdateBuilder();
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
