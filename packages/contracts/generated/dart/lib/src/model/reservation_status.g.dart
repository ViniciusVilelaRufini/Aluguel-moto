// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reservation_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const ReservationStatus _$active = const ReservationStatus._('active');
const ReservationStatus _$converted = const ReservationStatus._('converted');
const ReservationStatus _$canceled = const ReservationStatus._('canceled');
const ReservationStatus _$expired = const ReservationStatus._('expired');
const ReservationStatus _$handover = const ReservationStatus._('handover');
const ReservationStatus _$unknownDefaultOpenApi =
    const ReservationStatus._('unknownDefaultOpenApi');

ReservationStatus _$valueOf(String name) {
  switch (name) {
    case 'active':
      return _$active;
    case 'converted':
      return _$converted;
    case 'canceled':
      return _$canceled;
    case 'expired':
      return _$expired;
    case 'handover':
      return _$handover;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<ReservationStatus> _$values =
    BuiltSet<ReservationStatus>(const <ReservationStatus>[
  _$active,
  _$converted,
  _$canceled,
  _$expired,
  _$handover,
  _$unknownDefaultOpenApi,
]);

class _$ReservationStatusMeta {
  const _$ReservationStatusMeta();
  ReservationStatus get active => _$active;
  ReservationStatus get converted => _$converted;
  ReservationStatus get canceled => _$canceled;
  ReservationStatus get expired => _$expired;
  ReservationStatus get handover => _$handover;
  ReservationStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  ReservationStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<ReservationStatus> get values => _$values;
}

abstract class _$ReservationStatusMixin {
  // ignore: non_constant_identifier_names
  _$ReservationStatusMeta get ReservationStatus =>
      const _$ReservationStatusMeta();
}

Serializer<ReservationStatus> _$reservationStatusSerializer =
    _$ReservationStatusSerializer();

class _$ReservationStatusSerializer
    implements PrimitiveSerializer<ReservationStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'active': 'active',
    'converted': 'converted',
    'canceled': 'canceled',
    'expired': 'expired',
    'handover': 'handover',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'active': 'active',
    'converted': 'converted',
    'canceled': 'canceled',
    'expired': 'expired',
    'handover': 'handover',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[ReservationStatus];
  @override
  final String wireName = 'ReservationStatus';

  @override
  Object serialize(Serializers serializers, ReservationStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  ReservationStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      ReservationStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
