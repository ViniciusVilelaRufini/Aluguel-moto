//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/vehicle_summary.dart';
import 'package:volti_api/src/model/reservation_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'reservation.g.dart';

/// Reservation
///
/// Properties:
/// * [id]
/// * [vehicleId]
/// * [vehicle]
/// * [status]
/// * [createdAt]
/// * [expiresAt] - Base da contagem regressiva no app.
@BuiltValue()
abstract class Reservation implements Built<Reservation, ReservationBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'vehicle')
  VehicleSummary? get vehicle;

  @BuiltValueField(wireName: r'status')
  ReservationStatus get status;
  // enum statusEnum {  active,  converted,  canceled,  expired,  };

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  /// Base da contagem regressiva no app.
  @BuiltValueField(wireName: r'expiresAt')
  DateTime get expiresAt;

  Reservation._();

  factory Reservation([void updates(ReservationBuilder b)]) = _$Reservation;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ReservationBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Reservation> get serializer => _$ReservationSerializer();
}

class _$ReservationSerializer implements PrimitiveSerializer<Reservation> {
  @override
  final Iterable<Type> types = const [Reservation, _$Reservation];

  @override
  final String wireName = r'Reservation';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Reservation object, {
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
    if (object.vehicle != null) {
      yield r'vehicle';
      yield serializers.serialize(
        object.vehicle,
        specifiedType: const FullType(VehicleSummary),
      );
    }
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(ReservationStatus),
    );
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'expiresAt';
    yield serializers.serialize(
      object.expiresAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    Reservation object, {
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
    required ReservationBuilder result,
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
        case r'vehicle':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(VehicleSummary),
          ) as VehicleSummary?;
          if (valueDes == null) continue;
          result.vehicle.replace(valueDes);
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ReservationStatus),
          ) as ReservationStatus;
          result.status = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'expiresAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.expiresAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Reservation deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ReservationBuilder();
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
