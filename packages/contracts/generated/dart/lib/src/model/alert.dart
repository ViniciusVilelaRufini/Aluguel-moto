//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/alert_priority.dart';
import 'package:volti_api/src/model/alert_status.dart';
import 'package:volti_api/src/model/alert_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'alert.g.dart';

/// Alert
///
/// Properties:
/// * [id]
/// * [type]
/// * [priority]
/// * [status]
/// * [vehicleId]
/// * [vehicleCode]
/// * [rentalId]
/// * [depotId] - Galpão do alerta (`battery_stock_low`).
/// * [paymentId] - Pagamento do alerta (`payment_needs_review`).
/// * [message] - Texto pt-BR.
/// * [lat]
/// * [lng]
/// * [assigneeId]
/// * [assigneeName]
/// * [resolution]
/// * [createdAt]
/// * [assignedAt]
/// * [resolvedAt]
@BuiltValue()
abstract class Alert implements Built<Alert, AlertBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'type')
  AlertType get type;
  // enum typeEnum {  out_of_operation_area,  forbidden_zone_entered,  fall_detected,  tamper,  battery_critical,  movement_without_rental,  vehicle_offline,  command_failed,  customer_not_ok,  incident_reported,  speed_limiter_noncompliant,  battery_stock_low,  payment_needs_review,  zone_speed_exceeded,  };

  @BuiltValueField(wireName: r'priority')
  AlertPriority get priority;
  // enum priorityEnum {  low,  medium,  high,  critical,  };

  @BuiltValueField(wireName: r'status')
  AlertStatus get status;
  // enum statusEnum {  open,  assigned,  resolved,  };

  @BuiltValueField(wireName: r'vehicleId')
  String? get vehicleId;

  @BuiltValueField(wireName: r'vehicleCode')
  String? get vehicleCode;

  @BuiltValueField(wireName: r'rentalId')
  String? get rentalId;

  /// Galpão do alerta (`battery_stock_low`).
  @BuiltValueField(wireName: r'depotId')
  String? get depotId;

  /// Pagamento do alerta (`payment_needs_review`).
  @BuiltValueField(wireName: r'paymentId')
  String? get paymentId;

  /// Texto pt-BR.
  @BuiltValueField(wireName: r'message')
  String get message;

  @BuiltValueField(wireName: r'lat')
  double? get lat;

  @BuiltValueField(wireName: r'lng')
  double? get lng;

  @BuiltValueField(wireName: r'assigneeId')
  String? get assigneeId;

  @BuiltValueField(wireName: r'assigneeName')
  String? get assigneeName;

  @BuiltValueField(wireName: r'resolution')
  String? get resolution;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'assignedAt')
  DateTime? get assignedAt;

  @BuiltValueField(wireName: r'resolvedAt')
  DateTime? get resolvedAt;

  Alert._();

  factory Alert([void updates(AlertBuilder b)]) = _$Alert;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AlertBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Alert> get serializer => _$AlertSerializer();
}

class _$AlertSerializer implements PrimitiveSerializer<Alert> {
  @override
  final Iterable<Type> types = const [Alert, _$Alert];

  @override
  final String wireName = r'Alert';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Alert object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(AlertType),
    );
    yield r'priority';
    yield serializers.serialize(
      object.priority,
      specifiedType: const FullType(AlertPriority),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(AlertStatus),
    );
    if (object.vehicleId != null) {
      yield r'vehicleId';
      yield serializers.serialize(
        object.vehicleId,
        specifiedType: const FullType(String),
      );
    }
    if (object.vehicleCode != null) {
      yield r'vehicleCode';
      yield serializers.serialize(
        object.vehicleCode,
        specifiedType: const FullType(String),
      );
    }
    if (object.rentalId != null) {
      yield r'rentalId';
      yield serializers.serialize(
        object.rentalId,
        specifiedType: const FullType(String),
      );
    }
    if (object.depotId != null) {
      yield r'depotId';
      yield serializers.serialize(
        object.depotId,
        specifiedType: const FullType(String),
      );
    }
    if (object.paymentId != null) {
      yield r'paymentId';
      yield serializers.serialize(
        object.paymentId,
        specifiedType: const FullType(String),
      );
    }
    yield r'message';
    yield serializers.serialize(
      object.message,
      specifiedType: const FullType(String),
    );
    if (object.lat != null) {
      yield r'lat';
      yield serializers.serialize(
        object.lat,
        specifiedType: const FullType(double),
      );
    }
    if (object.lng != null) {
      yield r'lng';
      yield serializers.serialize(
        object.lng,
        specifiedType: const FullType(double),
      );
    }
    if (object.assigneeId != null) {
      yield r'assigneeId';
      yield serializers.serialize(
        object.assigneeId,
        specifiedType: const FullType(String),
      );
    }
    if (object.assigneeName != null) {
      yield r'assigneeName';
      yield serializers.serialize(
        object.assigneeName,
        specifiedType: const FullType(String),
      );
    }
    if (object.resolution != null) {
      yield r'resolution';
      yield serializers.serialize(
        object.resolution,
        specifiedType: const FullType(String),
      );
    }
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.assignedAt != null) {
      yield r'assignedAt';
      yield serializers.serialize(
        object.assignedAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.resolvedAt != null) {
      yield r'resolvedAt';
      yield serializers.serialize(
        object.resolvedAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    Alert object, {
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
    required AlertBuilder result,
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
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AlertType),
          ) as AlertType;
          result.type = valueDes;
          break;
        case r'priority':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AlertPriority),
          ) as AlertPriority;
          result.priority = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AlertStatus),
          ) as AlertStatus;
          result.status = valueDes;
          break;
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleId = valueDes;
          break;
        case r'vehicleCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleCode = valueDes;
          break;
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.rentalId = valueDes;
          break;
        case r'depotId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.depotId = valueDes;
          break;
        case r'paymentId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.paymentId = valueDes;
          break;
        case r'message':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.message = valueDes;
          break;
        case r'lat':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.lat = valueDes;
          break;
        case r'lng':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.lng = valueDes;
          break;
        case r'assigneeId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.assigneeId = valueDes;
          break;
        case r'assigneeName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.assigneeName = valueDes;
          break;
        case r'resolution':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.resolution = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'assignedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.assignedAt = valueDes;
          break;
        case r'resolvedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.resolvedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Alert deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AlertBuilder();
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
