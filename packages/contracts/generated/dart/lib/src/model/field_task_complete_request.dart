//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/service_vehicle_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'field_task_complete_request.g.dart';

/// FieldTaskCompleteRequest
///
/// Properties:
/// * [notes]
/// * [vehicleStatus]
/// * [depotId] - Tarefa `collect`: galpão onde a moto chegou; a moto volta a `free` com esse `depotId`.
/// * [completedAt] - Instante real (modo offline).
@BuiltValue()
abstract class FieldTaskCompleteRequest
    implements
        Built<FieldTaskCompleteRequest, FieldTaskCompleteRequestBuilder> {
  @BuiltValueField(wireName: r'notes')
  String? get notes;

  @BuiltValueField(wireName: r'vehicleStatus')
  ServiceVehicleStatus? get vehicleStatus;
  // enum vehicleStatusEnum {  free,  maintenance,  };

  /// Tarefa `collect`: galpão onde a moto chegou; a moto volta a `free` com esse `depotId`.
  @BuiltValueField(wireName: r'depotId')
  String? get depotId;

  /// Instante real (modo offline).
  @BuiltValueField(wireName: r'completedAt')
  DateTime? get completedAt;

  FieldTaskCompleteRequest._();

  factory FieldTaskCompleteRequest(
          [void updates(FieldTaskCompleteRequestBuilder b)]) =
      _$FieldTaskCompleteRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(FieldTaskCompleteRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<FieldTaskCompleteRequest> get serializer =>
      _$FieldTaskCompleteRequestSerializer();
}

class _$FieldTaskCompleteRequestSerializer
    implements PrimitiveSerializer<FieldTaskCompleteRequest> {
  @override
  final Iterable<Type> types = const [
    FieldTaskCompleteRequest,
    _$FieldTaskCompleteRequest
  ];

  @override
  final String wireName = r'FieldTaskCompleteRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    FieldTaskCompleteRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.notes != null) {
      yield r'notes';
      yield serializers.serialize(
        object.notes,
        specifiedType: const FullType(String),
      );
    }
    if (object.vehicleStatus != null) {
      yield r'vehicleStatus';
      yield serializers.serialize(
        object.vehicleStatus,
        specifiedType: const FullType(ServiceVehicleStatus),
      );
    }
    if (object.depotId != null) {
      yield r'depotId';
      yield serializers.serialize(
        object.depotId,
        specifiedType: const FullType(String),
      );
    }
    if (object.completedAt != null) {
      yield r'completedAt';
      yield serializers.serialize(
        object.completedAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    FieldTaskCompleteRequest object, {
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
    required FieldTaskCompleteRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'notes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.notes = valueDes;
          break;
        case r'vehicleStatus':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(ServiceVehicleStatus),
          ) as ServiceVehicleStatus?;
          if (valueDes == null) continue;
          result.vehicleStatus = valueDes;
          break;
        case r'depotId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.depotId = valueDes;
          break;
        case r'completedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.completedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  FieldTaskCompleteRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = FieldTaskCompleteRequestBuilder();
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
