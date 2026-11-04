//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'counter_plan_code.g.dart';

/// Planos vendidos no balcão (subconjunto de `PlanCode`), pré-pagos pelo período: dia = 24 h, semana = 7 dias, mês = 30 dias. Não renovam sozinhos.
class CounterPlanCode extends EnumClass {
  @BuiltValueEnumConst(wireName: r'day')
  static const CounterPlanCode day = _$day;
  @BuiltValueEnumConst(wireName: r'weekly')
  static const CounterPlanCode weekly = _$weekly;
  @BuiltValueEnumConst(wireName: r'monthly')
  static const CounterPlanCode monthly = _$monthly;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const CounterPlanCode unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<CounterPlanCode> get serializer =>
      _$counterPlanCodeSerializer;

  const CounterPlanCode._(String name) : super(name);

  static BuiltSet<CounterPlanCode> get values => _$values;
  static CounterPlanCode valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class CounterPlanCodeMixin = Object with _$CounterPlanCodeMixin;
