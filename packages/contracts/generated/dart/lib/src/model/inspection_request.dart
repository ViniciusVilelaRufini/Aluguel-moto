//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/speed_limiter_check.dart';
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/checklist_item.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'inspection_request.g.dart';

/// InspectionRequest
///
/// Properties:
/// * [brakes]
/// * [tires]
/// * [lights]
/// * [bell]
/// * [speedLimiter]
/// * [photoObjectKeys]
/// * [notes]
/// * [recordedAt]
@BuiltValue()
abstract class InspectionRequest
    implements Built<InspectionRequest, InspectionRequestBuilder> {
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

  @BuiltValueField(wireName: r'recordedAt')
  DateTime get recordedAt;

  InspectionRequest._();

  factory InspectionRequest([void updates(InspectionRequestBuilder b)]) =
      _$InspectionRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(InspectionRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<InspectionRequest> get serializer =>
      _$InspectionRequestSerializer();
}

class _$InspectionRequestSerializer
    implements PrimitiveSerializer<InspectionRequest> {
  @override
  final Iterable<Type> types = const [InspectionRequest, _$InspectionRequest];

  @override
  final String wireName = r'InspectionRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    InspectionRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
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
    yield r'recordedAt';
    yield serializers.serialize(
      object.recordedAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    InspectionRequest object, {
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
    required InspectionRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
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
        case r'recordedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.recordedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  InspectionRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = InspectionRequestBuilder();
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
