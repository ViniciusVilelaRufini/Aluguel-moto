//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/plan_code.dart';
import 'package:volti_api/src/model/insurance_coverage.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'quote_request.g.dart';

/// QuoteRequest
///
/// Properties:
/// * [planCode]
/// * [coverage]
/// * [couponCode]
/// * [estimatedMinutes] - Duração prevista para estimar o valor (padrão 30 no plano `minute`, 1 unidade nos demais).
/// * [vehicleId] - Usa o preço por minuto do modelo da moto (plano `minute`).
@BuiltValue()
abstract class QuoteRequest
    implements Built<QuoteRequest, QuoteRequestBuilder> {
  @BuiltValueField(wireName: r'planCode')
  PlanCode get planCode;
  // enum planCodeEnum {  minute,  hour,  day,  weekly,  monthly,  };

  @BuiltValueField(wireName: r'coverage')
  InsuranceCoverage get coverage;
  // enum coverageEnum {  basic,  full,  };

  @BuiltValueField(wireName: r'couponCode')
  String? get couponCode;

  /// Duração prevista para estimar o valor (padrão 30 no plano `minute`, 1 unidade nos demais).
  @BuiltValueField(wireName: r'estimatedMinutes')
  int? get estimatedMinutes;

  /// Usa o preço por minuto do modelo da moto (plano `minute`).
  @BuiltValueField(wireName: r'vehicleId')
  String? get vehicleId;

  QuoteRequest._();

  factory QuoteRequest([void updates(QuoteRequestBuilder b)]) = _$QuoteRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(QuoteRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<QuoteRequest> get serializer => _$QuoteRequestSerializer();
}

class _$QuoteRequestSerializer implements PrimitiveSerializer<QuoteRequest> {
  @override
  final Iterable<Type> types = const [QuoteRequest, _$QuoteRequest];

  @override
  final String wireName = r'QuoteRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    QuoteRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
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
    if (object.couponCode != null) {
      yield r'couponCode';
      yield serializers.serialize(
        object.couponCode,
        specifiedType: const FullType(String),
      );
    }
    if (object.estimatedMinutes != null) {
      yield r'estimatedMinutes';
      yield serializers.serialize(
        object.estimatedMinutes,
        specifiedType: const FullType(int),
      );
    }
    if (object.vehicleId != null) {
      yield r'vehicleId';
      yield serializers.serialize(
        object.vehicleId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    QuoteRequest object, {
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
    required QuoteRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
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
        case r'couponCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.couponCode = valueDes;
          break;
        case r'estimatedMinutes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.estimatedMinutes = valueDes;
          break;
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  QuoteRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = QuoteRequestBuilder();
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
