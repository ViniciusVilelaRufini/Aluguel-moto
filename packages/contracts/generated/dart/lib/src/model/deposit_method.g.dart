// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'deposit_method.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const DepositMethod _$card = const DepositMethod._('card');
const DepositMethod _$pix = const DepositMethod._('pix');
const DepositMethod _$counterCard = const DepositMethod._('counterCard');
const DepositMethod _$counterPix = const DepositMethod._('counterPix');
const DepositMethod _$cash = const DepositMethod._('cash');
const DepositMethod _$unknownDefaultOpenApi =
    const DepositMethod._('unknownDefaultOpenApi');

DepositMethod _$valueOf(String name) {
  switch (name) {
    case 'card':
      return _$card;
    case 'pix':
      return _$pix;
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

final BuiltSet<DepositMethod> _$values =
    BuiltSet<DepositMethod>(const <DepositMethod>[
  _$card,
  _$pix,
  _$counterCard,
  _$counterPix,
  _$cash,
  _$unknownDefaultOpenApi,
]);

class _$DepositMethodMeta {
  const _$DepositMethodMeta();
  DepositMethod get card => _$card;
  DepositMethod get pix => _$pix;
  DepositMethod get counterCard => _$counterCard;
  DepositMethod get counterPix => _$counterPix;
  DepositMethod get cash => _$cash;
  DepositMethod get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  DepositMethod valueOf(String name) => _$valueOf(name);
  BuiltSet<DepositMethod> get values => _$values;
}

abstract class _$DepositMethodMixin {
  // ignore: non_constant_identifier_names
  _$DepositMethodMeta get DepositMethod => const _$DepositMethodMeta();
}

Serializer<DepositMethod> _$depositMethodSerializer =
    _$DepositMethodSerializer();

class _$DepositMethodSerializer implements PrimitiveSerializer<DepositMethod> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'card': 'card',
    'pix': 'pix',
    'counterCard': 'counter_card',
    'counterPix': 'counter_pix',
    'cash': 'cash',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'card': 'card',
    'pix': 'pix',
    'counter_card': 'counterCard',
    'counter_pix': 'counterPix',
    'cash': 'cash',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[DepositMethod];
  @override
  final String wireName = 'DepositMethod';

  @override
  Object serialize(Serializers serializers, DepositMethod object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  DepositMethod deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      DepositMethod.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
