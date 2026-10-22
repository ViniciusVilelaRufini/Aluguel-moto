// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'handover.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Handover extends Handover {
  @override
  final String id;
  @override
  final HandoverType type;
  @override
  final String depotId;
  @override
  final String? reservationId;
  @override
  final String? rentalId;
  @override
  final String vehicleId;
  @override
  final String? vehicleCode;
  @override
  final String operatorId;
  @override
  final String? operatorFirstName;
  @override
  final BuiltList<HandoverChecklistItem> checklist;
  @override
  final BuiltList<String> photoKeys;
  @override
  final BuiltList<String>? photoUrls;
  @override
  final int batteryPct;
  @override
  final String? batterySerial;
  @override
  final HandoverStatus status;
  @override
  final String? lastError;
  @override
  final String? disputeReason;
  @override
  final DateTime createdAt;
  @override
  final DateTime? respondedAt;

  factory _$Handover([void Function(HandoverBuilder)? updates]) =>
      (HandoverBuilder()..update(updates))._build();

  _$Handover._(
      {required this.id,
      required this.type,
      required this.depotId,
      this.reservationId,
      this.rentalId,
      required this.vehicleId,
      this.vehicleCode,
      required this.operatorId,
      this.operatorFirstName,
      required this.checklist,
      required this.photoKeys,
      this.photoUrls,
      required this.batteryPct,
      this.batterySerial,
      required this.status,
      this.lastError,
      this.disputeReason,
      required this.createdAt,
      this.respondedAt})
      : super._();
  @override
  Handover rebuild(void Function(HandoverBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  HandoverBuilder toBuilder() => HandoverBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Handover &&
        id == other.id &&
        type == other.type &&
        depotId == other.depotId &&
        reservationId == other.reservationId &&
        rentalId == other.rentalId &&
        vehicleId == other.vehicleId &&
        vehicleCode == other.vehicleCode &&
        operatorId == other.operatorId &&
        operatorFirstName == other.operatorFirstName &&
        checklist == other.checklist &&
        photoKeys == other.photoKeys &&
        photoUrls == other.photoUrls &&
        batteryPct == other.batteryPct &&
        batterySerial == other.batterySerial &&
        status == other.status &&
        lastError == other.lastError &&
        disputeReason == other.disputeReason &&
        createdAt == other.createdAt &&
        respondedAt == other.respondedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, depotId.hashCode);
    _$hash = $jc(_$hash, reservationId.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, vehicleCode.hashCode);
    _$hash = $jc(_$hash, operatorId.hashCode);
    _$hash = $jc(_$hash, operatorFirstName.hashCode);
    _$hash = $jc(_$hash, checklist.hashCode);
    _$hash = $jc(_$hash, photoKeys.hashCode);
    _$hash = $jc(_$hash, photoUrls.hashCode);
    _$hash = $jc(_$hash, batteryPct.hashCode);
    _$hash = $jc(_$hash, batterySerial.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, lastError.hashCode);
    _$hash = $jc(_$hash, disputeReason.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, respondedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Handover')
          ..add('id', id)
          ..add('type', type)
          ..add('depotId', depotId)
          ..add('reservationId', reservationId)
          ..add('rentalId', rentalId)
          ..add('vehicleId', vehicleId)
          ..add('vehicleCode', vehicleCode)
          ..add('operatorId', operatorId)
          ..add('operatorFirstName', operatorFirstName)
          ..add('checklist', checklist)
          ..add('photoKeys', photoKeys)
          ..add('photoUrls', photoUrls)
          ..add('batteryPct', batteryPct)
          ..add('batterySerial', batterySerial)
          ..add('status', status)
          ..add('lastError', lastError)
          ..add('disputeReason', disputeReason)
          ..add('createdAt', createdAt)
          ..add('respondedAt', respondedAt))
        .toString();
  }
}

class HandoverBuilder implements Builder<Handover, HandoverBuilder> {
  _$Handover? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  HandoverType? _type;
  HandoverType? get type => _$this._type;
  set type(HandoverType? type) => _$this._type = type;

  String? _depotId;
  String? get depotId => _$this._depotId;
  set depotId(String? depotId) => _$this._depotId = depotId;

  String? _reservationId;
  String? get reservationId => _$this._reservationId;
  set reservationId(String? reservationId) =>
      _$this._reservationId = reservationId;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _vehicleCode;
  String? get vehicleCode => _$this._vehicleCode;
  set vehicleCode(String? vehicleCode) => _$this._vehicleCode = vehicleCode;

  String? _operatorId;
  String? get operatorId => _$this._operatorId;
  set operatorId(String? operatorId) => _$this._operatorId = operatorId;

  String? _operatorFirstName;
  String? get operatorFirstName => _$this._operatorFirstName;
  set operatorFirstName(String? operatorFirstName) =>
      _$this._operatorFirstName = operatorFirstName;

  ListBuilder<HandoverChecklistItem>? _checklist;
  ListBuilder<HandoverChecklistItem> get checklist =>
      _$this._checklist ??= ListBuilder<HandoverChecklistItem>();
  set checklist(ListBuilder<HandoverChecklistItem>? checklist) =>
      _$this._checklist = checklist;

  ListBuilder<String>? _photoKeys;
  ListBuilder<String> get photoKeys =>
      _$this._photoKeys ??= ListBuilder<String>();
  set photoKeys(ListBuilder<String>? photoKeys) =>
      _$this._photoKeys = photoKeys;

  ListBuilder<String>? _photoUrls;
  ListBuilder<String> get photoUrls =>
      _$this._photoUrls ??= ListBuilder<String>();
  set photoUrls(ListBuilder<String>? photoUrls) =>
      _$this._photoUrls = photoUrls;

  int? _batteryPct;
  int? get batteryPct => _$this._batteryPct;
  set batteryPct(int? batteryPct) => _$this._batteryPct = batteryPct;

  String? _batterySerial;
  String? get batterySerial => _$this._batterySerial;
  set batterySerial(String? batterySerial) =>
      _$this._batterySerial = batterySerial;

  HandoverStatus? _status;
  HandoverStatus? get status => _$this._status;
  set status(HandoverStatus? status) => _$this._status = status;

  String? _lastError;
  String? get lastError => _$this._lastError;
  set lastError(String? lastError) => _$this._lastError = lastError;

  String? _disputeReason;
  String? get disputeReason => _$this._disputeReason;
  set disputeReason(String? disputeReason) =>
      _$this._disputeReason = disputeReason;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _respondedAt;
  DateTime? get respondedAt => _$this._respondedAt;
  set respondedAt(DateTime? respondedAt) => _$this._respondedAt = respondedAt;

  HandoverBuilder() {
    Handover._defaults(this);
  }

  HandoverBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _type = $v.type;
      _depotId = $v.depotId;
      _reservationId = $v.reservationId;
      _rentalId = $v.rentalId;
      _vehicleId = $v.vehicleId;
      _vehicleCode = $v.vehicleCode;
      _operatorId = $v.operatorId;
      _operatorFirstName = $v.operatorFirstName;
      _checklist = $v.checklist.toBuilder();
      _photoKeys = $v.photoKeys.toBuilder();
      _photoUrls = $v.photoUrls?.toBuilder();
      _batteryPct = $v.batteryPct;
      _batterySerial = $v.batterySerial;
      _status = $v.status;
      _lastError = $v.lastError;
      _disputeReason = $v.disputeReason;
      _createdAt = $v.createdAt;
      _respondedAt = $v.respondedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Handover other) {
    _$v = other as _$Handover;
  }

  @override
  void update(void Function(HandoverBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Handover build() => _build();

  _$Handover _build() {
    _$Handover _$result;
    try {
      _$result = _$v ??
          _$Handover._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'Handover', 'id'),
            type: BuiltValueNullFieldError.checkNotNull(
                type, r'Handover', 'type'),
            depotId: BuiltValueNullFieldError.checkNotNull(
                depotId, r'Handover', 'depotId'),
            reservationId: reservationId,
            rentalId: rentalId,
            vehicleId: BuiltValueNullFieldError.checkNotNull(
                vehicleId, r'Handover', 'vehicleId'),
            vehicleCode: vehicleCode,
            operatorId: BuiltValueNullFieldError.checkNotNull(
                operatorId, r'Handover', 'operatorId'),
            operatorFirstName: operatorFirstName,
            checklist: checklist.build(),
            photoKeys: photoKeys.build(),
            photoUrls: _photoUrls?.build(),
            batteryPct: BuiltValueNullFieldError.checkNotNull(
                batteryPct, r'Handover', 'batteryPct'),
            batterySerial: batterySerial,
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'Handover', 'status'),
            lastError: lastError,
            disputeReason: disputeReason,
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'Handover', 'createdAt'),
            respondedAt: respondedAt,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'checklist';
        checklist.build();
        _$failedField = 'photoKeys';
        photoKeys.build();
        _$failedField = 'photoUrls';
        _photoUrls?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'Handover', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
