// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_revenue_row.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleRevenueRow extends VehicleRevenueRow {
  @override
  final String vehicleId;
  @override
  final String vehicleCode;
  @override
  final Date date;
  @override
  final int rentals;
  @override
  final int? rentedSeconds;
  @override
  final int revenueCents;

  factory _$VehicleRevenueRow(
          [void Function(VehicleRevenueRowBuilder)? updates]) =>
      (VehicleRevenueRowBuilder()..update(updates))._build();

  _$VehicleRevenueRow._(
      {required this.vehicleId,
      required this.vehicleCode,
      required this.date,
      required this.rentals,
      this.rentedSeconds,
      required this.revenueCents})
      : super._();
  @override
  VehicleRevenueRow rebuild(void Function(VehicleRevenueRowBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleRevenueRowBuilder toBuilder() =>
      VehicleRevenueRowBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleRevenueRow &&
        vehicleId == other.vehicleId &&
        vehicleCode == other.vehicleCode &&
        date == other.date &&
        rentals == other.rentals &&
        rentedSeconds == other.rentedSeconds &&
        revenueCents == other.revenueCents;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, vehicleCode.hashCode);
    _$hash = $jc(_$hash, date.hashCode);
    _$hash = $jc(_$hash, rentals.hashCode);
    _$hash = $jc(_$hash, rentedSeconds.hashCode);
    _$hash = $jc(_$hash, revenueCents.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehicleRevenueRow')
          ..add('vehicleId', vehicleId)
          ..add('vehicleCode', vehicleCode)
          ..add('date', date)
          ..add('rentals', rentals)
          ..add('rentedSeconds', rentedSeconds)
          ..add('revenueCents', revenueCents))
        .toString();
  }
}

class VehicleRevenueRowBuilder
    implements Builder<VehicleRevenueRow, VehicleRevenueRowBuilder> {
  _$VehicleRevenueRow? _$v;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _vehicleCode;
  String? get vehicleCode => _$this._vehicleCode;
  set vehicleCode(String? vehicleCode) => _$this._vehicleCode = vehicleCode;

  Date? _date;
  Date? get date => _$this._date;
  set date(Date? date) => _$this._date = date;

  int? _rentals;
  int? get rentals => _$this._rentals;
  set rentals(int? rentals) => _$this._rentals = rentals;

  int? _rentedSeconds;
  int? get rentedSeconds => _$this._rentedSeconds;
  set rentedSeconds(int? rentedSeconds) =>
      _$this._rentedSeconds = rentedSeconds;

  int? _revenueCents;
  int? get revenueCents => _$this._revenueCents;
  set revenueCents(int? revenueCents) => _$this._revenueCents = revenueCents;

  VehicleRevenueRowBuilder() {
    VehicleRevenueRow._defaults(this);
  }

  VehicleRevenueRowBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _vehicleId = $v.vehicleId;
      _vehicleCode = $v.vehicleCode;
      _date = $v.date;
      _rentals = $v.rentals;
      _rentedSeconds = $v.rentedSeconds;
      _revenueCents = $v.revenueCents;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleRevenueRow other) {
    _$v = other as _$VehicleRevenueRow;
  }

  @override
  void update(void Function(VehicleRevenueRowBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleRevenueRow build() => _build();

  _$VehicleRevenueRow _build() {
    final _$result = _$v ??
        _$VehicleRevenueRow._(
          vehicleId: BuiltValueNullFieldError.checkNotNull(
              vehicleId, r'VehicleRevenueRow', 'vehicleId'),
          vehicleCode: BuiltValueNullFieldError.checkNotNull(
              vehicleCode, r'VehicleRevenueRow', 'vehicleCode'),
          date: BuiltValueNullFieldError.checkNotNull(
              date, r'VehicleRevenueRow', 'date'),
          rentals: BuiltValueNullFieldError.checkNotNull(
              rentals, r'VehicleRevenueRow', 'rentals'),
          rentedSeconds: rentedSeconds,
          revenueCents: BuiltValueNullFieldError.checkNotNull(
              revenueCents, r'VehicleRevenueRow', 'revenueCents'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
