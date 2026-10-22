//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/plan_code.dart';
import 'package:volti_api/src/model/pickup_mode.dart';
import 'package:volti_api/src/model/vehicle_summary.dart';
import 'package:volti_api/src/model/reservation_status.dart';
import 'package:volti_api/src/model/insurance_coverage.dart';
import 'package:volti_api/src/model/deposit_method.dart';
import 'package:volti_api/src/model/deposit.dart';
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
/// * [expiresAt] - Base da contagem regressiva no app. Galpão: `now` → criação + `pickupNowWindowMinutes`; `scheduled` → `pickupAt` + `scheduledGraceMinutes`.
/// * [depotId] - Só em reserva de galpão.
/// * [pickupMode]
/// * [pickupAt]
/// * [planCode]
/// * [coverage]
/// * [depositMethod]
/// * [deposit]
/// * [pickupCode] - Conteúdo do QR de retirada (assinado, curto, sem dado pessoal). Só na resposta ao cliente dono da reserva.
/// * [handoverId] - Entrega aberta ou concluída (status `handover`/`converted`).
/// * [customerFirstName] - staff. Só o primeiro nome (agenda de retiradas).
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
  // enum statusEnum {  active,  converted,  canceled,  expired,  handover,  };

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  /// Base da contagem regressiva no app. Galpão: `now` → criação + `pickupNowWindowMinutes`; `scheduled` → `pickupAt` + `scheduledGraceMinutes`.
  @BuiltValueField(wireName: r'expiresAt')
  DateTime get expiresAt;

  /// Só em reserva de galpão.
  @BuiltValueField(wireName: r'depotId')
  String? get depotId;

  @BuiltValueField(wireName: r'pickupMode')
  PickupMode? get pickupMode;
  // enum pickupModeEnum {  now,  scheduled,  };

  @BuiltValueField(wireName: r'pickupAt')
  DateTime? get pickupAt;

  @BuiltValueField(wireName: r'planCode')
  PlanCode? get planCode;
  // enum planCodeEnum {  minute,  hour,  day,  weekly,  monthly,  };

  @BuiltValueField(wireName: r'coverage')
  InsuranceCoverage? get coverage;
  // enum coverageEnum {  basic,  full,  };

  @BuiltValueField(wireName: r'depositMethod')
  DepositMethod? get depositMethod;
  // enum depositMethodEnum {  card,  pix,  };

  @BuiltValueField(wireName: r'deposit')
  Deposit? get deposit;

  /// Conteúdo do QR de retirada (assinado, curto, sem dado pessoal). Só na resposta ao cliente dono da reserva.
  @BuiltValueField(wireName: r'pickupCode')
  String? get pickupCode;

  /// Entrega aberta ou concluída (status `handover`/`converted`).
  @BuiltValueField(wireName: r'handoverId')
  String? get handoverId;

  /// staff. Só o primeiro nome (agenda de retiradas).
  @BuiltValueField(wireName: r'customerFirstName')
  String? get customerFirstName;

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
    if (object.depotId != null) {
      yield r'depotId';
      yield serializers.serialize(
        object.depotId,
        specifiedType: const FullType(String),
      );
    }
    if (object.pickupMode != null) {
      yield r'pickupMode';
      yield serializers.serialize(
        object.pickupMode,
        specifiedType: const FullType(PickupMode),
      );
    }
    if (object.pickupAt != null) {
      yield r'pickupAt';
      yield serializers.serialize(
        object.pickupAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.planCode != null) {
      yield r'planCode';
      yield serializers.serialize(
        object.planCode,
        specifiedType: const FullType(PlanCode),
      );
    }
    if (object.coverage != null) {
      yield r'coverage';
      yield serializers.serialize(
        object.coverage,
        specifiedType: const FullType(InsuranceCoverage),
      );
    }
    if (object.depositMethod != null) {
      yield r'depositMethod';
      yield serializers.serialize(
        object.depositMethod,
        specifiedType: const FullType(DepositMethod),
      );
    }
    if (object.deposit != null) {
      yield r'deposit';
      yield serializers.serialize(
        object.deposit,
        specifiedType: const FullType(Deposit),
      );
    }
    if (object.pickupCode != null) {
      yield r'pickupCode';
      yield serializers.serialize(
        object.pickupCode,
        specifiedType: const FullType(String),
      );
    }
    if (object.handoverId != null) {
      yield r'handoverId';
      yield serializers.serialize(
        object.handoverId,
        specifiedType: const FullType(String),
      );
    }
    if (object.customerFirstName != null) {
      yield r'customerFirstName';
      yield serializers.serialize(
        object.customerFirstName,
        specifiedType: const FullType(String),
      );
    }
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
        case r'depotId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.depotId = valueDes;
          break;
        case r'pickupMode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(PickupMode),
          ) as PickupMode?;
          if (valueDes == null) continue;
          result.pickupMode = valueDes;
          break;
        case r'pickupAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.pickupAt = valueDes;
          break;
        case r'planCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(PlanCode),
          ) as PlanCode?;
          if (valueDes == null) continue;
          result.planCode = valueDes;
          break;
        case r'coverage':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(InsuranceCoverage),
          ) as InsuranceCoverage?;
          if (valueDes == null) continue;
          result.coverage = valueDes;
          break;
        case r'depositMethod':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DepositMethod),
          ) as DepositMethod?;
          if (valueDes == null) continue;
          result.depositMethod = valueDes;
          break;
        case r'deposit':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(Deposit),
          ) as Deposit?;
          if (valueDes == null) continue;
          result.deposit.replace(valueDes);
          break;
        case r'pickupCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.pickupCode = valueDes;
          break;
        case r'handoverId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.handoverId = valueDes;
          break;
        case r'customerFirstName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.customerFirstName = valueDes;
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
