// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sim_card.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SimCard extends SimCard {
  @override
  final String id;
  @override
  final String iccid;
  @override
  final String? msisdn;
  @override
  final String carrier;
  @override
  final String? apn;
  @override
  final SimCardStatus status;
  @override
  final String? notes;
  @override
  final String? vehicleId;
  @override
  final String? vehicleCode;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  factory _$SimCard([void Function(SimCardBuilder)? updates]) =>
      (SimCardBuilder()..update(updates))._build();

  _$SimCard._(
      {required this.id,
      required this.iccid,
      this.msisdn,
      required this.carrier,
      this.apn,
      required this.status,
      this.notes,
      this.vehicleId,
      this.vehicleCode,
      required this.createdAt,
      required this.updatedAt})
      : super._();
  @override
  SimCard rebuild(void Function(SimCardBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SimCardBuilder toBuilder() => SimCardBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SimCard &&
        id == other.id &&
        iccid == other.iccid &&
        msisdn == other.msisdn &&
        carrier == other.carrier &&
        apn == other.apn &&
        status == other.status &&
        notes == other.notes &&
        vehicleId == other.vehicleId &&
        vehicleCode == other.vehicleCode &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, iccid.hashCode);
    _$hash = $jc(_$hash, msisdn.hashCode);
    _$hash = $jc(_$hash, carrier.hashCode);
    _$hash = $jc(_$hash, apn.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, notes.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, vehicleCode.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SimCard')
          ..add('id', id)
          ..add('iccid', iccid)
          ..add('msisdn', msisdn)
          ..add('carrier', carrier)
          ..add('apn', apn)
          ..add('status', status)
          ..add('notes', notes)
          ..add('vehicleId', vehicleId)
          ..add('vehicleCode', vehicleCode)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class SimCardBuilder implements Builder<SimCard, SimCardBuilder> {
  _$SimCard? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _iccid;
  String? get iccid => _$this._iccid;
  set iccid(String? iccid) => _$this._iccid = iccid;

  String? _msisdn;
  String? get msisdn => _$this._msisdn;
  set msisdn(String? msisdn) => _$this._msisdn = msisdn;

  String? _carrier;
  String? get carrier => _$this._carrier;
  set carrier(String? carrier) => _$this._carrier = carrier;

  String? _apn;
  String? get apn => _$this._apn;
  set apn(String? apn) => _$this._apn = apn;

  SimCardStatus? _status;
  SimCardStatus? get status => _$this._status;
  set status(SimCardStatus? status) => _$this._status = status;

  String? _notes;
  String? get notes => _$this._notes;
  set notes(String? notes) => _$this._notes = notes;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _vehicleCode;
  String? get vehicleCode => _$this._vehicleCode;
  set vehicleCode(String? vehicleCode) => _$this._vehicleCode = vehicleCode;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  SimCardBuilder() {
    SimCard._defaults(this);
  }

  SimCardBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _iccid = $v.iccid;
      _msisdn = $v.msisdn;
      _carrier = $v.carrier;
      _apn = $v.apn;
      _status = $v.status;
      _notes = $v.notes;
      _vehicleId = $v.vehicleId;
      _vehicleCode = $v.vehicleCode;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SimCard other) {
    _$v = other as _$SimCard;
  }

  @override
  void update(void Function(SimCardBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SimCard build() => _build();

  _$SimCard _build() {
    final _$result = _$v ??
        _$SimCard._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'SimCard', 'id'),
          iccid:
              BuiltValueNullFieldError.checkNotNull(iccid, r'SimCard', 'iccid'),
          msisdn: msisdn,
          carrier: BuiltValueNullFieldError.checkNotNull(
              carrier, r'SimCard', 'carrier'),
          apn: apn,
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'SimCard', 'status'),
          notes: notes,
          vehicleId: vehicleId,
          vehicleCode: vehicleCode,
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'SimCard', 'createdAt'),
          updatedAt: BuiltValueNullFieldError.checkNotNull(
              updatedAt, r'SimCard', 'updatedAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
