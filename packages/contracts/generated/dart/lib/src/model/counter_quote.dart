//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/insurance_coverage.dart';
import 'package:volti_api/src/model/counter_plan_code.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'counter_quote.g.dart';

/// CounterQuote
///
/// Properties:
/// * [planCode]
/// * [quantity]
/// * [coverage]
/// * [planUnitCents] - Preço de uma unidade do plano.
/// * [planCents] - `planUnitCents` × `quantity`.
/// * [insuranceCents] - Prêmio único do seguro (não multiplica pela quantidade).
/// * [totalCents] - `planCents` + `insuranceCents`: o valor a receber no balcão.
/// * [excessDayCents] - Preço de cada dia iniciado depois do período pré-pago (diária do plano `day`).
/// * [periodDays] - Dias do período pré-pago (unidade × `quantity`).
@BuiltValue()
abstract class CounterQuote
    implements Built<CounterQuote, CounterQuoteBuilder> {
  @BuiltValueField(wireName: r'planCode')
  CounterPlanCode get planCode;
  // enum planCodeEnum {  day,  weekly,  monthly,  };

  @BuiltValueField(wireName: r'quantity')
  int get quantity;

  @BuiltValueField(wireName: r'coverage')
  InsuranceCoverage get coverage;
  // enum coverageEnum {  basic,  full,  };

  /// Preço de uma unidade do plano.
  @BuiltValueField(wireName: r'planUnitCents')
  int get planUnitCents;

  /// `planUnitCents` × `quantity`.
  @BuiltValueField(wireName: r'planCents')
  int get planCents;

  /// Prêmio único do seguro (não multiplica pela quantidade).
  @BuiltValueField(wireName: r'insuranceCents')
  int get insuranceCents;

  /// `planCents` + `insuranceCents`: o valor a receber no balcão.
  @BuiltValueField(wireName: r'totalCents')
  int get totalCents;

  /// Preço de cada dia iniciado depois do período pré-pago (diária do plano `day`).
  @BuiltValueField(wireName: r'excessDayCents')
  int get excessDayCents;

  /// Dias do período pré-pago (unidade × `quantity`).
  @BuiltValueField(wireName: r'periodDays')
  int get periodDays;

  CounterQuote._();

  factory CounterQuote([void updates(CounterQuoteBuilder b)]) = _$CounterQuote;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CounterQuoteBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CounterQuote> get serializer => _$CounterQuoteSerializer();
}

class _$CounterQuoteSerializer implements PrimitiveSerializer<CounterQuote> {
  @override
  final Iterable<Type> types = const [CounterQuote, _$CounterQuote];

  @override
  final String wireName = r'CounterQuote';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CounterQuote object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'planCode';
    yield serializers.serialize(
      object.planCode,
      specifiedType: const FullType(CounterPlanCode),
    );
    yield r'quantity';
    yield serializers.serialize(
      object.quantity,
      specifiedType: const FullType(int),
    );
    yield r'coverage';
    yield serializers.serialize(
      object.coverage,
      specifiedType: const FullType(InsuranceCoverage),
    );
    yield r'planUnitCents';
    yield serializers.serialize(
      object.planUnitCents,
      specifiedType: const FullType(int),
    );
    yield r'planCents';
    yield serializers.serialize(
      object.planCents,
      specifiedType: const FullType(int),
    );
    yield r'insuranceCents';
    yield serializers.serialize(
      object.insuranceCents,
      specifiedType: const FullType(int),
    );
    yield r'totalCents';
    yield serializers.serialize(
      object.totalCents,
      specifiedType: const FullType(int),
    );
    yield r'excessDayCents';
    yield serializers.serialize(
      object.excessDayCents,
      specifiedType: const FullType(int),
    );
    yield r'periodDays';
    yield serializers.serialize(
      object.periodDays,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CounterQuote object, {
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
    required CounterQuoteBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'planCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CounterPlanCode),
          ) as CounterPlanCode;
          result.planCode = valueDes;
          break;
        case r'quantity':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.quantity = valueDes;
          break;
        case r'coverage':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(InsuranceCoverage),
          ) as InsuranceCoverage;
          result.coverage = valueDes;
          break;
        case r'planUnitCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.planUnitCents = valueDes;
          break;
        case r'planCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.planCents = valueDes;
          break;
        case r'insuranceCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.insuranceCents = valueDes;
          break;
        case r'totalCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.totalCents = valueDes;
          break;
        case r'excessDayCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.excessDayCents = valueDes;
          break;
        case r'periodDays':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.periodDays = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CounterQuote deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CounterQuoteBuilder();
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
