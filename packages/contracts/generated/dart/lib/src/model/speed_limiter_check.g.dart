// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'speed_limiter_check.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SpeedLimiterCheck extends SpeedLimiterCheck {
  @override
  final bool ok;
  @override
  final int configuredMaxKmh;
  @override
  final String? notes;

  factory _$SpeedLimiterCheck(
          [void Function(SpeedLimiterCheckBuilder)? updates]) =>
      (SpeedLimiterCheckBuilder()..update(updates))._build();

  _$SpeedLimiterCheck._(
      {required this.ok, required this.configuredMaxKmh, this.notes})
      : super._();
  @override
  SpeedLimiterCheck rebuild(void Function(SpeedLimiterCheckBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SpeedLimiterCheckBuilder toBuilder() =>
      SpeedLimiterCheckBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SpeedLimiterCheck &&
        ok == other.ok &&
        configuredMaxKmh == other.configuredMaxKmh &&
        notes == other.notes;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, ok.hashCode);
    _$hash = $jc(_$hash, configuredMaxKmh.hashCode);
    _$hash = $jc(_$hash, notes.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SpeedLimiterCheck')
          ..add('ok', ok)
          ..add('configuredMaxKmh', configuredMaxKmh)
          ..add('notes', notes))
        .toString();
  }
}

class SpeedLimiterCheckBuilder
    implements Builder<SpeedLimiterCheck, SpeedLimiterCheckBuilder> {
  _$SpeedLimiterCheck? _$v;

  bool? _ok;
  bool? get ok => _$this._ok;
  set ok(bool? ok) => _$this._ok = ok;

  int? _configuredMaxKmh;
  int? get configuredMaxKmh => _$this._configuredMaxKmh;
  set configuredMaxKmh(int? configuredMaxKmh) =>
      _$this._configuredMaxKmh = configuredMaxKmh;

  String? _notes;
  String? get notes => _$this._notes;
  set notes(String? notes) => _$this._notes = notes;

  SpeedLimiterCheckBuilder() {
    SpeedLimiterCheck._defaults(this);
  }

  SpeedLimiterCheckBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _ok = $v.ok;
      _configuredMaxKmh = $v.configuredMaxKmh;
      _notes = $v.notes;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SpeedLimiterCheck other) {
    _$v = other as _$SpeedLimiterCheck;
  }

  @override
  void update(void Function(SpeedLimiterCheckBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SpeedLimiterCheck build() => _build();

  _$SpeedLimiterCheck _build() {
    final _$result = _$v ??
        _$SpeedLimiterCheck._(
          ok: BuiltValueNullFieldError.checkNotNull(
              ok, r'SpeedLimiterCheck', 'ok'),
          configuredMaxKmh: BuiltValueNullFieldError.checkNotNull(
              configuredMaxKmh, r'SpeedLimiterCheck', 'configuredMaxKmh'),
          notes: notes,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
