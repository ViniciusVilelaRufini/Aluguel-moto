// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reservation_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ReservationCreate extends ReservationCreate {
  @override
  final String vehicleId;

  factory _$ReservationCreate(
          [void Function(ReservationCreateBuilder)? updates]) =>
      (ReservationCreateBuilder()..update(updates))._build();

  _$ReservationCreate._({required this.vehicleId}) : super._();
  @override
  ReservationCreate rebuild(void Function(ReservationCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ReservationCreateBuilder toBuilder() =>
      ReservationCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ReservationCreate && vehicleId == other.vehicleId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ReservationCreate')
          ..add('vehicleId', vehicleId))
        .toString();
  }
}

class ReservationCreateBuilder
    implements Builder<ReservationCreate, ReservationCreateBuilder> {
  _$ReservationCreate? _$v;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  ReservationCreateBuilder() {
    ReservationCreate._defaults(this);
  }

  ReservationCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _vehicleId = $v.vehicleId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ReservationCreate other) {
    _$v = other as _$ReservationCreate;
  }

  @override
  void update(void Function(ReservationCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ReservationCreate build() => _build();

  _$ReservationCreate _build() {
    final _$result = _$v ??
        _$ReservationCreate._(
          vehicleId: BuiltValueNullFieldError.checkNotNull(
              vehicleId, r'ReservationCreate', 'vehicleId'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
