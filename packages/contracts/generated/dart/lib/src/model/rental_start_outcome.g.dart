// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rental_start_outcome.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const RentalStartOutcome _$started = const RentalStartOutcome._('started');
const RentalStartOutcome _$awaitingDeposit =
    const RentalStartOutcome._('awaitingDeposit');
const RentalStartOutcome _$unknownDefaultOpenApi =
    const RentalStartOutcome._('unknownDefaultOpenApi');

RentalStartOutcome _$valueOf(String name) {
  switch (name) {
    case 'started':
      return _$started;
    case 'awaitingDeposit':
      return _$awaitingDeposit;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<RentalStartOutcome> _$values =
    BuiltSet<RentalStartOutcome>(const <RentalStartOutcome>[
  _$started,
  _$awaitingDeposit,
  _$unknownDefaultOpenApi,
]);

class _$RentalStartOutcomeMeta {
  const _$RentalStartOutcomeMeta();
  RentalStartOutcome get started => _$started;
  RentalStartOutcome get awaitingDeposit => _$awaitingDeposit;
  RentalStartOutcome get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  RentalStartOutcome valueOf(String name) => _$valueOf(name);
  BuiltSet<RentalStartOutcome> get values => _$values;
}

abstract class _$RentalStartOutcomeMixin {
  // ignore: non_constant_identifier_names
  _$RentalStartOutcomeMeta get RentalStartOutcome =>
      const _$RentalStartOutcomeMeta();
}

Serializer<RentalStartOutcome> _$rentalStartOutcomeSerializer =
    _$RentalStartOutcomeSerializer();

class _$RentalStartOutcomeSerializer
    implements PrimitiveSerializer<RentalStartOutcome> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'started': 'started',
    'awaitingDeposit': 'awaiting_deposit',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'started': 'started',
    'awaiting_deposit': 'awaitingDeposit',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[RentalStartOutcome];
  @override
  final String wireName = 'RentalStartOutcome';

  @override
  Object serialize(Serializers serializers, RentalStartOutcome object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  RentalStartOutcome deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      RentalStartOutcome.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
