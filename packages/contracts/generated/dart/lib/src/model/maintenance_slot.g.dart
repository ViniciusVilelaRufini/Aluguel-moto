// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_slot.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$MaintenanceSlot extends MaintenanceSlot {
  @override
  final DateTime startsAt;
  @override
  final DateTime endsAt;
  @override
  final bool available;

  factory _$MaintenanceSlot([void Function(MaintenanceSlotBuilder)? updates]) =>
      (MaintenanceSlotBuilder()..update(updates))._build();

  _$MaintenanceSlot._(
      {required this.startsAt, required this.endsAt, required this.available})
      : super._();
  @override
  MaintenanceSlot rebuild(void Function(MaintenanceSlotBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  MaintenanceSlotBuilder toBuilder() => MaintenanceSlotBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is MaintenanceSlot &&
        startsAt == other.startsAt &&
        endsAt == other.endsAt &&
        available == other.available;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, startsAt.hashCode);
    _$hash = $jc(_$hash, endsAt.hashCode);
    _$hash = $jc(_$hash, available.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'MaintenanceSlot')
          ..add('startsAt', startsAt)
          ..add('endsAt', endsAt)
          ..add('available', available))
        .toString();
  }
}

class MaintenanceSlotBuilder
    implements Builder<MaintenanceSlot, MaintenanceSlotBuilder> {
  _$MaintenanceSlot? _$v;

  DateTime? _startsAt;
  DateTime? get startsAt => _$this._startsAt;
  set startsAt(DateTime? startsAt) => _$this._startsAt = startsAt;

  DateTime? _endsAt;
  DateTime? get endsAt => _$this._endsAt;
  set endsAt(DateTime? endsAt) => _$this._endsAt = endsAt;

  bool? _available;
  bool? get available => _$this._available;
  set available(bool? available) => _$this._available = available;

  MaintenanceSlotBuilder() {
    MaintenanceSlot._defaults(this);
  }

  MaintenanceSlotBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _startsAt = $v.startsAt;
      _endsAt = $v.endsAt;
      _available = $v.available;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(MaintenanceSlot other) {
    _$v = other as _$MaintenanceSlot;
  }

  @override
  void update(void Function(MaintenanceSlotBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  MaintenanceSlot build() => _build();

  _$MaintenanceSlot _build() {
    final _$result = _$v ??
        _$MaintenanceSlot._(
          startsAt: BuiltValueNullFieldError.checkNotNull(
              startsAt, r'MaintenanceSlot', 'startsAt'),
          endsAt: BuiltValueNullFieldError.checkNotNull(
              endsAt, r'MaintenanceSlot', 'endsAt'),
          available: BuiltValueNullFieldError.checkNotNull(
              available, r'MaintenanceSlot', 'available'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
