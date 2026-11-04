//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'counter_payment_method.g.dart';

/// Métodos de pagamento no balcão (subconjunto de `PaymentMethod` e `DepositMethod`): maquininha, Pix no balcão e dinheiro.
class CounterPaymentMethod extends EnumClass {
  @BuiltValueEnumConst(wireName: r'counter_card')
  static const CounterPaymentMethod counterCard = _$counterCard;
  @BuiltValueEnumConst(wireName: r'counter_pix')
  static const CounterPaymentMethod counterPix = _$counterPix;
  @BuiltValueEnumConst(wireName: r'cash')
  static const CounterPaymentMethod cash = _$cash;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const CounterPaymentMethod unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<CounterPaymentMethod> get serializer =>
      _$counterPaymentMethodSerializer;

  const CounterPaymentMethod._(String name) : super(name);

  static BuiltSet<CounterPaymentMethod> get values => _$values;
  static CounterPaymentMethod valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class CounterPaymentMethodMixin = Object
    with _$CounterPaymentMethodMixin;
