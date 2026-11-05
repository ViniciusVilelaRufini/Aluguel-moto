// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sim_card_summary.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SimCardSummary extends SimCardSummary {
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

  factory _$SimCardSummary([void Function(SimCardSummaryBuilder)? updates]) =>
      (SimCardSummaryBuilder()..update(updates))._build();

  _$SimCardSummary._(
      {required this.id,
      required this.iccid,
      this.msisdn,
      required this.carrier,
      this.apn,
      required this.status})
      : super._();
  @override
  SimCardSummary rebuild(void Function(SimCardSummaryBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SimCardSummaryBuilder toBuilder() => SimCardSummaryBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SimCardSummary &&
        id == other.id &&
        iccid == other.iccid &&
        msisdn == other.msisdn &&
        carrier == other.carrier &&
        apn == other.apn &&
        status == other.status;
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
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SimCardSummary')
          ..add('id', id)
          ..add('iccid', iccid)
          ..add('msisdn', msisdn)
          ..add('carrier', carrier)
          ..add('apn', apn)
          ..add('status', status))
        .toString();
  }
}

class SimCardSummaryBuilder
    implements Builder<SimCardSummary, SimCardSummaryBuilder> {
  _$SimCardSummary? _$v;

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

  SimCardSummaryBuilder() {
    SimCardSummary._defaults(this);
  }

  SimCardSummaryBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _iccid = $v.iccid;
      _msisdn = $v.msisdn;
      _carrier = $v.carrier;
      _apn = $v.apn;
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SimCardSummary other) {
    _$v = other as _$SimCardSummary;
  }

  @override
  void update(void Function(SimCardSummaryBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SimCardSummary build() => _build();

  _$SimCardSummary _build() {
    final _$result = _$v ??
        _$SimCardSummary._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'SimCardSummary', 'id'),
          iccid: BuiltValueNullFieldError.checkNotNull(
              iccid, r'SimCardSummary', 'iccid'),
          msisdn: msisdn,
          carrier: BuiltValueNullFieldError.checkNotNull(
              carrier, r'SimCardSummary', 'carrier'),
          apn: apn,
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'SimCardSummary', 'status'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
