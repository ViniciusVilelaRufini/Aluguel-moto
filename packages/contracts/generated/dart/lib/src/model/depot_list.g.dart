// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'depot_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DepotList extends DepotList {
  @override
  final BuiltList<Depot> items;

  factory _$DepotList([void Function(DepotListBuilder)? updates]) =>
      (DepotListBuilder()..update(updates))._build();

  _$DepotList._({required this.items}) : super._();
  @override
  DepotList rebuild(void Function(DepotListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DepotListBuilder toBuilder() => DepotListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DepotList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'DepotList')..add('items', items))
        .toString();
  }
}

class DepotListBuilder implements Builder<DepotList, DepotListBuilder> {
  _$DepotList? _$v;

  ListBuilder<Depot>? _items;
  ListBuilder<Depot> get items => _$this._items ??= ListBuilder<Depot>();
  set items(ListBuilder<Depot>? items) => _$this._items = items;

  DepotListBuilder() {
    DepotList._defaults(this);
  }

  DepotListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DepotList other) {
    _$v = other as _$DepotList;
  }

  @override
  void update(void Function(DepotListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DepotList build() => _build();

  _$DepotList _build() {
    _$DepotList _$result;
    try {
      _$result = _$v ??
          _$DepotList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'DepotList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
