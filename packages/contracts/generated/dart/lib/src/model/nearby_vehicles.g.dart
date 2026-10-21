// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'nearby_vehicles.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$NearbyVehicles extends NearbyVehicles {
  @override
  final BuiltList<VehicleSummary> items;

  factory _$NearbyVehicles([void Function(NearbyVehiclesBuilder)? updates]) =>
      (NearbyVehiclesBuilder()..update(updates))._build();

  _$NearbyVehicles._({required this.items}) : super._();
  @override
  NearbyVehicles rebuild(void Function(NearbyVehiclesBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  NearbyVehiclesBuilder toBuilder() => NearbyVehiclesBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is NearbyVehicles && items == other.items;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'NearbyVehicles')..add('items', items))
        .toString();
  }
}

class NearbyVehiclesBuilder
    implements Builder<NearbyVehicles, NearbyVehiclesBuilder> {
  _$NearbyVehicles? _$v;

  ListBuilder<VehicleSummary>? _items;
  ListBuilder<VehicleSummary> get items =>
      _$this._items ??= ListBuilder<VehicleSummary>();
  set items(ListBuilder<VehicleSummary>? items) => _$this._items = items;

  NearbyVehiclesBuilder() {
    NearbyVehicles._defaults(this);
  }

  NearbyVehiclesBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(NearbyVehicles other) {
    _$v = other as _$NearbyVehicles;
  }

  @override
  void update(void Function(NearbyVehiclesBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  NearbyVehicles build() => _build();

  _$NearbyVehicles _build() {
    _$NearbyVehicles _$result;
    try {
      _$result = _$v ??
          _$NearbyVehicles._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'NearbyVehicles', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
