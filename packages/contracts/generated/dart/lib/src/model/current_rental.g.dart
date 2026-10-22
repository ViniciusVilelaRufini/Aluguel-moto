// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'current_rental.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CurrentRental extends CurrentRental {
  @override
  final Rental? rental;
  @override
  final StationSwap? currentStationSwap;

  factory _$CurrentRental([void Function(CurrentRentalBuilder)? updates]) =>
      (CurrentRentalBuilder()..update(updates))._build();

  _$CurrentRental._({this.rental, this.currentStationSwap}) : super._();
  @override
  CurrentRental rebuild(void Function(CurrentRentalBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CurrentRentalBuilder toBuilder() => CurrentRentalBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CurrentRental &&
        rental == other.rental &&
        currentStationSwap == other.currentStationSwap;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, rental.hashCode);
    _$hash = $jc(_$hash, currentStationSwap.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CurrentRental')
          ..add('rental', rental)
          ..add('currentStationSwap', currentStationSwap))
        .toString();
  }
}

class CurrentRentalBuilder
    implements Builder<CurrentRental, CurrentRentalBuilder> {
  _$CurrentRental? _$v;

  RentalBuilder? _rental;
  RentalBuilder get rental => _$this._rental ??= RentalBuilder();
  set rental(RentalBuilder? rental) => _$this._rental = rental;

  StationSwapBuilder? _currentStationSwap;
  StationSwapBuilder get currentStationSwap =>
      _$this._currentStationSwap ??= StationSwapBuilder();
  set currentStationSwap(StationSwapBuilder? currentStationSwap) =>
      _$this._currentStationSwap = currentStationSwap;

  CurrentRentalBuilder() {
    CurrentRental._defaults(this);
  }

  CurrentRentalBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _rental = $v.rental?.toBuilder();
      _currentStationSwap = $v.currentStationSwap?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CurrentRental other) {
    _$v = other as _$CurrentRental;
  }

  @override
  void update(void Function(CurrentRentalBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CurrentRental build() => _build();

  _$CurrentRental _build() {
    _$CurrentRental _$result;
    try {
      _$result = _$v ??
          _$CurrentRental._(
            rental: _rental?.build(),
            currentStationSwap: _currentStationSwap?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'rental';
        _rental?.build();
        _$failedField = 'currentStationSwap';
        _currentStationSwap?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'CurrentRental', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
