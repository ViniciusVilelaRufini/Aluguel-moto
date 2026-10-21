// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'customer_stats.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CustomerStats extends CustomerStats {
  @override
  final int rentalsCount;
  @override
  final int totalSpentCents;
  @override
  final int openDisputes;
  @override
  final DateTime? lastRentalAt;

  factory _$CustomerStats([void Function(CustomerStatsBuilder)? updates]) =>
      (CustomerStatsBuilder()..update(updates))._build();

  _$CustomerStats._(
      {required this.rentalsCount,
      required this.totalSpentCents,
      required this.openDisputes,
      this.lastRentalAt})
      : super._();
  @override
  CustomerStats rebuild(void Function(CustomerStatsBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CustomerStatsBuilder toBuilder() => CustomerStatsBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CustomerStats &&
        rentalsCount == other.rentalsCount &&
        totalSpentCents == other.totalSpentCents &&
        openDisputes == other.openDisputes &&
        lastRentalAt == other.lastRentalAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, rentalsCount.hashCode);
    _$hash = $jc(_$hash, totalSpentCents.hashCode);
    _$hash = $jc(_$hash, openDisputes.hashCode);
    _$hash = $jc(_$hash, lastRentalAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CustomerStats')
          ..add('rentalsCount', rentalsCount)
          ..add('totalSpentCents', totalSpentCents)
          ..add('openDisputes', openDisputes)
          ..add('lastRentalAt', lastRentalAt))
        .toString();
  }
}

class CustomerStatsBuilder
    implements Builder<CustomerStats, CustomerStatsBuilder> {
  _$CustomerStats? _$v;

  int? _rentalsCount;
  int? get rentalsCount => _$this._rentalsCount;
  set rentalsCount(int? rentalsCount) => _$this._rentalsCount = rentalsCount;

  int? _totalSpentCents;
  int? get totalSpentCents => _$this._totalSpentCents;
  set totalSpentCents(int? totalSpentCents) =>
      _$this._totalSpentCents = totalSpentCents;

  int? _openDisputes;
  int? get openDisputes => _$this._openDisputes;
  set openDisputes(int? openDisputes) => _$this._openDisputes = openDisputes;

  DateTime? _lastRentalAt;
  DateTime? get lastRentalAt => _$this._lastRentalAt;
  set lastRentalAt(DateTime? lastRentalAt) =>
      _$this._lastRentalAt = lastRentalAt;

  CustomerStatsBuilder() {
    CustomerStats._defaults(this);
  }

  CustomerStatsBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _rentalsCount = $v.rentalsCount;
      _totalSpentCents = $v.totalSpentCents;
      _openDisputes = $v.openDisputes;
      _lastRentalAt = $v.lastRentalAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CustomerStats other) {
    _$v = other as _$CustomerStats;
  }

  @override
  void update(void Function(CustomerStatsBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CustomerStats build() => _build();

  _$CustomerStats _build() {
    final _$result = _$v ??
        _$CustomerStats._(
          rentalsCount: BuiltValueNullFieldError.checkNotNull(
              rentalsCount, r'CustomerStats', 'rentalsCount'),
          totalSpentCents: BuiltValueNullFieldError.checkNotNull(
              totalSpentCents, r'CustomerStats', 'totalSpentCents'),
          openDisputes: BuiltValueNullFieldError.checkNotNull(
              openDisputes, r'CustomerStats', 'openDisputes'),
          lastRentalAt: lastRentalAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
