// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'occupancy_row.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$OccupancyRow extends OccupancyRow {
  @override
  final DateTime periodStart;
  @override
  final int vehiclesTotal;
  @override
  final int vehiclesRented;
  @override
  final double occupancyPct;

  factory _$OccupancyRow([void Function(OccupancyRowBuilder)? updates]) =>
      (OccupancyRowBuilder()..update(updates))._build();

  _$OccupancyRow._(
      {required this.periodStart,
      required this.vehiclesTotal,
      required this.vehiclesRented,
      required this.occupancyPct})
      : super._();
  @override
  OccupancyRow rebuild(void Function(OccupancyRowBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  OccupancyRowBuilder toBuilder() => OccupancyRowBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is OccupancyRow &&
        periodStart == other.periodStart &&
        vehiclesTotal == other.vehiclesTotal &&
        vehiclesRented == other.vehiclesRented &&
        occupancyPct == other.occupancyPct;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, periodStart.hashCode);
    _$hash = $jc(_$hash, vehiclesTotal.hashCode);
    _$hash = $jc(_$hash, vehiclesRented.hashCode);
    _$hash = $jc(_$hash, occupancyPct.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'OccupancyRow')
          ..add('periodStart', periodStart)
          ..add('vehiclesTotal', vehiclesTotal)
          ..add('vehiclesRented', vehiclesRented)
          ..add('occupancyPct', occupancyPct))
        .toString();
  }
}

class OccupancyRowBuilder
    implements Builder<OccupancyRow, OccupancyRowBuilder> {
  _$OccupancyRow? _$v;

  DateTime? _periodStart;
  DateTime? get periodStart => _$this._periodStart;
  set periodStart(DateTime? periodStart) => _$this._periodStart = periodStart;

  int? _vehiclesTotal;
  int? get vehiclesTotal => _$this._vehiclesTotal;
  set vehiclesTotal(int? vehiclesTotal) =>
      _$this._vehiclesTotal = vehiclesTotal;

  int? _vehiclesRented;
  int? get vehiclesRented => _$this._vehiclesRented;
  set vehiclesRented(int? vehiclesRented) =>
      _$this._vehiclesRented = vehiclesRented;

  double? _occupancyPct;
  double? get occupancyPct => _$this._occupancyPct;
  set occupancyPct(double? occupancyPct) => _$this._occupancyPct = occupancyPct;

  OccupancyRowBuilder() {
    OccupancyRow._defaults(this);
  }

  OccupancyRowBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _periodStart = $v.periodStart;
      _vehiclesTotal = $v.vehiclesTotal;
      _vehiclesRented = $v.vehiclesRented;
      _occupancyPct = $v.occupancyPct;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(OccupancyRow other) {
    _$v = other as _$OccupancyRow;
  }

  @override
  void update(void Function(OccupancyRowBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  OccupancyRow build() => _build();

  _$OccupancyRow _build() {
    final _$result = _$v ??
        _$OccupancyRow._(
          periodStart: BuiltValueNullFieldError.checkNotNull(
              periodStart, r'OccupancyRow', 'periodStart'),
          vehiclesTotal: BuiltValueNullFieldError.checkNotNull(
              vehiclesTotal, r'OccupancyRow', 'vehiclesTotal'),
          vehiclesRented: BuiltValueNullFieldError.checkNotNull(
              vehiclesRented, r'OccupancyRow', 'vehiclesRented'),
          occupancyPct: BuiltValueNullFieldError.checkNotNull(
              occupancyPct, r'OccupancyRow', 'occupancyPct'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
