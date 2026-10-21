//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/speed_limiter_check.dart';
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/checklist_item.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'inspection.g.dart';

/// Inspection
///
/// Properties:
/// * [id]
/// * [fieldTaskId]
/// * [vehicleId]
/// * [inspectorId]
/// * [brakes]
/// * [tires]
/// * [lights]
/// * [bell]
/// * [speedLimiter]
/// * [photoObjectKeys]
/// * [notes]
/// * [passed] - Todos os itens ok.
/// * [recordedAt]
/// * [createdAt]
@BuiltValue()
abstract class Inspection implements Built<Inspection, InspectionBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'fieldTaskId')
  String get fieldTaskId;

  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'inspectorId')
  String get inspectorId;

  @BuiltValueField(wireName: r'brakes')
  ChecklistItem get brakes;

  @BuiltValueField(wireName: r'tires')
  ChecklistItem get tires;

  @BuiltValueField(wireName: r'lights')
  ChecklistItem get lights;

  @BuiltValueField(wireName: r'bell')
  ChecklistItem get bell;

  @BuiltValueField(wireName: r'speedLimiter')
  SpeedLimiterCheck get speedLimiter;

  @BuiltValueField(wireName: r'photoObjectKeys')
  BuiltList<String> get photoObjectKeys;

  @BuiltValueField(wireName: r'notes')
  String? get notes;

  /// Todos os itens ok.
  @BuiltValueField(wireName: r'passed')
  bool get passed;

  @BuiltValueField(wireName: r'recordedAt')
  DateTime get recordedAt;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  Inspection._();

  factory Inspection([void updates(InspectionBuilder b)]) = _$Inspection;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(InspectionBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Inspection> get serializer => _$InspectionSerializer();
}

class _$InspectionSerializer implements PrimitiveSerializer<Inspection> {
  @override
  final Iterable<Type> types = const [Inspection, _$Inspection];

  @override
  final String wireName = r'Inspection';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Inspection object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'fieldTaskId';
    yield serializers.serialize(
      object.fieldTaskId,
      specifiedType: const FullType(String),
    );
    yield r'vehicleId';
    yield serializers.serialize(
      object.vehicleId,
      specifiedType: const FullType(String),
    );
    yield r'inspectorId';
    yield serializers.serialize(
      object.inspectorId,
      specifiedType: const FullType(String),
    );
    yield r'brakes';
    yield serializers.serialize(
      object.brakes,
      specifiedType: const FullType(ChecklistItem),
    );
    yield r'tires';
    yield serializers.serialize(
      object.tires,
      specifiedType: const FullType(ChecklistItem),
    );
    yield r'lights';
    yield serializers.serialize(
      object.lights,
      specifiedType: const FullType(ChecklistItem),
    );
    yield r'bell';
    yield serializers.serialize(
      object.bell,
      specifiedType: const FullType(ChecklistItem),
    );
    yield r'speedLimiter';
    yield serializers.serialize(
      object.speedLimiter,
      specifiedType: const FullType(SpeedLimiterCheck),
    );
    yield r'photoObjectKeys';
    yield serializers.serialize(
      object.photoObjectKeys,
      specifiedType: const FullType(BuiltList, [FullType(String)]),
    );
    if (object.notes != null) {
      yield r'notes';
      yield serializers.serialize(
        object.notes,
        specifiedType: const FullType(String),
      );
    }
    yield r'passed';
    yield serializers.serialize(
      object.passed,
      specifiedType: const FullType(bool),
    );
    yield r'recordedAt';
    yield serializers.serialize(
      object.recordedAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    Inspection object, {
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
    required InspectionBuilder result,
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
        case r'fieldTaskId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.fieldTaskId = valueDes;
          break;
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.vehicleId = valueDes;
          break;
        case r'inspectorId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.inspectorId = valueDes;
          break;
        case r'brakes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ChecklistItem),
          ) as ChecklistItem;
          result.brakes.replace(valueDes);
          break;
        case r'tires':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ChecklistItem),
          ) as ChecklistItem;
          result.tires.replace(valueDes);
          break;
        case r'lights':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ChecklistItem),
          ) as ChecklistItem;
          result.lights.replace(valueDes);
          break;
        case r'bell':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ChecklistItem),
          ) as ChecklistItem;
          result.bell.replace(valueDes);
          break;
        case r'speedLimiter':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(SpeedLimiterCheck),
          ) as SpeedLimiterCheck;
          result.speedLimiter.replace(valueDes);
          break;
        case r'photoObjectKeys':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.photoObjectKeys.replace(valueDes);
          break;
        case r'notes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.notes = valueDes;
          break;
        case r'passed':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.passed = valueDes;
          break;
        case r'recordedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.recordedAt = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Inspection deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = InspectionBuilder();
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
