// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'swap_station_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SwapStationList extends SwapStationList {
  @override
  final BuiltList<SwapStation> items;

  factory _$SwapStationList([void Function(SwapStationListBuilder)? updates]) =>
      (SwapStationListBuilder()..update(updates))._build();

  _$SwapStationList._({required this.items}) : super._();
  @override
  SwapStationList rebuild(void Function(SwapStationListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SwapStationListBuilder toBuilder() => SwapStationListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SwapStationList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'SwapStationList')
          ..add('items', items))
        .toString();
  }
}

class SwapStationListBuilder
    implements Builder<SwapStationList, SwapStationListBuilder> {
  _$SwapStationList? _$v;

  ListBuilder<SwapStation>? _items;
  ListBuilder<SwapStation> get items =>
      _$this._items ??= ListBuilder<SwapStation>();
  set items(ListBuilder<SwapStation>? items) => _$this._items = items;

  SwapStationListBuilder() {
    SwapStationList._defaults(this);
  }

  SwapStationListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SwapStationList other) {
    _$v = other as _$SwapStationList;
  }

  @override
  void update(void Function(SwapStationListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SwapStationList build() => _build();

  _$SwapStationList _build() {
    _$SwapStationList _$result;
    try {
      _$result = _$v ??
          _$SwapStationList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'SwapStationList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
