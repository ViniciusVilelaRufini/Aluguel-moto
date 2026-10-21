// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'wallet_entry_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const WalletEntryType _$topUp = const WalletEntryType._('topUp');
const WalletEntryType _$minutePackage =
    const WalletEntryType._('minutePackage');
const WalletEntryType _$rentalCharge = const WalletEntryType._('rentalCharge');
const WalletEntryType _$refund = const WalletEntryType._('refund');
const WalletEntryType _$adjustment = const WalletEntryType._('adjustment');
const WalletEntryType _$bonus = const WalletEntryType._('bonus');
const WalletEntryType _$unknownDefaultOpenApi =
    const WalletEntryType._('unknownDefaultOpenApi');

WalletEntryType _$valueOf(String name) {
  switch (name) {
    case 'topUp':
      return _$topUp;
    case 'minutePackage':
      return _$minutePackage;
    case 'rentalCharge':
      return _$rentalCharge;
    case 'refund':
      return _$refund;
    case 'adjustment':
      return _$adjustment;
    case 'bonus':
      return _$bonus;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<WalletEntryType> _$values =
    BuiltSet<WalletEntryType>(const <WalletEntryType>[
  _$topUp,
  _$minutePackage,
  _$rentalCharge,
  _$refund,
  _$adjustment,
  _$bonus,
  _$unknownDefaultOpenApi,
]);

class _$WalletEntryTypeMeta {
  const _$WalletEntryTypeMeta();
  WalletEntryType get topUp => _$topUp;
  WalletEntryType get minutePackage => _$minutePackage;
  WalletEntryType get rentalCharge => _$rentalCharge;
  WalletEntryType get refund => _$refund;
  WalletEntryType get adjustment => _$adjustment;
  WalletEntryType get bonus => _$bonus;
  WalletEntryType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  WalletEntryType valueOf(String name) => _$valueOf(name);
  BuiltSet<WalletEntryType> get values => _$values;
}

abstract class _$WalletEntryTypeMixin {
  // ignore: non_constant_identifier_names
  _$WalletEntryTypeMeta get WalletEntryType => const _$WalletEntryTypeMeta();
}

Serializer<WalletEntryType> _$walletEntryTypeSerializer =
    _$WalletEntryTypeSerializer();

class _$WalletEntryTypeSerializer
    implements PrimitiveSerializer<WalletEntryType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'topUp': 'top_up',
    'minutePackage': 'minute_package',
    'rentalCharge': 'rental_charge',
    'refund': 'refund',
    'adjustment': 'adjustment',
    'bonus': 'bonus',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'top_up': 'topUp',
    'minute_package': 'minutePackage',
    'rental_charge': 'rentalCharge',
    'refund': 'refund',
    'adjustment': 'adjustment',
    'bonus': 'bonus',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[WalletEntryType];
  @override
  final String wireName = 'WalletEntryType';

  @override
  Object serialize(Serializers serializers, WalletEntryType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  WalletEntryType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      WalletEntryType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
