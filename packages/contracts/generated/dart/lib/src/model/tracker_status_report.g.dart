// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tracker_status_report.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$TrackerStatusReport extends TrackerStatusReport {
  @override
  final double? batteryVolts;
  @override
  final double? externalVolts;
  @override
  final bool? gprsOnline;
  @override
  final bool? acc;
  @override
  final bool? gpsOn;
  @override
  final bool? relay;
  @override
  final bool? sleep;
  @override
  final int? csq;

  factory _$TrackerStatusReport(
          [void Function(TrackerStatusReportBuilder)? updates]) =>
      (TrackerStatusReportBuilder()..update(updates))._build();

  _$TrackerStatusReport._(
      {this.batteryVolts,
      this.externalVolts,
      this.gprsOnline,
      this.acc,
      this.gpsOn,
      this.relay,
      this.sleep,
      this.csq})
      : super._();
  @override
  TrackerStatusReport rebuild(
          void Function(TrackerStatusReportBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  TrackerStatusReportBuilder toBuilder() =>
      TrackerStatusReportBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is TrackerStatusReport &&
        batteryVolts == other.batteryVolts &&
        externalVolts == other.externalVolts &&
        gprsOnline == other.gprsOnline &&
        acc == other.acc &&
        gpsOn == other.gpsOn &&
        relay == other.relay &&
        sleep == other.sleep &&
        csq == other.csq;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, batteryVolts.hashCode);
    _$hash = $jc(_$hash, externalVolts.hashCode);
    _$hash = $jc(_$hash, gprsOnline.hashCode);
    _$hash = $jc(_$hash, acc.hashCode);
    _$hash = $jc(_$hash, gpsOn.hashCode);
    _$hash = $jc(_$hash, relay.hashCode);
    _$hash = $jc(_$hash, sleep.hashCode);
    _$hash = $jc(_$hash, csq.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'TrackerStatusReport')
          ..add('batteryVolts', batteryVolts)
          ..add('externalVolts', externalVolts)
          ..add('gprsOnline', gprsOnline)
          ..add('acc', acc)
          ..add('gpsOn', gpsOn)
          ..add('relay', relay)
          ..add('sleep', sleep)
          ..add('csq', csq))
        .toString();
  }
}

class TrackerStatusReportBuilder
    implements Builder<TrackerStatusReport, TrackerStatusReportBuilder> {
  _$TrackerStatusReport? _$v;

  double? _batteryVolts;
  double? get batteryVolts => _$this._batteryVolts;
  set batteryVolts(double? batteryVolts) => _$this._batteryVolts = batteryVolts;

  double? _externalVolts;
  double? get externalVolts => _$this._externalVolts;
  set externalVolts(double? externalVolts) =>
      _$this._externalVolts = externalVolts;

  bool? _gprsOnline;
  bool? get gprsOnline => _$this._gprsOnline;
  set gprsOnline(bool? gprsOnline) => _$this._gprsOnline = gprsOnline;

  bool? _acc;
  bool? get acc => _$this._acc;
  set acc(bool? acc) => _$this._acc = acc;

  bool? _gpsOn;
  bool? get gpsOn => _$this._gpsOn;
  set gpsOn(bool? gpsOn) => _$this._gpsOn = gpsOn;

  bool? _relay;
  bool? get relay => _$this._relay;
  set relay(bool? relay) => _$this._relay = relay;

  bool? _sleep;
  bool? get sleep => _$this._sleep;
  set sleep(bool? sleep) => _$this._sleep = sleep;

  int? _csq;
  int? get csq => _$this._csq;
  set csq(int? csq) => _$this._csq = csq;

  TrackerStatusReportBuilder() {
    TrackerStatusReport._defaults(this);
  }

  TrackerStatusReportBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _batteryVolts = $v.batteryVolts;
      _externalVolts = $v.externalVolts;
      _gprsOnline = $v.gprsOnline;
      _acc = $v.acc;
      _gpsOn = $v.gpsOn;
      _relay = $v.relay;
      _sleep = $v.sleep;
      _csq = $v.csq;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(TrackerStatusReport other) {
    _$v = other as _$TrackerStatusReport;
  }

  @override
  void update(void Function(TrackerStatusReportBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  TrackerStatusReport build() => _build();

  _$TrackerStatusReport _build() {
    final _$result = _$v ??
        _$TrackerStatusReport._(
          batteryVolts: batteryVolts,
          externalVolts: externalVolts,
          gprsOnline: gprsOnline,
          acc: acc,
          gpsOn: gpsOn,
          relay: relay,
          sleep: sleep,
          csq: csq,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
