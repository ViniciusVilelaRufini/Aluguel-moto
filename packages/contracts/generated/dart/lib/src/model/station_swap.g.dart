// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'station_swap.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$StationSwap extends StationSwap {
  @override
  final String id;
  @override
  final String stationId;
  @override
  final String rentalId;
  @override
  final String? vehicleId;
  @override
  final StationSwapStatus status;
  @override
  final StationSwapEndReason? endReason;
  @override
  final int? slotNumber;
  @override
  final int feeCents;
  @override
  final DateTime expiresAt;
  @override
  final String? returnedSerial;
  @override
  final int? returnedPct;
  @override
  final String? releasedSerial;
  @override
  final int? distanceM;
  @override
  final String? customerId;
  @override
  final DateTime? completedAt;
  @override
  final DateTime createdAt;
  @override
  final DateTime? updatedAt;

  factory _$StationSwap([void Function(StationSwapBuilder)? updates]) =>
      (StationSwapBuilder()..update(updates))._build();

  _$StationSwap._(
      {required this.id,
      required this.stationId,
      required this.rentalId,
      this.vehicleId,
      required this.status,
      this.endReason,
      this.slotNumber,
      required this.feeCents,
      required this.expiresAt,
      this.returnedSerial,
      this.returnedPct,
      this.releasedSerial,
      this.distanceM,
      this.customerId,
      this.completedAt,
      required this.createdAt,
      this.updatedAt})
      : super._();
  @override
  StationSwap rebuild(void Function(StationSwapBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  StationSwapBuilder toBuilder() => StationSwapBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is StationSwap &&
        id == other.id &&
        stationId == other.stationId &&
        rentalId == other.rentalId &&
        vehicleId == other.vehicleId &&
        status == other.status &&
        endReason == other.endReason &&
        slotNumber == other.slotNumber &&
        feeCents == other.feeCents &&
        expiresAt == other.expiresAt &&
        returnedSerial == other.returnedSerial &&
        returnedPct == other.returnedPct &&
        releasedSerial == other.releasedSerial &&
        distanceM == other.distanceM &&
        customerId == other.customerId &&
        completedAt == other.completedAt &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, stationId.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, endReason.hashCode);
    _$hash = $jc(_$hash, slotNumber.hashCode);
    _$hash = $jc(_$hash, feeCents.hashCode);
    _$hash = $jc(_$hash, expiresAt.hashCode);
    _$hash = $jc(_$hash, returnedSerial.hashCode);
    _$hash = $jc(_$hash, returnedPct.hashCode);
    _$hash = $jc(_$hash, releasedSerial.hashCode);
    _$hash = $jc(_$hash, distanceM.hashCode);
    _$hash = $jc(_$hash, customerId.hashCode);
    _$hash = $jc(_$hash, completedAt.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'StationSwap')
          ..add('id', id)
          ..add('stationId', stationId)
          ..add('rentalId', rentalId)
          ..add('vehicleId', vehicleId)
          ..add('status', status)
          ..add('endReason', endReason)
          ..add('slotNumber', slotNumber)
          ..add('feeCents', feeCents)
          ..add('expiresAt', expiresAt)
          ..add('returnedSerial', returnedSerial)
          ..add('returnedPct', returnedPct)
          ..add('releasedSerial', releasedSerial)
          ..add('distanceM', distanceM)
          ..add('customerId', customerId)
          ..add('completedAt', completedAt)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class StationSwapBuilder implements Builder<StationSwap, StationSwapBuilder> {
  _$StationSwap? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _stationId;
  String? get stationId => _$this._stationId;
  set stationId(String? stationId) => _$this._stationId = stationId;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  StationSwapStatus? _status;
  StationSwapStatus? get status => _$this._status;
  set status(StationSwapStatus? status) => _$this._status = status;

  StationSwapEndReason? _endReason;
  StationSwapEndReason? get endReason => _$this._endReason;
  set endReason(StationSwapEndReason? endReason) =>
      _$this._endReason = endReason;

  int? _slotNumber;
  int? get slotNumber => _$this._slotNumber;
  set slotNumber(int? slotNumber) => _$this._slotNumber = slotNumber;

  int? _feeCents;
  int? get feeCents => _$this._feeCents;
  set feeCents(int? feeCents) => _$this._feeCents = feeCents;

  DateTime? _expiresAt;
  DateTime? get expiresAt => _$this._expiresAt;
  set expiresAt(DateTime? expiresAt) => _$this._expiresAt = expiresAt;

  String? _returnedSerial;
  String? get returnedSerial => _$this._returnedSerial;
  set returnedSerial(String? returnedSerial) =>
      _$this._returnedSerial = returnedSerial;

  int? _returnedPct;
  int? get returnedPct => _$this._returnedPct;
  set returnedPct(int? returnedPct) => _$this._returnedPct = returnedPct;

  String? _releasedSerial;
  String? get releasedSerial => _$this._releasedSerial;
  set releasedSerial(String? releasedSerial) =>
      _$this._releasedSerial = releasedSerial;

  int? _distanceM;
  int? get distanceM => _$this._distanceM;
  set distanceM(int? distanceM) => _$this._distanceM = distanceM;

  String? _customerId;
  String? get customerId => _$this._customerId;
  set customerId(String? customerId) => _$this._customerId = customerId;

  DateTime? _completedAt;
  DateTime? get completedAt => _$this._completedAt;
  set completedAt(DateTime? completedAt) => _$this._completedAt = completedAt;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  StationSwapBuilder() {
    StationSwap._defaults(this);
  }

  StationSwapBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _stationId = $v.stationId;
      _rentalId = $v.rentalId;
      _vehicleId = $v.vehicleId;
      _status = $v.status;
      _endReason = $v.endReason;
      _slotNumber = $v.slotNumber;
      _feeCents = $v.feeCents;
      _expiresAt = $v.expiresAt;
      _returnedSerial = $v.returnedSerial;
      _returnedPct = $v.returnedPct;
      _releasedSerial = $v.releasedSerial;
      _distanceM = $v.distanceM;
      _customerId = $v.customerId;
      _completedAt = $v.completedAt;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(StationSwap other) {
    _$v = other as _$StationSwap;
  }

  @override
  void update(void Function(StationSwapBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  StationSwap build() => _build();

  _$StationSwap _build() {
    final _$result = _$v ??
        _$StationSwap._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'StationSwap', 'id'),
          stationId: BuiltValueNullFieldError.checkNotNull(
              stationId, r'StationSwap', 'stationId'),
          rentalId: BuiltValueNullFieldError.checkNotNull(
              rentalId, r'StationSwap', 'rentalId'),
          vehicleId: vehicleId,
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'StationSwap', 'status'),
          endReason: endReason,
          slotNumber: slotNumber,
          feeCents: BuiltValueNullFieldError.checkNotNull(
              feeCents, r'StationSwap', 'feeCents'),
          expiresAt: BuiltValueNullFieldError.checkNotNull(
              expiresAt, r'StationSwap', 'expiresAt'),
          returnedSerial: returnedSerial,
          returnedPct: returnedPct,
          releasedSerial: releasedSerial,
          distanceM: distanceM,
          customerId: customerId,
          completedAt: completedAt,
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'StationSwap', 'createdAt'),
          updatedAt: updatedAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
