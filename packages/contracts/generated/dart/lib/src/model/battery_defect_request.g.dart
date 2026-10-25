// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'battery_defect_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$BatteryDefectRequest extends BatteryDefectRequest {
  @override
  final String reason;

  factory _$BatteryDefectRequest(
          [void Function(BatteryDefectRequestBuilder)? updates]) =>
      (BatteryDefectRequestBuilder()..update(updates))._build();

  _$BatteryDefectRequest._({required this.reason}) : super._();
  @override
  BatteryDefectRequest rebuild(
          void Function(BatteryDefectRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  BatteryDefectRequestBuilder toBuilder() =>
      BatteryDefectRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is BatteryDefectRequest && reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'BatteryDefectRequest')
          ..add('reason', reason))
        .toString();
  }
}

class BatteryDefectRequestBuilder
    implements Builder<BatteryDefectRequest, BatteryDefectRequestBuilder> {
  _$BatteryDefectRequest? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  BatteryDefectRequestBuilder() {
    BatteryDefectRequest._defaults(this);
  }

  BatteryDefectRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(BatteryDefectRequest other) {
    _$v = other as _$BatteryDefectRequest;
  }

  @override
  void update(void Function(BatteryDefectRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  BatteryDefectRequest build() => _build();

  _$BatteryDefectRequest _build() {
    final _$result = _$v ??
        _$BatteryDefectRequest._(
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'BatteryDefectRequest', 'reason'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
