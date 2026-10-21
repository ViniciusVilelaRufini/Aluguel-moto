//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/plan_code.dart';
import 'package:volti_api/src/model/rental_status.dart';
import 'package:volti_api/src/model/insurance_coverage.dart';
import 'package:volti_api/src/model/price_breakdown.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'rental.g.dart';

/// Rental
///
/// Properties:
/// * [id]
/// * [customerId]
/// * [vehicleId] - Moto atual (muda após troca).
/// * [vehicleCode]
/// * [planCode]
/// * [coverage]
/// * [status]
/// * [startedAt]
/// * [pausedAt] - Início da pausa atual.
/// * [endedAt]
/// * [elapsedSeconds]
/// * [pausedSeconds] - Total em pausa.
/// * [costCents] - Valor parcial estimado durante o aluguel; valor final depois do encerramento.
/// * [breakdown]
/// * [couponCode]
/// * [depositId]
/// * [insurancePolicyId]
/// * [paymentId] - Pagamento da liquidação.
/// * [endZoneId]
/// * [returnPhotoObjectKey]
/// * [forceEndReason] - staff.
/// * [forcedEndById] - staff.
/// * [rating]
/// * [speedLimitKmh] - Limite em vigor agora.
/// * [createdAt]
/// * [updatedAt]
@BuiltValue()
abstract class Rental implements Built<Rental, RentalBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'customerId')
  String get customerId;

  /// Moto atual (muda após troca).
  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'vehicleCode')
  String get vehicleCode;

  @BuiltValueField(wireName: r'planCode')
  PlanCode get planCode;
  // enum planCodeEnum {  minute,  hour,  day,  weekly,  monthly,  };

  @BuiltValueField(wireName: r'coverage')
  InsuranceCoverage get coverage;
  // enum coverageEnum {  basic,  full,  };

  @BuiltValueField(wireName: r'status')
  RentalStatus get status;
  // enum statusEnum {  active,  paused,  ending,  ended,  force_ended,  };

  @BuiltValueField(wireName: r'startedAt')
  DateTime get startedAt;

  /// Início da pausa atual.
  @BuiltValueField(wireName: r'pausedAt')
  DateTime? get pausedAt;

  @BuiltValueField(wireName: r'endedAt')
  DateTime? get endedAt;

  @BuiltValueField(wireName: r'elapsedSeconds')
  int get elapsedSeconds;

  /// Total em pausa.
  @BuiltValueField(wireName: r'pausedSeconds')
  int get pausedSeconds;

  /// Valor parcial estimado durante o aluguel; valor final depois do encerramento.
  @BuiltValueField(wireName: r'costCents')
  int get costCents;

  @BuiltValueField(wireName: r'breakdown')
  PriceBreakdown? get breakdown;

  @BuiltValueField(wireName: r'couponCode')
  String? get couponCode;

  @BuiltValueField(wireName: r'depositId')
  String get depositId;

  @BuiltValueField(wireName: r'insurancePolicyId')
  String? get insurancePolicyId;

  /// Pagamento da liquidação.
  @BuiltValueField(wireName: r'paymentId')
  String? get paymentId;

  @BuiltValueField(wireName: r'endZoneId')
  String? get endZoneId;

  @BuiltValueField(wireName: r'returnPhotoObjectKey')
  String? get returnPhotoObjectKey;

  /// staff.
  @BuiltValueField(wireName: r'forceEndReason')
  String? get forceEndReason;

  /// staff.
  @BuiltValueField(wireName: r'forcedEndById')
  String? get forcedEndById;

  @BuiltValueField(wireName: r'rating')
  int? get rating;

  /// Limite em vigor agora.
  @BuiltValueField(wireName: r'speedLimitKmh')
  int? get speedLimitKmh;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime get updatedAt;

  Rental._();

  factory Rental([void updates(RentalBuilder b)]) = _$Rental;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RentalBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Rental> get serializer => _$RentalSerializer();
}

class _$RentalSerializer implements PrimitiveSerializer<Rental> {
  @override
  final Iterable<Type> types = const [Rental, _$Rental];

  @override
  final String wireName = r'Rental';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Rental object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'customerId';
    yield serializers.serialize(
      object.customerId,
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
    yield r'planCode';
    yield serializers.serialize(
      object.planCode,
      specifiedType: const FullType(PlanCode),
    );
    yield r'coverage';
    yield serializers.serialize(
      object.coverage,
      specifiedType: const FullType(InsuranceCoverage),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(RentalStatus),
    );
    yield r'startedAt';
    yield serializers.serialize(
      object.startedAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.pausedAt != null) {
      yield r'pausedAt';
      yield serializers.serialize(
        object.pausedAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.endedAt != null) {
      yield r'endedAt';
      yield serializers.serialize(
        object.endedAt,
        specifiedType: const FullType(DateTime),
      );
    }
    yield r'elapsedSeconds';
    yield serializers.serialize(
      object.elapsedSeconds,
      specifiedType: const FullType(int),
    );
    yield r'pausedSeconds';
    yield serializers.serialize(
      object.pausedSeconds,
      specifiedType: const FullType(int),
    );
    yield r'costCents';
    yield serializers.serialize(
      object.costCents,
      specifiedType: const FullType(int),
    );
    if (object.breakdown != null) {
      yield r'breakdown';
      yield serializers.serialize(
        object.breakdown,
        specifiedType: const FullType(PriceBreakdown),
      );
    }
    if (object.couponCode != null) {
      yield r'couponCode';
      yield serializers.serialize(
        object.couponCode,
        specifiedType: const FullType(String),
      );
    }
    yield r'depositId';
    yield serializers.serialize(
      object.depositId,
      specifiedType: const FullType(String),
    );
    if (object.insurancePolicyId != null) {
      yield r'insurancePolicyId';
      yield serializers.serialize(
        object.insurancePolicyId,
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
    if (object.endZoneId != null) {
      yield r'endZoneId';
      yield serializers.serialize(
        object.endZoneId,
        specifiedType: const FullType(String),
      );
    }
    if (object.returnPhotoObjectKey != null) {
      yield r'returnPhotoObjectKey';
      yield serializers.serialize(
        object.returnPhotoObjectKey,
        specifiedType: const FullType(String),
      );
    }
    if (object.forceEndReason != null) {
      yield r'forceEndReason';
      yield serializers.serialize(
        object.forceEndReason,
        specifiedType: const FullType(String),
      );
    }
    if (object.forcedEndById != null) {
      yield r'forcedEndById';
      yield serializers.serialize(
        object.forcedEndById,
        specifiedType: const FullType(String),
      );
    }
    if (object.rating != null) {
      yield r'rating';
      yield serializers.serialize(
        object.rating,
        specifiedType: const FullType(int),
      );
    }
    if (object.speedLimitKmh != null) {
      yield r'speedLimitKmh';
      yield serializers.serialize(
        object.speedLimitKmh,
        specifiedType: const FullType(int),
      );
    }
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'updatedAt';
    yield serializers.serialize(
      object.updatedAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    Rental object, {
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
    required RentalBuilder result,
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
        case r'customerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.customerId = valueDes;
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
        case r'planCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PlanCode),
          ) as PlanCode;
          result.planCode = valueDes;
          break;
        case r'coverage':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(InsuranceCoverage),
          ) as InsuranceCoverage;
          result.coverage = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(RentalStatus),
          ) as RentalStatus;
          result.status = valueDes;
          break;
        case r'startedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.startedAt = valueDes;
          break;
        case r'pausedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.pausedAt = valueDes;
          break;
        case r'endedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.endedAt = valueDes;
          break;
        case r'elapsedSeconds':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.elapsedSeconds = valueDes;
          break;
        case r'pausedSeconds':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.pausedSeconds = valueDes;
          break;
        case r'costCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.costCents = valueDes;
          break;
        case r'breakdown':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(PriceBreakdown),
          ) as PriceBreakdown?;
          if (valueDes == null) continue;
          result.breakdown.replace(valueDes);
          break;
        case r'couponCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.couponCode = valueDes;
          break;
        case r'depositId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.depositId = valueDes;
          break;
        case r'insurancePolicyId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.insurancePolicyId = valueDes;
          break;
        case r'paymentId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.paymentId = valueDes;
          break;
        case r'endZoneId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.endZoneId = valueDes;
          break;
        case r'returnPhotoObjectKey':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.returnPhotoObjectKey = valueDes;
          break;
        case r'forceEndReason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.forceEndReason = valueDes;
          break;
        case r'forcedEndById':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.forcedEndById = valueDes;
          break;
        case r'rating':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.rating = valueDes;
          break;
        case r'speedLimitKmh':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.speedLimitKmh = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        case r'updatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.updatedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Rental deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RentalBuilder();
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
