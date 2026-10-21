//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/plan_code.dart';
import 'package:volti_api/src/model/insurance_coverage.dart';
import 'package:volti_api/src/model/price_breakdown.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'quote.g.dart';

/// Quote
///
/// Properties:
/// * [planCode]
/// * [coverage]
/// * [breakdown]
/// * [depositCents]
/// * [couponApplied]
/// * [couponMessage] - Motivo quando o cupom não se aplica (pt-BR).
@BuiltValue()
abstract class Quote implements Built<Quote, QuoteBuilder> {
  @BuiltValueField(wireName: r'planCode')
  PlanCode get planCode;
  // enum planCodeEnum {  minute,  hour,  day,  weekly,  monthly,  };

  @BuiltValueField(wireName: r'coverage')
  InsuranceCoverage get coverage;
  // enum coverageEnum {  basic,  full,  };

  @BuiltValueField(wireName: r'breakdown')
  PriceBreakdown get breakdown;

  @BuiltValueField(wireName: r'depositCents')
  int get depositCents;

  @BuiltValueField(wireName: r'couponApplied')
  bool get couponApplied;

  /// Motivo quando o cupom não se aplica (pt-BR).
  @BuiltValueField(wireName: r'couponMessage')
  String? get couponMessage;

  Quote._();

  factory Quote([void updates(QuoteBuilder b)]) = _$Quote;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(QuoteBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Quote> get serializer => _$QuoteSerializer();
}

class _$QuoteSerializer implements PrimitiveSerializer<Quote> {
  @override
  final Iterable<Type> types = const [Quote, _$Quote];

  @override
  final String wireName = r'Quote';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Quote object, {
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
    yield r'breakdown';
    yield serializers.serialize(
      object.breakdown,
      specifiedType: const FullType(PriceBreakdown),
    );
    yield r'depositCents';
    yield serializers.serialize(
      object.depositCents,
      specifiedType: const FullType(int),
    );
    yield r'couponApplied';
    yield serializers.serialize(
      object.couponApplied,
      specifiedType: const FullType(bool),
    );
    if (object.couponMessage != null) {
      yield r'couponMessage';
      yield serializers.serialize(
        object.couponMessage,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    Quote object, {
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
    required QuoteBuilder result,
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
        case r'breakdown':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PriceBreakdown),
          ) as PriceBreakdown;
          result.breakdown.replace(valueDes);
          break;
        case r'depositCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.depositCents = valueDes;
          break;
        case r'couponApplied':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.couponApplied = valueDes;
          break;
        case r'couponMessage':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.couponMessage = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Quote deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = QuoteBuilder();
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
