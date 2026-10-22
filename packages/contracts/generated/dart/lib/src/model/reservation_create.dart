//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/plan_code.dart';
import 'package:volti_api/src/model/pickup_mode.dart';
import 'package:volti_api/src/model/insurance_coverage.dart';
import 'package:volti_api/src/model/deposit_method.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'reservation_create.g.dart';

/// Só `vehicleId` = reserva de rua (fluxo antigo, 15 min). Com `depotId` = reserva de retirada no galpão: exige `pickupMode`, `planCode`, `coverage` e `depositMethod` (`400`), e `pickupAt` em `scheduled`.
///
/// Properties:
/// * [vehicleId]
/// * [depotId]
/// * [pickupMode]
/// * [pickupAt] - Obrigatório em `scheduled`: dentro do funcionamento e de `maxScheduleDays`.
/// * [planCode]
/// * [coverage]
/// * [depositMethod]
/// * [cardId] - Cartão da caução com `depositMethod: card` (ausente = cartão padrão).
/// * [couponCode] - Cupom aplicado ao plano na entrega.
@BuiltValue()
abstract class ReservationCreate
    implements Built<ReservationCreate, ReservationCreateBuilder> {
  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'depotId')
  String? get depotId;

  @BuiltValueField(wireName: r'pickupMode')
  PickupMode? get pickupMode;
  // enum pickupModeEnum {  now,  scheduled,  };

  /// Obrigatório em `scheduled`: dentro do funcionamento e de `maxScheduleDays`.
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

  /// Cartão da caução com `depositMethod: card` (ausente = cartão padrão).
  @BuiltValueField(wireName: r'cardId')
  String? get cardId;

  /// Cupom aplicado ao plano na entrega.
  @BuiltValueField(wireName: r'couponCode')
  String? get couponCode;

  ReservationCreate._();

  factory ReservationCreate([void updates(ReservationCreateBuilder b)]) =
      _$ReservationCreate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ReservationCreateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ReservationCreate> get serializer =>
      _$ReservationCreateSerializer();
}

class _$ReservationCreateSerializer
    implements PrimitiveSerializer<ReservationCreate> {
  @override
  final Iterable<Type> types = const [ReservationCreate, _$ReservationCreate];

  @override
  final String wireName = r'ReservationCreate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ReservationCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'vehicleId';
    yield serializers.serialize(
      object.vehicleId,
      specifiedType: const FullType(String),
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
    if (object.cardId != null) {
      yield r'cardId';
      yield serializers.serialize(
        object.cardId,
        specifiedType: const FullType(String),
      );
    }
    if (object.couponCode != null) {
      yield r'couponCode';
      yield serializers.serialize(
        object.couponCode,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    ReservationCreate object, {
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
    required ReservationCreateBuilder result,
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
        case r'cardId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.cardId = valueDes;
          break;
        case r'couponCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.couponCode = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  ReservationCreate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ReservationCreateBuilder();
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
