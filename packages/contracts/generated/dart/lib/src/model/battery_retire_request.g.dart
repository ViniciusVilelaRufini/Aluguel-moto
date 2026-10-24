// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'battery_retire_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$BatteryRetireRequest extends BatteryRetireRequest {
  @override
  final String? reason;

  factory _$BatteryRetireRequest(
          [void Function(BatteryRetireRequestBuilder)? updates]) =>
      (BatteryRetireRequestBuilder()..update(updates))._build();

  _$BatteryRetireRequest._({this.reason}) : super._();
  @override
  BatteryRetireRequest rebuild(
          void Function(BatteryRetireRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  BatteryRetireRequestBuilder toBuilder() =>
      BatteryRetireRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is BatteryRetireRequest && reason == other.reason;
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
    return (newBuiltValueToStringHelper(r'BatteryRetireRequest')
          ..add('reason', reason))
        .toString();
  }
}

class BatteryRetireRequestBuilder
    implements Builder<BatteryRetireRequest, BatteryRetireRequestBuilder> {
  _$BatteryRetireRequest? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  BatteryRetireRequestBuilder() {
    BatteryRetireRequest._defaults(this);
  }

  BatteryRetireRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(BatteryRetireRequest other) {
    _$v = other as _$BatteryRetireRequest;
  }

  @override
  void update(void Function(BatteryRetireRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  BatteryRetireRequest build() => _build();

  _$BatteryRetireRequest _build() {
    final _$result = _$v ??
        _$BatteryRetireRequest._(
          reason: reason,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
