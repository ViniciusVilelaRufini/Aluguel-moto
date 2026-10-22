// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'depot_opening_hours.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DepotOpeningHours extends DepotOpeningHours {
  @override
  final int weekday;
  @override
  final String opensAt;
  @override
  final String closesAt;

  factory _$DepotOpeningHours(
          [void Function(DepotOpeningHoursBuilder)? updates]) =>
      (DepotOpeningHoursBuilder()..update(updates))._build();

  _$DepotOpeningHours._(
      {required this.weekday, required this.opensAt, required this.closesAt})
      : super._();
  @override
  DepotOpeningHours rebuild(void Function(DepotOpeningHoursBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DepotOpeningHoursBuilder toBuilder() =>
      DepotOpeningHoursBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DepotOpeningHours &&
        weekday == other.weekday &&
        opensAt == other.opensAt &&
        closesAt == other.closesAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, weekday.hashCode);
    _$hash = $jc(_$hash, opensAt.hashCode);
    _$hash = $jc(_$hash, closesAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DepotOpeningHours')
          ..add('weekday', weekday)
          ..add('opensAt', opensAt)
          ..add('closesAt', closesAt))
        .toString();
  }
}

class DepotOpeningHoursBuilder
    implements Builder<DepotOpeningHours, DepotOpeningHoursBuilder> {
  _$DepotOpeningHours? _$v;

  int? _weekday;
  int? get weekday => _$this._weekday;
  set weekday(int? weekday) => _$this._weekday = weekday;

  String? _opensAt;
  String? get opensAt => _$this._opensAt;
  set opensAt(String? opensAt) => _$this._opensAt = opensAt;

  String? _closesAt;
  String? get closesAt => _$this._closesAt;
  set closesAt(String? closesAt) => _$this._closesAt = closesAt;

  DepotOpeningHoursBuilder() {
    DepotOpeningHours._defaults(this);
  }

  DepotOpeningHoursBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _weekday = $v.weekday;
      _opensAt = $v.opensAt;
      _closesAt = $v.closesAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DepotOpeningHours other) {
    _$v = other as _$DepotOpeningHours;
  }

  @override
  void update(void Function(DepotOpeningHoursBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DepotOpeningHours build() => _build();

  _$DepotOpeningHours _build() {
    final _$result = _$v ??
        _$DepotOpeningHours._(
          weekday: BuiltValueNullFieldError.checkNotNull(
              weekday, r'DepotOpeningHours', 'weekday'),
          opensAt: BuiltValueNullFieldError.checkNotNull(
              opensAt, r'DepotOpeningHours', 'opensAt'),
          closesAt: BuiltValueNullFieldError.checkNotNull(
              closesAt, r'DepotOpeningHours', 'closesAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
