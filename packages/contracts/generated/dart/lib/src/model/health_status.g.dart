// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'health_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$HealthStatus extends HealthStatus {
  @override
  final HealthState status;
  @override
  final String version;
  @override
  final DateTime time;
  @override
  final BuiltMap<String, HealthState>? checks;

  factory _$HealthStatus([void Function(HealthStatusBuilder)? updates]) =>
      (HealthStatusBuilder()..update(updates))._build();

  _$HealthStatus._(
      {required this.status,
      required this.version,
      required this.time,
      this.checks})
      : super._();
  @override
  HealthStatus rebuild(void Function(HealthStatusBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  HealthStatusBuilder toBuilder() => HealthStatusBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is HealthStatus &&
        status == other.status &&
        version == other.version &&
        time == other.time &&
        checks == other.checks;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, version.hashCode);
    _$hash = $jc(_$hash, time.hashCode);
    _$hash = $jc(_$hash, checks.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'HealthStatus')
          ..add('status', status)
          ..add('version', version)
          ..add('time', time)
          ..add('checks', checks))
        .toString();
  }
}

class HealthStatusBuilder
    implements Builder<HealthStatus, HealthStatusBuilder> {
  _$HealthStatus? _$v;

  HealthState? _status;
  HealthState? get status => _$this._status;
  set status(HealthState? status) => _$this._status = status;

  String? _version;
  String? get version => _$this._version;
  set version(String? version) => _$this._version = version;

  DateTime? _time;
  DateTime? get time => _$this._time;
  set time(DateTime? time) => _$this._time = time;

  MapBuilder<String, HealthState>? _checks;
  MapBuilder<String, HealthState> get checks =>
      _$this._checks ??= MapBuilder<String, HealthState>();
  set checks(MapBuilder<String, HealthState>? checks) =>
      _$this._checks = checks;

  HealthStatusBuilder() {
    HealthStatus._defaults(this);
  }

  HealthStatusBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _status = $v.status;
      _version = $v.version;
      _time = $v.time;
      _checks = $v.checks?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(HealthStatus other) {
    _$v = other as _$HealthStatus;
  }

  @override
  void update(void Function(HealthStatusBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  HealthStatus build() => _build();

  _$HealthStatus _build() {
    _$HealthStatus _$result;
    try {
      _$result = _$v ??
          _$HealthStatus._(
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'HealthStatus', 'status'),
            version: BuiltValueNullFieldError.checkNotNull(
                version, r'HealthStatus', 'version'),
            time: BuiltValueNullFieldError.checkNotNull(
                time, r'HealthStatus', 'time'),
            checks: _checks?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'checks';
        _checks?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'HealthStatus', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
