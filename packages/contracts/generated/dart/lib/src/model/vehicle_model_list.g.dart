// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_model_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleModelList extends VehicleModelList {
  @override
  final BuiltList<VehicleModel> items;

  factory _$VehicleModelList(
          [void Function(VehicleModelListBuilder)? updates]) =>
      (VehicleModelListBuilder()..update(updates))._build();

  _$VehicleModelList._({required this.items}) : super._();
  @override
  VehicleModelList rebuild(void Function(VehicleModelListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleModelListBuilder toBuilder() =>
      VehicleModelListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleModelList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'VehicleModelList')
          ..add('items', items))
        .toString();
  }
}

class VehicleModelListBuilder
    implements Builder<VehicleModelList, VehicleModelListBuilder> {
  _$VehicleModelList? _$v;

  ListBuilder<VehicleModel>? _items;
  ListBuilder<VehicleModel> get items =>
      _$this._items ??= ListBuilder<VehicleModel>();
  set items(ListBuilder<VehicleModel>? items) => _$this._items = items;

  VehicleModelListBuilder() {
    VehicleModelList._defaults(this);
  }

  VehicleModelListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleModelList other) {
    _$v = other as _$VehicleModelList;
  }

  @override
  void update(void Function(VehicleModelListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleModelList build() => _build();

  _$VehicleModelList _build() {
    _$VehicleModelList _$result;
    try {
      _$result = _$v ??
          _$VehicleModelList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'VehicleModelList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
