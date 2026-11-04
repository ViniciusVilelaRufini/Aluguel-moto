// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'counter_payment_method.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const CounterPaymentMethod _$counterCard =
    const CounterPaymentMethod._('counterCard');
const CounterPaymentMethod _$counterPix =
    const CounterPaymentMethod._('counterPix');
const CounterPaymentMethod _$cash = const CounterPaymentMethod._('cash');
const CounterPaymentMethod _$unknownDefaultOpenApi =
    const CounterPaymentMethod._('unknownDefaultOpenApi');

CounterPaymentMethod _$valueOf(String name) {
  switch (name) {
    case 'counterCard':
      return _$counterCard;
    case 'counterPix':
      return _$counterPix;
    case 'cash':
      return _$cash;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<CounterPaymentMethod> _$values =
    BuiltSet<CounterPaymentMethod>(const <CounterPaymentMethod>[
  _$counterCard,
  _$counterPix,
  _$cash,
  _$unknownDefaultOpenApi,
]);

class _$CounterPaymentMethodMeta {
  const _$CounterPaymentMethodMeta();
  CounterPaymentMethod get counterCard => _$counterCard;
  CounterPaymentMethod get counterPix => _$counterPix;
  CounterPaymentMethod get cash => _$cash;
  CounterPaymentMethod get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  CounterPaymentMethod valueOf(String name) => _$valueOf(name);
  BuiltSet<CounterPaymentMethod> get values => _$values;
}

abstract class _$CounterPaymentMethodMixin {
  // ignore: non_constant_identifier_names
  _$CounterPaymentMethodMeta get CounterPaymentMethod =>
      const _$CounterPaymentMethodMeta();
}

Serializer<CounterPaymentMethod> _$counterPaymentMethodSerializer =
    _$CounterPaymentMethodSerializer();

class _$CounterPaymentMethodSerializer
    implements PrimitiveSerializer<CounterPaymentMethod> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'counterCard': 'counter_card',
    'counterPix': 'counter_pix',
    'cash': 'cash',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'counter_card': 'counterCard',
    'counter_pix': 'counterPix',
    'cash': 'cash',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[CounterPaymentMethod];
  @override
  final String wireName = 'CounterPaymentMethod';

  @override
  Object serialize(Serializers serializers, CounterPaymentMethod object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  CounterPaymentMethod deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      CounterPaymentMethod.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
