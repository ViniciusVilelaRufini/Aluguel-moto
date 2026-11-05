// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'update_sim_card_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$UpdateSimCardRequest extends UpdateSimCardRequest {
  @override
  final String? iccid;
  @override
  final String? msisdn;
  @override
  final String? carrier;
  @override
  final String? apn;
  @override
  final SimCardStatus? status;
  @override
  final String? notes;
  @override
  final String? vehicleId;

  factory _$UpdateSimCardRequest(
          [void Function(UpdateSimCardRequestBuilder)? updates]) =>
      (UpdateSimCardRequestBuilder()..update(updates))._build();

  _$UpdateSimCardRequest._(
      {this.iccid,
      this.msisdn,
      this.carrier,
      this.apn,
      this.status,
      this.notes,
      this.vehicleId})
      : super._();
  @override
  UpdateSimCardRequest rebuild(
          void Function(UpdateSimCardRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  UpdateSimCardRequestBuilder toBuilder() =>
      UpdateSimCardRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is UpdateSimCardRequest &&
        iccid == other.iccid &&
        msisdn == other.msisdn &&
        carrier == other.carrier &&
        apn == other.apn &&
        status == other.status &&
        notes == other.notes &&
        vehicleId == other.vehicleId;
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
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'UpdateSimCardRequest')
          ..add('iccid', iccid)
          ..add('msisdn', msisdn)
          ..add('carrier', carrier)
          ..add('apn', apn)
          ..add('status', status)
          ..add('notes', notes)
          ..add('vehicleId', vehicleId))
        .toString();
  }
}

class UpdateSimCardRequestBuilder
    implements Builder<UpdateSimCardRequest, UpdateSimCardRequestBuilder> {
  _$UpdateSimCardRequest? _$v;

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

  UpdateSimCardRequestBuilder() {
    UpdateSimCardRequest._defaults(this);
  }

  UpdateSimCardRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _iccid = $v.iccid;
      _msisdn = $v.msisdn;
      _carrier = $v.carrier;
      _apn = $v.apn;
      _status = $v.status;
      _notes = $v.notes;
      _vehicleId = $v.vehicleId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(UpdateSimCardRequest other) {
    _$v = other as _$UpdateSimCardRequest;
  }

  @override
  void update(void Function(UpdateSimCardRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  UpdateSimCardRequest build() => _build();

  _$UpdateSimCardRequest _build() {
    final _$result = _$v ??
        _$UpdateSimCardRequest._(
          iccid: iccid,
          msisdn: msisdn,
          carrier: carrier,
          apn: apn,
          status: status,
          notes: notes,
          vehicleId: vehicleId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
