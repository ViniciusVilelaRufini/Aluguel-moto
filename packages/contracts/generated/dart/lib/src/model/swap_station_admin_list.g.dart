// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'swap_station_admin_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SwapStationAdminList extends SwapStationAdminList {
  @override
  final BuiltList<SwapStationAdmin> items;

  factory _$SwapStationAdminList(
          [void Function(SwapStationAdminListBuilder)? updates]) =>
      (SwapStationAdminListBuilder()..update(updates))._build();

  _$SwapStationAdminList._({required this.items}) : super._();
  @override
  SwapStationAdminList rebuild(
          void Function(SwapStationAdminListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SwapStationAdminListBuilder toBuilder() =>
      SwapStationAdminListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SwapStationAdminList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'SwapStationAdminList')
          ..add('items', items))
        .toString();
  }
}

class SwapStationAdminListBuilder
    implements Builder<SwapStationAdminList, SwapStationAdminListBuilder> {
  _$SwapStationAdminList? _$v;

  ListBuilder<SwapStationAdmin>? _items;
  ListBuilder<SwapStationAdmin> get items =>
      _$this._items ??= ListBuilder<SwapStationAdmin>();
  set items(ListBuilder<SwapStationAdmin>? items) => _$this._items = items;

  SwapStationAdminListBuilder() {
    SwapStationAdminList._defaults(this);
  }

  SwapStationAdminListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SwapStationAdminList other) {
    _$v = other as _$SwapStationAdminList;
  }

  @override
  void update(void Function(SwapStationAdminListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SwapStationAdminList build() => _build();

  _$SwapStationAdminList _build() {
    _$SwapStationAdminList _$result;
    try {
      _$result = _$v ??
          _$SwapStationAdminList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'SwapStationAdminList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
