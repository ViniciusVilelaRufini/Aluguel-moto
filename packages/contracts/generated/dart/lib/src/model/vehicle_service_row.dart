//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/vehicle_service_info.dart';
import 'package:volti_api/src/model/vehicle_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_service_row.g.dart';

/// VehicleServiceRow
///
/// Properties:
/// * [vehicleId]
/// * [vehicleCode]
/// * [model]
/// * [vehicleStatus]
/// * [service]
/// * [openMaintenanceTaskId] - Manutenção preventiva em aberto (agendada ou em andamento).
/// * [scheduledFor] - Data da manutenção em aberto.
@BuiltValue()
abstract class VehicleServiceRow
    implements Built<VehicleServiceRow, VehicleServiceRowBuilder> {
  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'vehicleCode')
  String get vehicleCode;

  @BuiltValueField(wireName: r'model')
  String get model;

  @BuiltValueField(wireName: r'vehicleStatus')
  VehicleStatus get vehicleStatus;
  // enum vehicleStatusEnum {  free,  rented,  reserved,  paused,  blocked,  maintenance,  offline,  };

  @BuiltValueField(wireName: r'service')
  VehicleServiceInfo get service;

  /// Manutenção preventiva em aberto (agendada ou em andamento).
  @BuiltValueField(wireName: r'openMaintenanceTaskId')
  String? get openMaintenanceTaskId;

  /// Data da manutenção em aberto.
  @BuiltValueField(wireName: r'scheduledFor')
  DateTime? get scheduledFor;

  VehicleServiceRow._();

  factory VehicleServiceRow([void updates(VehicleServiceRowBuilder b)]) =
      _$VehicleServiceRow;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleServiceRowBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleServiceRow> get serializer =>
      _$VehicleServiceRowSerializer();
}

class _$VehicleServiceRowSerializer
    implements PrimitiveSerializer<VehicleServiceRow> {
  @override
  final Iterable<Type> types = const [VehicleServiceRow, _$VehicleServiceRow];

  @override
  final String wireName = r'VehicleServiceRow';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleServiceRow object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'vehicleId';
    yield serializers.serialize(
      object.vehicleId,
      specifiedType: const FullType(String),
    );
    yield r'vehicleCode';
    yield serializers.serialize(
      object.vehicleCode,
      specifiedType: const FullType(String),
    );
    yield r'model';
    yield serializers.serialize(
      object.model,
      specifiedType: const FullType(String),
    );
    yield r'vehicleStatus';
    yield serializers.serialize(
      object.vehicleStatus,
      specifiedType: const FullType(VehicleStatus),
    );
    yield r'service';
    yield serializers.serialize(
      object.service,
      specifiedType: const FullType(VehicleServiceInfo),
    );
    if (object.openMaintenanceTaskId != null) {
      yield r'openMaintenanceTaskId';
      yield serializers.serialize(
        object.openMaintenanceTaskId,
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
  }

  @override
  Object serialize(
    Serializers serializers,
    VehicleServiceRow object, {
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
    required VehicleServiceRowBuilder result,
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
        case r'vehicleCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.vehicleCode = valueDes;
          break;
        case r'model':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.model = valueDes;
          break;
        case r'vehicleStatus':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(VehicleStatus),
          ) as VehicleStatus;
          result.vehicleStatus = valueDes;
          break;
        case r'service':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(VehicleServiceInfo),
          ) as VehicleServiceInfo;
          result.service.replace(valueDes);
          break;
        case r'openMaintenanceTaskId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.openMaintenanceTaskId = valueDes;
          break;
        case r'scheduledFor':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.scheduledFor = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  VehicleServiceRow deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleServiceRowBuilder();
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
