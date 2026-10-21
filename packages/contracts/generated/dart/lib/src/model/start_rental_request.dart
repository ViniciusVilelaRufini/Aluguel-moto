//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/plan_code.dart';
import 'package:volti_api/src/model/insurance_coverage.dart';
import 'package:volti_api/src/model/deposit_method.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'start_rental_request.g.dart';

/// StartRentalRequest
///
/// Properties:
/// * [vehicleId]
/// * [planCode]
/// * [coverage]
/// * [depositMethod]
/// * [couponCode]
/// * [cardId] - Cartão para a caução e a cobrança final (padrão do cliente se ausente).
/// * [depositId] - Caução Pix já paga (segunda chamada do fluxo Pix).
/// * [useWalletCredits] - Abater o valor final com o saldo da carteira antes de cobrar o cartão.
@BuiltValue()
abstract class StartRentalRequest
    implements Built<StartRentalRequest, StartRentalRequestBuilder> {
  @BuiltValueField(wireName: r'vehicleId')
  String get vehicleId;

  @BuiltValueField(wireName: r'planCode')
  PlanCode get planCode;
  // enum planCodeEnum {  minute,  hour,  day,  weekly,  monthly,  };

  @BuiltValueField(wireName: r'coverage')
  InsuranceCoverage get coverage;
  // enum coverageEnum {  basic,  full,  };

  @BuiltValueField(wireName: r'depositMethod')
  DepositMethod get depositMethod;
  // enum depositMethodEnum {  card,  pix,  };

  @BuiltValueField(wireName: r'couponCode')
  String? get couponCode;

  /// Cartão para a caução e a cobrança final (padrão do cliente se ausente).
  @BuiltValueField(wireName: r'cardId')
  String? get cardId;

  /// Caução Pix já paga (segunda chamada do fluxo Pix).
  @BuiltValueField(wireName: r'depositId')
  String? get depositId;

  /// Abater o valor final com o saldo da carteira antes de cobrar o cartão.
  @BuiltValueField(wireName: r'useWalletCredits')
  bool? get useWalletCredits;

  StartRentalRequest._();

  factory StartRentalRequest([void updates(StartRentalRequestBuilder b)]) =
      _$StartRentalRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(StartRentalRequestBuilder b) =>
      b..useWalletCredits = false;

  @BuiltValueSerializer(custom: true)
  static Serializer<StartRentalRequest> get serializer =>
      _$StartRentalRequestSerializer();
}

class _$StartRentalRequestSerializer
    implements PrimitiveSerializer<StartRentalRequest> {
  @override
  final Iterable<Type> types = const [StartRentalRequest, _$StartRentalRequest];

  @override
  final String wireName = r'StartRentalRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    StartRentalRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'vehicleId';
    yield serializers.serialize(
      object.vehicleId,
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
    yield r'depositMethod';
    yield serializers.serialize(
      object.depositMethod,
      specifiedType: const FullType(DepositMethod),
    );
    if (object.couponCode != null) {
      yield r'couponCode';
      yield serializers.serialize(
        object.couponCode,
        specifiedType: const FullType(String),
      );
    }
    if (object.cardId != null) {
      yield r'cardId';
      yield serializers.serialize(
        object.cardId,
        specifiedType: const FullType(String),
      );
    }
    if (object.depositId != null) {
      yield r'depositId';
      yield serializers.serialize(
        object.depositId,
        specifiedType: const FullType(String),
      );
    }
    if (object.useWalletCredits != null) {
      yield r'useWalletCredits';
      yield serializers.serialize(
        object.useWalletCredits,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    StartRentalRequest object, {
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
    required StartRentalRequestBuilder result,
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
        case r'depositMethod':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DepositMethod),
          ) as DepositMethod;
          result.depositMethod = valueDes;
          break;
        case r'couponCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.couponCode = valueDes;
          break;
        case r'cardId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.cardId = valueDes;
          break;
        case r'depositId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.depositId = valueDes;
          break;
        case r'useWalletCredits':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.useWalletCredits = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  StartRentalRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = StartRentalRequestBuilder();
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
