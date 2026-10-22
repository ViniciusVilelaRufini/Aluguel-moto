// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_status_counts.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleStatusCounts extends VehicleStatusCounts {
  @override
  final int free;
  @override
  final int rented;
  @override
  final int reserved;
  @override
  final int paused;
  @override
  final int blocked;
  @override
  final int maintenance;
  @override
  final int offline;
  @override
  final int awaitingPickup;

  factory _$VehicleStatusCounts(
          [void Function(VehicleStatusCountsBuilder)? updates]) =>
      (VehicleStatusCountsBuilder()..update(updates))._build();

  _$VehicleStatusCounts._(
      {required this.free,
      required this.rented,
      required this.reserved,
      required this.paused,
      required this.blocked,
      required this.maintenance,
      required this.offline,
      required this.awaitingPickup})
      : super._();
  @override
  VehicleStatusCounts rebuild(
          void Function(VehicleStatusCountsBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleStatusCountsBuilder toBuilder() =>
      VehicleStatusCountsBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleStatusCounts &&
        free == other.free &&
        rented == other.rented &&
        reserved == other.reserved &&
        paused == other.paused &&
        blocked == other.blocked &&
        maintenance == other.maintenance &&
        offline == other.offline &&
        awaitingPickup == other.awaitingPickup;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, free.hashCode);
    _$hash = $jc(_$hash, rented.hashCode);
    _$hash = $jc(_$hash, reserved.hashCode);
    _$hash = $jc(_$hash, paused.hashCode);
    _$hash = $jc(_$hash, blocked.hashCode);
    _$hash = $jc(_$hash, maintenance.hashCode);
    _$hash = $jc(_$hash, offline.hashCode);
    _$hash = $jc(_$hash, awaitingPickup.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehicleStatusCounts')
          ..add('free', free)
          ..add('rented', rented)
          ..add('reserved', reserved)
          ..add('paused', paused)
          ..add('blocked', blocked)
          ..add('maintenance', maintenance)
          ..add('offline', offline)
          ..add('awaitingPickup', awaitingPickup))
        .toString();
  }
}

class VehicleStatusCountsBuilder
    implements Builder<VehicleStatusCounts, VehicleStatusCountsBuilder> {
  _$VehicleStatusCounts? _$v;

  int? _free;
  int? get free => _$this._free;
  set free(int? free) => _$this._free = free;

  int? _rented;
  int? get rented => _$this._rented;
  set rented(int? rented) => _$this._rented = rented;

  int? _reserved;
  int? get reserved => _$this._reserved;
  set reserved(int? reserved) => _$this._reserved = reserved;

  int? _paused;
  int? get paused => _$this._paused;
  set paused(int? paused) => _$this._paused = paused;

  int? _blocked;
  int? get blocked => _$this._blocked;
  set blocked(int? blocked) => _$this._blocked = blocked;

  int? _maintenance;
  int? get maintenance => _$this._maintenance;
  set maintenance(int? maintenance) => _$this._maintenance = maintenance;

  int? _offline;
  int? get offline => _$this._offline;
  set offline(int? offline) => _$this._offline = offline;

  int? _awaitingPickup;
  int? get awaitingPickup => _$this._awaitingPickup;
  set awaitingPickup(int? awaitingPickup) =>
      _$this._awaitingPickup = awaitingPickup;

  VehicleStatusCountsBuilder() {
    VehicleStatusCounts._defaults(this);
  }

  VehicleStatusCountsBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _free = $v.free;
      _rented = $v.rented;
      _reserved = $v.reserved;
      _paused = $v.paused;
      _blocked = $v.blocked;
      _maintenance = $v.maintenance;
      _offline = $v.offline;
      _awaitingPickup = $v.awaitingPickup;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleStatusCounts other) {
    _$v = other as _$VehicleStatusCounts;
  }

  @override
  void update(void Function(VehicleStatusCountsBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleStatusCounts build() => _build();

  _$VehicleStatusCounts _build() {
    final _$result = _$v ??
        _$VehicleStatusCounts._(
          free: BuiltValueNullFieldError.checkNotNull(
              free, r'VehicleStatusCounts', 'free'),
          rented: BuiltValueNullFieldError.checkNotNull(
              rented, r'VehicleStatusCounts', 'rented'),
          reserved: BuiltValueNullFieldError.checkNotNull(
              reserved, r'VehicleStatusCounts', 'reserved'),
          paused: BuiltValueNullFieldError.checkNotNull(
              paused, r'VehicleStatusCounts', 'paused'),
          blocked: BuiltValueNullFieldError.checkNotNull(
              blocked, r'VehicleStatusCounts', 'blocked'),
          maintenance: BuiltValueNullFieldError.checkNotNull(
              maintenance, r'VehicleStatusCounts', 'maintenance'),
          offline: BuiltValueNullFieldError.checkNotNull(
              offline, r'VehicleStatusCounts', 'offline'),
          awaitingPickup: BuiltValueNullFieldError.checkNotNull(
              awaitingPickup, r'VehicleStatusCounts', 'awaitingPickup'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
