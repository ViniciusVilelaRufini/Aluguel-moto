// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'current_reservation.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CurrentReservation extends CurrentReservation {
  @override
  final Reservation? reservation;

  factory _$CurrentReservation(
          [void Function(CurrentReservationBuilder)? updates]) =>
      (CurrentReservationBuilder()..update(updates))._build();

  _$CurrentReservation._({this.reservation}) : super._();
  @override
  CurrentReservation rebuild(
          void Function(CurrentReservationBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CurrentReservationBuilder toBuilder() =>
      CurrentReservationBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CurrentReservation && reservation == other.reservation;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reservation.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CurrentReservation')
          ..add('reservation', reservation))
        .toString();
  }
}

class CurrentReservationBuilder
    implements Builder<CurrentReservation, CurrentReservationBuilder> {
  _$CurrentReservation? _$v;

  ReservationBuilder? _reservation;
  ReservationBuilder get reservation =>
      _$this._reservation ??= ReservationBuilder();
  set reservation(ReservationBuilder? reservation) =>
      _$this._reservation = reservation;

  CurrentReservationBuilder() {
    CurrentReservation._defaults(this);
  }

  CurrentReservationBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reservation = $v.reservation?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CurrentReservation other) {
    _$v = other as _$CurrentReservation;
  }

  @override
  void update(void Function(CurrentReservationBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CurrentReservation build() => _build();

  _$CurrentReservation _build() {
    _$CurrentReservation _$result;
    try {
      _$result = _$v ??
          _$CurrentReservation._(
            reservation: _reservation?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'reservation';
        _reservation?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'CurrentReservation', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
