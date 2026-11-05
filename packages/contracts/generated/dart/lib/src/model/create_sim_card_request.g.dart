// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_sim_card_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CreateSimCardRequest extends CreateSimCardRequest {
  @override
  final String iccid;
  @override
  final String? msisdn;
  @override
  final String carrier;
  @override
  final String? apn;
  @override
  final SimCardStatus? status;
  @override
  final String? notes;
  @override
  final String? vehicleId;
  @override
  final String? trackerId;

  factory _$CreateSimCardRequest(
          [void Function(CreateSimCardRequestBuilder)? updates]) =>
      (CreateSimCardRequestBuilder()..update(updates))._build();

  _$CreateSimCardRequest._(
      {required this.iccid,
      this.msisdn,
      required this.carrier,
      this.apn,
      this.status,
      this.notes,
      this.vehicleId,
      this.trackerId})
      : super._();
  @override
  CreateSimCardRequest rebuild(
          void Function(CreateSimCardRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CreateSimCardRequestBuilder toBuilder() =>
      CreateSimCardRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CreateSimCardRequest &&
        iccid == other.iccid &&
        msisdn == other.msisdn &&
        carrier == other.carrier &&
        apn == other.apn &&
        status == other.status &&
        notes == other.notes &&
        vehicleId == other.vehicleId &&
        trackerId == other.trackerId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, iccid.hashCode);
    _$hash = $jc(_$hash, msisdn.hashCode);
    _$hash = $jc(_$hash, carrier.hashCode);
    _$hash = $jc(_$hash, apn.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, notes.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, trackerId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CreateSimCardRequest')
          ..add('iccid', iccid)
          ..add('msisdn', msisdn)
          ..add('carrier', carrier)
          ..add('apn', apn)
          ..add('status', status)
          ..add('notes', notes)
          ..add('vehicleId', vehicleId)
          ..add('trackerId', trackerId))
        .toString();
  }
}

class CreateSimCardRequestBuilder
    implements Builder<CreateSimCardRequest, CreateSimCardRequestBuilder> {
  _$CreateSimCardRequest? _$v;

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

  String? _trackerId;
  String? get trackerId => _$this._trackerId;
  set trackerId(String? trackerId) => _$this._trackerId = trackerId;

  CreateSimCardRequestBuilder() {
    CreateSimCardRequest._defaults(this);
  }

  CreateSimCardRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _iccid = $v.iccid;
      _msisdn = $v.msisdn;
      _carrier = $v.carrier;
      _apn = $v.apn;
      _status = $v.status;
      _notes = $v.notes;
      _vehicleId = $v.vehicleId;
      _trackerId = $v.trackerId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CreateSimCardRequest other) {
    _$v = other as _$CreateSimCardRequest;
  }

  @override
  void update(void Function(CreateSimCardRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CreateSimCardRequest build() => _build();

  _$CreateSimCardRequest _build() {
    final _$result = _$v ??
        _$CreateSimCardRequest._(
          iccid: BuiltValueNullFieldError.checkNotNull(
              iccid, r'CreateSimCardRequest', 'iccid'),
          msisdn: msisdn,
          carrier: BuiltValueNullFieldError.checkNotNull(
              carrier, r'CreateSimCardRequest', 'carrier'),
          apn: apn,
          status: status,
          notes: notes,
          vehicleId: vehicleId,
          trackerId: trackerId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
