// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'battery_swap_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$BatterySwapRequest extends BatterySwapRequest {
  @override
  final String removedBatterySerial;
  @override
  final String installedBatterySerial;
  @override
  final int? installedBatteryPct;
  @override
  final DateTime recordedAt;

  factory _$BatterySwapRequest(
          [void Function(BatterySwapRequestBuilder)? updates]) =>
      (BatterySwapRequestBuilder()..update(updates))._build();

  _$BatterySwapRequest._(
      {required this.removedBatterySerial,
      required this.installedBatterySerial,
      this.installedBatteryPct,
      required this.recordedAt})
      : super._();
  @override
  BatterySwapRequest rebuild(
          void Function(BatterySwapRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  BatterySwapRequestBuilder toBuilder() =>
      BatterySwapRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is BatterySwapRequest &&
        removedBatterySerial == other.removedBatterySerial &&
        installedBatterySerial == other.installedBatterySerial &&
        installedBatteryPct == other.installedBatteryPct &&
        recordedAt == other.recordedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, removedBatterySerial.hashCode);
    _$hash = $jc(_$hash, installedBatterySerial.hashCode);
    _$hash = $jc(_$hash, installedBatteryPct.hashCode);
    _$hash = $jc(_$hash, recordedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'BatterySwapRequest')
          ..add('removedBatterySerial', removedBatterySerial)
          ..add('installedBatterySerial', installedBatterySerial)
          ..add('installedBatteryPct', installedBatteryPct)
          ..add('recordedAt', recordedAt))
        .toString();
  }
}

class BatterySwapRequestBuilder
    implements Builder<BatterySwapRequest, BatterySwapRequestBuilder> {
  _$BatterySwapRequest? _$v;

  String? _removedBatterySerial;
  String? get removedBatterySerial => _$this._removedBatterySerial;
  set removedBatterySerial(String? removedBatterySerial) =>
      _$this._removedBatterySerial = removedBatterySerial;

  String? _installedBatterySerial;
  String? get installedBatterySerial => _$this._installedBatterySerial;
  set installedBatterySerial(String? installedBatterySerial) =>
      _$this._installedBatterySerial = installedBatterySerial;

  int? _installedBatteryPct;
  int? get installedBatteryPct => _$this._installedBatteryPct;
  set installedBatteryPct(int? installedBatteryPct) =>
      _$this._installedBatteryPct = installedBatteryPct;

  DateTime? _recordedAt;
  DateTime? get recordedAt => _$this._recordedAt;
  set recordedAt(DateTime? recordedAt) => _$this._recordedAt = recordedAt;

  BatterySwapRequestBuilder() {
    BatterySwapRequest._defaults(this);
  }

  BatterySwapRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _removedBatterySerial = $v.removedBatterySerial;
      _installedBatterySerial = $v.installedBatterySerial;
      _installedBatteryPct = $v.installedBatteryPct;
      _recordedAt = $v.recordedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(BatterySwapRequest other) {
    _$v = other as _$BatterySwapRequest;
  }

  @override
  void update(void Function(BatterySwapRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  BatterySwapRequest build() => _build();

  _$BatterySwapRequest _build() {
    final _$result = _$v ??
        _$BatterySwapRequest._(
          removedBatterySerial: BuiltValueNullFieldError.checkNotNull(
              removedBatterySerial,
              r'BatterySwapRequest',
              'removedBatterySerial'),
          installedBatterySerial: BuiltValueNullFieldError.checkNotNull(
              installedBatterySerial,
              r'BatterySwapRequest',
              'installedBatterySerial'),
          installedBatteryPct: installedBatteryPct,
          recordedAt: BuiltValueNullFieldError.checkNotNull(
              recordedAt, r'BatterySwapRequest', 'recordedAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
