// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_method.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const PaymentMethod _$card = const PaymentMethod._('card');
const PaymentMethod _$pix = const PaymentMethod._('pix');
const PaymentMethod _$wallet = const PaymentMethod._('wallet');
const PaymentMethod _$counterCard = const PaymentMethod._('counterCard');
const PaymentMethod _$counterPix = const PaymentMethod._('counterPix');
const PaymentMethod _$cash = const PaymentMethod._('cash');
const PaymentMethod _$unknownDefaultOpenApi =
    const PaymentMethod._('unknownDefaultOpenApi');

PaymentMethod _$valueOf(String name) {
  switch (name) {
    case 'card':
      return _$card;
    case 'pix':
      return _$pix;
    case 'wallet':
      return _$wallet;
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

final BuiltSet<PaymentMethod> _$values =
    BuiltSet<PaymentMethod>(const <PaymentMethod>[
  _$card,
  _$pix,
  _$wallet,
  _$counterCard,
  _$counterPix,
  _$cash,
  _$unknownDefaultOpenApi,
]);

class _$PaymentMethodMeta {
  const _$PaymentMethodMeta();
  PaymentMethod get card => _$card;
  PaymentMethod get pix => _$pix;
  PaymentMethod get wallet => _$wallet;
  PaymentMethod get counterCard => _$counterCard;
  PaymentMethod get counterPix => _$counterPix;
  PaymentMethod get cash => _$cash;
  PaymentMethod get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  PaymentMethod valueOf(String name) => _$valueOf(name);
  BuiltSet<PaymentMethod> get values => _$values;
}

abstract class _$PaymentMethodMixin {
  // ignore: non_constant_identifier_names
  _$PaymentMethodMeta get PaymentMethod => const _$PaymentMethodMeta();
}

Serializer<PaymentMethod> _$paymentMethodSerializer =
    _$PaymentMethodSerializer();

class _$PaymentMethodSerializer implements PrimitiveSerializer<PaymentMethod> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'card': 'card',
    'pix': 'pix',
    'wallet': 'wallet',
    'counterCard': 'counter_card',
    'counterPix': 'counter_pix',
    'cash': 'cash',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'card': 'card',
    'pix': 'pix',
    'wallet': 'wallet',
    'counter_card': 'counterCard',
    'counter_pix': 'counterPix',
    'cash': 'cash',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[PaymentMethod];
  @override
  final String wireName = 'PaymentMethod';

  @override
  Object serialize(Serializers serializers, PaymentMethod object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  PaymentMethod deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      PaymentMethod.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
