// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rental_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const RentalStatus _$active = const RentalStatus._('active');
const RentalStatus _$paused = const RentalStatus._('paused');
const RentalStatus _$ending = const RentalStatus._('ending');
const RentalStatus _$ended = const RentalStatus._('ended');
const RentalStatus _$forceEnded = const RentalStatus._('forceEnded');
const RentalStatus _$unknownDefaultOpenApi =
    const RentalStatus._('unknownDefaultOpenApi');

RentalStatus _$valueOf(String name) {
  switch (name) {
    case 'active':
      return _$active;
    case 'paused':
      return _$paused;
    case 'ending':
      return _$ending;
    case 'ended':
      return _$ended;
    case 'forceEnded':
      return _$forceEnded;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<RentalStatus> _$values =
    BuiltSet<RentalStatus>(const <RentalStatus>[
  _$active,
  _$paused,
  _$ending,
  _$ended,
  _$forceEnded,
  _$unknownDefaultOpenApi,
]);

class _$RentalStatusMeta {
  const _$RentalStatusMeta();
  RentalStatus get active => _$active;
  RentalStatus get paused => _$paused;
  RentalStatus get ending => _$ending;
  RentalStatus get ended => _$ended;
  RentalStatus get forceEnded => _$forceEnded;
  RentalStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  RentalStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<RentalStatus> get values => _$values;
}

abstract class _$RentalStatusMixin {
  // ignore: non_constant_identifier_names
  _$RentalStatusMeta get RentalStatus => const _$RentalStatusMeta();
}

Serializer<RentalStatus> _$rentalStatusSerializer = _$RentalStatusSerializer();

class _$RentalStatusSerializer implements PrimitiveSerializer<RentalStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'active': 'active',
    'paused': 'paused',
    'ending': 'ending',
    'ended': 'ended',
    'forceEnded': 'force_ended',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'active': 'active',
    'paused': 'paused',
    'ending': 'ending',
    'ended': 'ended',
    'force_ended': 'forceEnded',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[RentalStatus];
  @override
  final String wireName = 'RentalStatus';

  @override
  Object serialize(Serializers serializers, RentalStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  RentalStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      RentalStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
