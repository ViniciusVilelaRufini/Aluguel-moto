//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/maintenance_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'customer_maintenance_request.g.dart';

/// CustomerMaintenanceRequest
///
/// Properties:
/// * [id] - Id da `MaintenanceTask`.
/// * [vehicleId]
/// * [vehicleCode]
/// * [status]
/// * [scheduledFor]
/// * [location]
/// * [description]
/// * [createdAt]
@BuiltValue()
abstract class CustomerMaintenanceRequest
    implements
        Built<CustomerMaintenanceRequest, CustomerMaintenanceRequestBuilder> {
  /// Id da `MaintenanceTask`.
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'vehicleCode')
  String get vehicleCode;

  @BuiltValueField(wireName: r'status')
  MaintenanceStatus get status;
  // enum statusEnum {  scheduled,  in_progress,  done,  canceled,  };

  @BuiltValueField(wireName: r'scheduledFor')
  DateTime get scheduledFor;

  @BuiltValueField(wireName: r'location')
  String? get location;

  @BuiltValueField(wireName: r'description')
  String get description;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  CustomerMaintenanceRequest._();

  factory CustomerMaintenanceRequest(
          [void updates(CustomerMaintenanceRequestBuilder b)]) =
      _$CustomerMaintenanceRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CustomerMaintenanceRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CustomerMaintenanceRequest> get serializer =>
      _$CustomerMaintenanceRequestSerializer();
}

class _$CustomerMaintenanceRequestSerializer
    implements PrimitiveSerializer<CustomerMaintenanceRequest> {
  @override
  final Iterable<Type> types = const [
    CustomerMaintenanceRequest,
    _$CustomerMaintenanceRequest
  ];

  @override
  final String wireName = r'CustomerMaintenanceRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CustomerMaintenanceRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
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
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(MaintenanceStatus),
    );
    yield r'scheduledFor';
    yield serializers.serialize(
      object.scheduledFor,
      specifiedType: const FullType(DateTime),
    );
    if (object.location != null) {
      yield r'location';
      yield serializers.serialize(
        object.location,
        specifiedType: const FullType(String),
      );
    }
    yield r'description';
    yield serializers.serialize(
      object.description,
      specifiedType: const FullType(String),
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
    CustomerMaintenanceRequest object, {
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
    required CustomerMaintenanceRequestBuilder result,
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
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(MaintenanceStatus),
          ) as MaintenanceStatus;
          result.status = valueDes;
          break;
        case r'scheduledFor':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.scheduledFor = valueDes;
          break;
        case r'location':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.location = valueDes;
          break;
        case r'description':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.description = valueDes;
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
  CustomerMaintenanceRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CustomerMaintenanceRequestBuilder();
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
