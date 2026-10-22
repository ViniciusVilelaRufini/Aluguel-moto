// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'depot_vehicle_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DepotVehicleList extends DepotVehicleList {
  @override
  final BuiltList<Vehicle> items;

  factory _$DepotVehicleList(
          [void Function(DepotVehicleListBuilder)? updates]) =>
      (DepotVehicleListBuilder()..update(updates))._build();

  _$DepotVehicleList._({required this.items}) : super._();
  @override
  DepotVehicleList rebuild(void Function(DepotVehicleListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DepotVehicleListBuilder toBuilder() =>
      DepotVehicleListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DepotVehicleList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'DepotVehicleList')
          ..add('items', items))
        .toString();
  }
}

class DepotVehicleListBuilder
    implements Builder<DepotVehicleList, DepotVehicleListBuilder> {
  _$DepotVehicleList? _$v;

  ListBuilder<Vehicle>? _items;
  ListBuilder<Vehicle> get items => _$this._items ??= ListBuilder<Vehicle>();
  set items(ListBuilder<Vehicle>? items) => _$this._items = items;

  DepotVehicleListBuilder() {
    DepotVehicleList._defaults(this);
  }

  DepotVehicleListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DepotVehicleList other) {
    _$v = other as _$DepotVehicleList;
  }

  @override
  void update(void Function(DepotVehicleListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DepotVehicleList build() => _build();

  _$DepotVehicleList _build() {
    _$DepotVehicleList _$result;
    try {
      _$result = _$v ??
          _$DepotVehicleList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'DepotVehicleList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
