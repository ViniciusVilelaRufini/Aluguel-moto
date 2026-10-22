// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_service_info.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleServiceInfo extends VehicleServiceInfo {
  @override
  final double odometerKm;
  @override
  final double usageHours;
  @override
  final double kmSinceService;
  @override
  final double hoursSinceService;
  @override
  final int serviceIntervalKm;
  @override
  final int serviceIntervalHours;
  @override
  final double nextServiceAtKm;
  @override
  final double nextServiceAtHours;
  @override
  final double kmUntilService;
  @override
  final double hoursUntilService;
  @override
  final VehicleServiceStatus status;
  @override
  final DateTime? lastServiceAt;

  factory _$VehicleServiceInfo(
          [void Function(VehicleServiceInfoBuilder)? updates]) =>
      (VehicleServiceInfoBuilder()..update(updates))._build();

  _$VehicleServiceInfo._(
      {required this.odometerKm,
      required this.usageHours,
      required this.kmSinceService,
      required this.hoursSinceService,
      required this.serviceIntervalKm,
      required this.serviceIntervalHours,
      required this.nextServiceAtKm,
      required this.nextServiceAtHours,
      required this.kmUntilService,
      required this.hoursUntilService,
      required this.status,
      this.lastServiceAt})
      : super._();
  @override
  VehicleServiceInfo rebuild(
          void Function(VehicleServiceInfoBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleServiceInfoBuilder toBuilder() =>
      VehicleServiceInfoBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleServiceInfo &&
        odometerKm == other.odometerKm &&
        usageHours == other.usageHours &&
        kmSinceService == other.kmSinceService &&
        hoursSinceService == other.hoursSinceService &&
        serviceIntervalKm == other.serviceIntervalKm &&
        serviceIntervalHours == other.serviceIntervalHours &&
        nextServiceAtKm == other.nextServiceAtKm &&
        nextServiceAtHours == other.nextServiceAtHours &&
        kmUntilService == other.kmUntilService &&
        hoursUntilService == other.hoursUntilService &&
        status == other.status &&
        lastServiceAt == other.lastServiceAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, odometerKm.hashCode);
    _$hash = $jc(_$hash, usageHours.hashCode);
    _$hash = $jc(_$hash, kmSinceService.hashCode);
    _$hash = $jc(_$hash, hoursSinceService.hashCode);
    _$hash = $jc(_$hash, serviceIntervalKm.hashCode);
    _$hash = $jc(_$hash, serviceIntervalHours.hashCode);
    _$hash = $jc(_$hash, nextServiceAtKm.hashCode);
    _$hash = $jc(_$hash, nextServiceAtHours.hashCode);
    _$hash = $jc(_$hash, kmUntilService.hashCode);
    _$hash = $jc(_$hash, hoursUntilService.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, lastServiceAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehicleServiceInfo')
          ..add('odometerKm', odometerKm)
          ..add('usageHours', usageHours)
          ..add('kmSinceService', kmSinceService)
          ..add('hoursSinceService', hoursSinceService)
          ..add('serviceIntervalKm', serviceIntervalKm)
          ..add('serviceIntervalHours', serviceIntervalHours)
          ..add('nextServiceAtKm', nextServiceAtKm)
          ..add('nextServiceAtHours', nextServiceAtHours)
          ..add('kmUntilService', kmUntilService)
          ..add('hoursUntilService', hoursUntilService)
          ..add('status', status)
          ..add('lastServiceAt', lastServiceAt))
        .toString();
  }
}

class VehicleServiceInfoBuilder
    implements Builder<VehicleServiceInfo, VehicleServiceInfoBuilder> {
  _$VehicleServiceInfo? _$v;

  double? _odometerKm;
  double? get odometerKm => _$this._odometerKm;
  set odometerKm(double? odometerKm) => _$this._odometerKm = odometerKm;

  double? _usageHours;
  double? get usageHours => _$this._usageHours;
  set usageHours(double? usageHours) => _$this._usageHours = usageHours;

  double? _kmSinceService;
  double? get kmSinceService => _$this._kmSinceService;
  set kmSinceService(double? kmSinceService) =>
      _$this._kmSinceService = kmSinceService;

  double? _hoursSinceService;
  double? get hoursSinceService => _$this._hoursSinceService;
  set hoursSinceService(double? hoursSinceService) =>
      _$this._hoursSinceService = hoursSinceService;

  int? _serviceIntervalKm;
  int? get serviceIntervalKm => _$this._serviceIntervalKm;
  set serviceIntervalKm(int? serviceIntervalKm) =>
      _$this._serviceIntervalKm = serviceIntervalKm;

  int? _serviceIntervalHours;
  int? get serviceIntervalHours => _$this._serviceIntervalHours;
  set serviceIntervalHours(int? serviceIntervalHours) =>
      _$this._serviceIntervalHours = serviceIntervalHours;

  double? _nextServiceAtKm;
  double? get nextServiceAtKm => _$this._nextServiceAtKm;
  set nextServiceAtKm(double? nextServiceAtKm) =>
      _$this._nextServiceAtKm = nextServiceAtKm;

  double? _nextServiceAtHours;
  double? get nextServiceAtHours => _$this._nextServiceAtHours;
  set nextServiceAtHours(double? nextServiceAtHours) =>
      _$this._nextServiceAtHours = nextServiceAtHours;

  double? _kmUntilService;
  double? get kmUntilService => _$this._kmUntilService;
  set kmUntilService(double? kmUntilService) =>
      _$this._kmUntilService = kmUntilService;

  double? _hoursUntilService;
  double? get hoursUntilService => _$this._hoursUntilService;
  set hoursUntilService(double? hoursUntilService) =>
      _$this._hoursUntilService = hoursUntilService;

  VehicleServiceStatus? _status;
  VehicleServiceStatus? get status => _$this._status;
  set status(VehicleServiceStatus? status) => _$this._status = status;

  DateTime? _lastServiceAt;
  DateTime? get lastServiceAt => _$this._lastServiceAt;
  set lastServiceAt(DateTime? lastServiceAt) =>
      _$this._lastServiceAt = lastServiceAt;

  VehicleServiceInfoBuilder() {
    VehicleServiceInfo._defaults(this);
  }

  VehicleServiceInfoBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _odometerKm = $v.odometerKm;
      _usageHours = $v.usageHours;
      _kmSinceService = $v.kmSinceService;
      _hoursSinceService = $v.hoursSinceService;
      _serviceIntervalKm = $v.serviceIntervalKm;
      _serviceIntervalHours = $v.serviceIntervalHours;
      _nextServiceAtKm = $v.nextServiceAtKm;
      _nextServiceAtHours = $v.nextServiceAtHours;
      _kmUntilService = $v.kmUntilService;
      _hoursUntilService = $v.hoursUntilService;
      _status = $v.status;
      _lastServiceAt = $v.lastServiceAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleServiceInfo other) {
    _$v = other as _$VehicleServiceInfo;
  }

  @override
  void update(void Function(VehicleServiceInfoBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleServiceInfo build() => _build();

  _$VehicleServiceInfo _build() {
    final _$result = _$v ??
        _$VehicleServiceInfo._(
          odometerKm: BuiltValueNullFieldError.checkNotNull(
              odometerKm, r'VehicleServiceInfo', 'odometerKm'),
          usageHours: BuiltValueNullFieldError.checkNotNull(
              usageHours, r'VehicleServiceInfo', 'usageHours'),
          kmSinceService: BuiltValueNullFieldError.checkNotNull(
              kmSinceService, r'VehicleServiceInfo', 'kmSinceService'),
          hoursSinceService: BuiltValueNullFieldError.checkNotNull(
              hoursSinceService, r'VehicleServiceInfo', 'hoursSinceService'),
          serviceIntervalKm: BuiltValueNullFieldError.checkNotNull(
              serviceIntervalKm, r'VehicleServiceInfo', 'serviceIntervalKm'),
          serviceIntervalHours: BuiltValueNullFieldError.checkNotNull(
              serviceIntervalHours,
              r'VehicleServiceInfo',
              'serviceIntervalHours'),
          nextServiceAtKm: BuiltValueNullFieldError.checkNotNull(
              nextServiceAtKm, r'VehicleServiceInfo', 'nextServiceAtKm'),
          nextServiceAtHours: BuiltValueNullFieldError.checkNotNull(
              nextServiceAtHours, r'VehicleServiceInfo', 'nextServiceAtHours'),
          kmUntilService: BuiltValueNullFieldError.checkNotNull(
              kmUntilService, r'VehicleServiceInfo', 'kmUntilService'),
          hoursUntilService: BuiltValueNullFieldError.checkNotNull(
              hoursUntilService, r'VehicleServiceInfo', 'hoursUntilService'),
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'VehicleServiceInfo', 'status'),
          lastServiceAt: lastServiceAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
