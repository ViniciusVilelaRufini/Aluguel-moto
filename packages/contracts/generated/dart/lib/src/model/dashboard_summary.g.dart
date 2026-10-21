// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dashboard_summary.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DashboardSummary extends DashboardSummary {
  @override
  final DateTime generatedAt;
  @override
  final double occupancyPct;
  @override
  final int activeRentals;
  @override
  final int revenueTodayCents;
  @override
  final int openAlerts;
  @override
  final VehicleStatusCounts vehiclesByStatus;

  factory _$DashboardSummary(
          [void Function(DashboardSummaryBuilder)? updates]) =>
      (DashboardSummaryBuilder()..update(updates))._build();

  _$DashboardSummary._(
      {required this.generatedAt,
      required this.occupancyPct,
      required this.activeRentals,
      required this.revenueTodayCents,
      required this.openAlerts,
      required this.vehiclesByStatus})
      : super._();
  @override
  DashboardSummary rebuild(void Function(DashboardSummaryBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DashboardSummaryBuilder toBuilder() =>
      DashboardSummaryBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DashboardSummary &&
        generatedAt == other.generatedAt &&
        occupancyPct == other.occupancyPct &&
        activeRentals == other.activeRentals &&
        revenueTodayCents == other.revenueTodayCents &&
        openAlerts == other.openAlerts &&
        vehiclesByStatus == other.vehiclesByStatus;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, generatedAt.hashCode);
    _$hash = $jc(_$hash, occupancyPct.hashCode);
    _$hash = $jc(_$hash, activeRentals.hashCode);
    _$hash = $jc(_$hash, revenueTodayCents.hashCode);
    _$hash = $jc(_$hash, openAlerts.hashCode);
    _$hash = $jc(_$hash, vehiclesByStatus.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DashboardSummary')
          ..add('generatedAt', generatedAt)
          ..add('occupancyPct', occupancyPct)
          ..add('activeRentals', activeRentals)
          ..add('revenueTodayCents', revenueTodayCents)
          ..add('openAlerts', openAlerts)
          ..add('vehiclesByStatus', vehiclesByStatus))
        .toString();
  }
}

class DashboardSummaryBuilder
    implements Builder<DashboardSummary, DashboardSummaryBuilder> {
  _$DashboardSummary? _$v;

  DateTime? _generatedAt;
  DateTime? get generatedAt => _$this._generatedAt;
  set generatedAt(DateTime? generatedAt) => _$this._generatedAt = generatedAt;

  double? _occupancyPct;
  double? get occupancyPct => _$this._occupancyPct;
  set occupancyPct(double? occupancyPct) => _$this._occupancyPct = occupancyPct;

  int? _activeRentals;
  int? get activeRentals => _$this._activeRentals;
  set activeRentals(int? activeRentals) =>
      _$this._activeRentals = activeRentals;

  int? _revenueTodayCents;
  int? get revenueTodayCents => _$this._revenueTodayCents;
  set revenueTodayCents(int? revenueTodayCents) =>
      _$this._revenueTodayCents = revenueTodayCents;

  int? _openAlerts;
  int? get openAlerts => _$this._openAlerts;
  set openAlerts(int? openAlerts) => _$this._openAlerts = openAlerts;

  VehicleStatusCountsBuilder? _vehiclesByStatus;
  VehicleStatusCountsBuilder get vehiclesByStatus =>
      _$this._vehiclesByStatus ??= VehicleStatusCountsBuilder();
  set vehiclesByStatus(VehicleStatusCountsBuilder? vehiclesByStatus) =>
      _$this._vehiclesByStatus = vehiclesByStatus;

  DashboardSummaryBuilder() {
    DashboardSummary._defaults(this);
  }

  DashboardSummaryBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _generatedAt = $v.generatedAt;
      _occupancyPct = $v.occupancyPct;
      _activeRentals = $v.activeRentals;
      _revenueTodayCents = $v.revenueTodayCents;
      _openAlerts = $v.openAlerts;
      _vehiclesByStatus = $v.vehiclesByStatus.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DashboardSummary other) {
    _$v = other as _$DashboardSummary;
  }

  @override
  void update(void Function(DashboardSummaryBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DashboardSummary build() => _build();

  _$DashboardSummary _build() {
    _$DashboardSummary _$result;
    try {
      _$result = _$v ??
          _$DashboardSummary._(
            generatedAt: BuiltValueNullFieldError.checkNotNull(
                generatedAt, r'DashboardSummary', 'generatedAt'),
            occupancyPct: BuiltValueNullFieldError.checkNotNull(
                occupancyPct, r'DashboardSummary', 'occupancyPct'),
            activeRentals: BuiltValueNullFieldError.checkNotNull(
                activeRentals, r'DashboardSummary', 'activeRentals'),
            revenueTodayCents: BuiltValueNullFieldError.checkNotNull(
                revenueTodayCents, r'DashboardSummary', 'revenueTodayCents'),
            openAlerts: BuiltValueNullFieldError.checkNotNull(
                openAlerts, r'DashboardSummary', 'openAlerts'),
            vehiclesByStatus: vehiclesByStatus.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'vehiclesByStatus';
        vehiclesByStatus.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'DashboardSummary', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
