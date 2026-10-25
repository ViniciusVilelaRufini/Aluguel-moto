// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'debt_settlement_kind.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const DebtSettlementKind _$payment = const DebtSettlementKind._('payment');
const DebtSettlementKind _$manual = const DebtSettlementKind._('manual');
const DebtSettlementKind _$unknownDefaultOpenApi =
    const DebtSettlementKind._('unknownDefaultOpenApi');

DebtSettlementKind _$valueOf(String name) {
  switch (name) {
    case 'payment':
      return _$payment;
    case 'manual':
      return _$manual;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<DebtSettlementKind> _$values =
    BuiltSet<DebtSettlementKind>(const <DebtSettlementKind>[
  _$payment,
  _$manual,
  _$unknownDefaultOpenApi,
]);

class _$DebtSettlementKindMeta {
  const _$DebtSettlementKindMeta();
  DebtSettlementKind get payment => _$payment;
  DebtSettlementKind get manual => _$manual;
  DebtSettlementKind get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  DebtSettlementKind valueOf(String name) => _$valueOf(name);
  BuiltSet<DebtSettlementKind> get values => _$values;
}

abstract class _$DebtSettlementKindMixin {
  // ignore: non_constant_identifier_names
  _$DebtSettlementKindMeta get DebtSettlementKind =>
      const _$DebtSettlementKindMeta();
}

Serializer<DebtSettlementKind> _$debtSettlementKindSerializer =
    _$DebtSettlementKindSerializer();

class _$DebtSettlementKindSerializer
    implements PrimitiveSerializer<DebtSettlementKind> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'payment': 'payment',
    'manual': 'manual',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'payment': 'payment',
    'manual': 'manual',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[DebtSettlementKind];
  @override
  final String wireName = 'DebtSettlementKind';

  @override
  Object serialize(Serializers serializers, DebtSettlementKind object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  DebtSettlementKind deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      DebtSettlementKind.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
