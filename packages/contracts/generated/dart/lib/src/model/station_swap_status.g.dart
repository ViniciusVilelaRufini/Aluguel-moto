// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'station_swap_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const StationSwapStatus _$openingSlot =
    const StationSwapStatus._('openingSlot');
const StationSwapStatus _$awaitingReturn =
    const StationSwapStatus._('awaitingReturn');
const StationSwapStatus _$returned = const StationSwapStatus._('returned');
const StationSwapStatus _$releasing = const StationSwapStatus._('releasing');
const StationSwapStatus _$completed = const StationSwapStatus._('completed');
const StationSwapStatus _$canceled = const StationSwapStatus._('canceled');
const StationSwapStatus _$failed = const StationSwapStatus._('failed');
const StationSwapStatus _$unknownDefaultOpenApi =
    const StationSwapStatus._('unknownDefaultOpenApi');

StationSwapStatus _$valueOf(String name) {
  switch (name) {
    case 'openingSlot':
      return _$openingSlot;
    case 'awaitingReturn':
      return _$awaitingReturn;
    case 'returned':
      return _$returned;
    case 'releasing':
      return _$releasing;
    case 'completed':
      return _$completed;
    case 'canceled':
      return _$canceled;
    case 'failed':
      return _$failed;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<StationSwapStatus> _$values =
    BuiltSet<StationSwapStatus>(const <StationSwapStatus>[
  _$openingSlot,
  _$awaitingReturn,
  _$returned,
  _$releasing,
  _$completed,
  _$canceled,
  _$failed,
  _$unknownDefaultOpenApi,
]);

class _$StationSwapStatusMeta {
  const _$StationSwapStatusMeta();
  StationSwapStatus get openingSlot => _$openingSlot;
  StationSwapStatus get awaitingReturn => _$awaitingReturn;
  StationSwapStatus get returned => _$returned;
  StationSwapStatus get releasing => _$releasing;
  StationSwapStatus get completed => _$completed;
  StationSwapStatus get canceled => _$canceled;
  StationSwapStatus get failed => _$failed;
  StationSwapStatus get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  StationSwapStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<StationSwapStatus> get values => _$values;
}

abstract class _$StationSwapStatusMixin {
  // ignore: non_constant_identifier_names
  _$StationSwapStatusMeta get StationSwapStatus =>
      const _$StationSwapStatusMeta();
}

Serializer<StationSwapStatus> _$stationSwapStatusSerializer =
    _$StationSwapStatusSerializer();

class _$StationSwapStatusSerializer
    implements PrimitiveSerializer<StationSwapStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'openingSlot': 'opening_slot',
    'awaitingReturn': 'awaiting_return',
    'returned': 'returned',
    'releasing': 'releasing',
    'completed': 'completed',
    'canceled': 'canceled',
    'failed': 'failed',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'opening_slot': 'openingSlot',
    'awaiting_return': 'awaitingReturn',
    'returned': 'returned',
    'releasing': 'releasing',
    'completed': 'completed',
    'canceled': 'canceled',
    'failed': 'failed',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[StationSwapStatus];
  @override
  final String wireName = 'StationSwapStatus';

  @override
  Object serialize(Serializers serializers, StationSwapStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  StationSwapStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      StationSwapStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
