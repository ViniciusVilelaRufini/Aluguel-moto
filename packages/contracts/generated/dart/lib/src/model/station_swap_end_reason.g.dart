// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'station_swap_end_reason.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const StationSwapEndReason _$canceledByCustomer =
    const StationSwapEndReason._('canceledByCustomer');
const StationSwapEndReason _$slotClosedWithoutReturn =
    const StationSwapEndReason._('slotClosedWithoutReturn');
const StationSwapEndReason _$stationTimeout =
    const StationSwapEndReason._('stationTimeout');
const StationSwapEndReason _$returnTimeout =
    const StationSwapEndReason._('returnTimeout');
const StationSwapEndReason _$releaseTimeout =
    const StationSwapEndReason._('releaseTimeout');
const StationSwapEndReason _$noBatteryAfterReturn =
    const StationSwapEndReason._('noBatteryAfterReturn');
const StationSwapEndReason _$serialMismatch =
    const StationSwapEndReason._('serialMismatch');
const StationSwapEndReason _$unknownDefaultOpenApi =
    const StationSwapEndReason._('unknownDefaultOpenApi');

StationSwapEndReason _$valueOf(String name) {
  switch (name) {
    case 'canceledByCustomer':
      return _$canceledByCustomer;
    case 'slotClosedWithoutReturn':
      return _$slotClosedWithoutReturn;
    case 'stationTimeout':
      return _$stationTimeout;
    case 'returnTimeout':
      return _$returnTimeout;
    case 'releaseTimeout':
      return _$releaseTimeout;
    case 'noBatteryAfterReturn':
      return _$noBatteryAfterReturn;
    case 'serialMismatch':
      return _$serialMismatch;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<StationSwapEndReason> _$values =
    BuiltSet<StationSwapEndReason>(const <StationSwapEndReason>[
  _$canceledByCustomer,
  _$slotClosedWithoutReturn,
  _$stationTimeout,
  _$returnTimeout,
  _$releaseTimeout,
  _$noBatteryAfterReturn,
  _$serialMismatch,
  _$unknownDefaultOpenApi,
]);

class _$StationSwapEndReasonMeta {
  const _$StationSwapEndReasonMeta();
  StationSwapEndReason get canceledByCustomer => _$canceledByCustomer;
  StationSwapEndReason get slotClosedWithoutReturn => _$slotClosedWithoutReturn;
  StationSwapEndReason get stationTimeout => _$stationTimeout;
  StationSwapEndReason get returnTimeout => _$returnTimeout;
  StationSwapEndReason get releaseTimeout => _$releaseTimeout;
  StationSwapEndReason get noBatteryAfterReturn => _$noBatteryAfterReturn;
  StationSwapEndReason get serialMismatch => _$serialMismatch;
  StationSwapEndReason get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  StationSwapEndReason valueOf(String name) => _$valueOf(name);
  BuiltSet<StationSwapEndReason> get values => _$values;
}

abstract class _$StationSwapEndReasonMixin {
  // ignore: non_constant_identifier_names
  _$StationSwapEndReasonMeta get StationSwapEndReason =>
      const _$StationSwapEndReasonMeta();
}

Serializer<StationSwapEndReason> _$stationSwapEndReasonSerializer =
    _$StationSwapEndReasonSerializer();

class _$StationSwapEndReasonSerializer
    implements PrimitiveSerializer<StationSwapEndReason> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'canceledByCustomer': 'canceled_by_customer',
    'slotClosedWithoutReturn': 'slot_closed_without_return',
    'stationTimeout': 'station_timeout',
    'returnTimeout': 'return_timeout',
    'releaseTimeout': 'release_timeout',
    'noBatteryAfterReturn': 'no_battery_after_return',
    'serialMismatch': 'serial_mismatch',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'canceled_by_customer': 'canceledByCustomer',
    'slot_closed_without_return': 'slotClosedWithoutReturn',
    'station_timeout': 'stationTimeout',
    'return_timeout': 'returnTimeout',
    'release_timeout': 'releaseTimeout',
    'no_battery_after_return': 'noBatteryAfterReturn',
    'serial_mismatch': 'serialMismatch',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[StationSwapEndReason];
  @override
  final String wireName = 'StationSwapEndReason';

  @override
  Object serialize(Serializers serializers, StationSwapEndReason object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  StationSwapEndReason deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      StationSwapEndReason.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
