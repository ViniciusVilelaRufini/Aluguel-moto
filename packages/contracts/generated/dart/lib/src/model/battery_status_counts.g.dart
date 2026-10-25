// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'battery_status_counts.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$BatteryStatusCounts extends BatteryStatusCounts {
  @override
  final int inVehicle;
  @override
  final int inVan;
  @override
  final int charging;
  @override
  final int charged;
  @override
  final int inStation;
  @override
  final int defective;
  @override
  final int retired;

  factory _$BatteryStatusCounts(
          [void Function(BatteryStatusCountsBuilder)? updates]) =>
      (BatteryStatusCountsBuilder()..update(updates))._build();

  _$BatteryStatusCounts._(
      {required this.inVehicle,
      required this.inVan,
      required this.charging,
      required this.charged,
      required this.inStation,
      required this.defective,
      required this.retired})
      : super._();
  @override
  BatteryStatusCounts rebuild(
          void Function(BatteryStatusCountsBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  BatteryStatusCountsBuilder toBuilder() =>
      BatteryStatusCountsBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is BatteryStatusCounts &&
        inVehicle == other.inVehicle &&
        inVan == other.inVan &&
        charging == other.charging &&
        charged == other.charged &&
        inStation == other.inStation &&
        defective == other.defective &&
        retired == other.retired;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, inVehicle.hashCode);
    _$hash = $jc(_$hash, inVan.hashCode);
    _$hash = $jc(_$hash, charging.hashCode);
    _$hash = $jc(_$hash, charged.hashCode);
    _$hash = $jc(_$hash, inStation.hashCode);
    _$hash = $jc(_$hash, defective.hashCode);
    _$hash = $jc(_$hash, retired.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'BatteryStatusCounts')
          ..add('inVehicle', inVehicle)
          ..add('inVan', inVan)
          ..add('charging', charging)
          ..add('charged', charged)
          ..add('inStation', inStation)
          ..add('defective', defective)
          ..add('retired', retired))
        .toString();
  }
}

class BatteryStatusCountsBuilder
    implements Builder<BatteryStatusCounts, BatteryStatusCountsBuilder> {
  _$BatteryStatusCounts? _$v;

  int? _inVehicle;
  int? get inVehicle => _$this._inVehicle;
  set inVehicle(int? inVehicle) => _$this._inVehicle = inVehicle;

  int? _inVan;
  int? get inVan => _$this._inVan;
  set inVan(int? inVan) => _$this._inVan = inVan;

  int? _charging;
  int? get charging => _$this._charging;
  set charging(int? charging) => _$this._charging = charging;

  int? _charged;
  int? get charged => _$this._charged;
  set charged(int? charged) => _$this._charged = charged;

  int? _inStation;
  int? get inStation => _$this._inStation;
  set inStation(int? inStation) => _$this._inStation = inStation;

  int? _defective;
  int? get defective => _$this._defective;
  set defective(int? defective) => _$this._defective = defective;

  int? _retired;
  int? get retired => _$this._retired;
  set retired(int? retired) => _$this._retired = retired;

  BatteryStatusCountsBuilder() {
    BatteryStatusCounts._defaults(this);
  }

  BatteryStatusCountsBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _inVehicle = $v.inVehicle;
      _inVan = $v.inVan;
      _charging = $v.charging;
      _charged = $v.charged;
      _inStation = $v.inStation;
      _defective = $v.defective;
      _retired = $v.retired;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(BatteryStatusCounts other) {
    _$v = other as _$BatteryStatusCounts;
  }

  @override
  void update(void Function(BatteryStatusCountsBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  BatteryStatusCounts build() => _build();

  _$BatteryStatusCounts _build() {
    final _$result = _$v ??
        _$BatteryStatusCounts._(
          inVehicle: BuiltValueNullFieldError.checkNotNull(
              inVehicle, r'BatteryStatusCounts', 'inVehicle'),
          inVan: BuiltValueNullFieldError.checkNotNull(
              inVan, r'BatteryStatusCounts', 'inVan'),
          charging: BuiltValueNullFieldError.checkNotNull(
              charging, r'BatteryStatusCounts', 'charging'),
          charged: BuiltValueNullFieldError.checkNotNull(
              charged, r'BatteryStatusCounts', 'charged'),
          inStation: BuiltValueNullFieldError.checkNotNull(
              inStation, r'BatteryStatusCounts', 'inStation'),
          defective: BuiltValueNullFieldError.checkNotNull(
              defective, r'BatteryStatusCounts', 'defective'),
          retired: BuiltValueNullFieldError.checkNotNull(
              retired, r'BatteryStatusCounts', 'retired'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
