//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/maintenance_kind.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'maintenance_task_create.g.dart';

/// MaintenanceTaskCreate
///
/// Properties:
/// * [vehicleId]
/// * [kind]
/// * [title]
/// * [description]
/// * [scheduledFor]
/// * [createFieldTask] - Cria também uma tarefa de campo `maintenance`.
@BuiltValue()
abstract class MaintenanceTaskCreate
    implements Built<MaintenanceTaskCreate, MaintenanceTaskCreateBuilder> {
  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'kind')
  MaintenanceKind get kind;
  // enum kindEnum {  preventive,  corrective,  };

  @BuiltValueField(wireName: r'title')
  String get title;

  @BuiltValueField(wireName: r'description')
  String? get description;

  @BuiltValueField(wireName: r'scheduledFor')
  DateTime? get scheduledFor;

  /// Cria também uma tarefa de campo `maintenance`.
  @BuiltValueField(wireName: r'createFieldTask')
  bool? get createFieldTask;

  MaintenanceTaskCreate._();

  factory MaintenanceTaskCreate(
      [void updates(MaintenanceTaskCreateBuilder b)]) = _$MaintenanceTaskCreate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(MaintenanceTaskCreateBuilder b) =>
      b..createFieldTask = false;

  @BuiltValueSerializer(custom: true)
  static Serializer<MaintenanceTaskCreate> get serializer =>
      _$MaintenanceTaskCreateSerializer();
}

class _$MaintenanceTaskCreateSerializer
    implements PrimitiveSerializer<MaintenanceTaskCreate> {
  @override
  final Iterable<Type> types = const [
    MaintenanceTaskCreate,
    _$MaintenanceTaskCreate
  ];

  @override
  final String wireName = r'MaintenanceTaskCreate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    MaintenanceTaskCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'vehicleId';
    yield serializers.serialize(
      object.vehicleId,
      specifiedType: const FullType(String),
    );
    yield r'kind';
    yield serializers.serialize(
      object.kind,
      specifiedType: const FullType(MaintenanceKind),
    );
    yield r'title';
    yield serializers.serialize(
      object.title,
      specifiedType: const FullType(String),
    );
    if (object.description != null) {
      yield r'description';
      yield serializers.serialize(
        object.description,
        specifiedType: const FullType(String),
      );
    }
    if (object.scheduledFor != null) {
      yield r'scheduledFor';
      yield serializers.serialize(
        object.scheduledFor,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.createFieldTask != null) {
      yield r'createFieldTask';
      yield serializers.serialize(
        object.createFieldTask,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    MaintenanceTaskCreate object, {
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
    required MaintenanceTaskCreateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.vehicleId = valueDes;
          break;
        case r'kind':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(MaintenanceKind),
          ) as MaintenanceKind;
          result.kind = valueDes;
          break;
        case r'title':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
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
        case r'scheduledFor':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.scheduledFor = valueDes;
          break;
        case r'createFieldTask':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.createFieldTask = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  MaintenanceTaskCreate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = MaintenanceTaskCreateBuilder();
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
