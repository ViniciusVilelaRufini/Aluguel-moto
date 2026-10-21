// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'geo_zone_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$GeoZoneList extends GeoZoneList {
  @override
  final BuiltList<GeoZone> items;

  factory _$GeoZoneList([void Function(GeoZoneListBuilder)? updates]) =>
      (GeoZoneListBuilder()..update(updates))._build();

  _$GeoZoneList._({required this.items}) : super._();
  @override
  GeoZoneList rebuild(void Function(GeoZoneListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  GeoZoneListBuilder toBuilder() => GeoZoneListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is GeoZoneList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'GeoZoneList')..add('items', items))
        .toString();
  }
}

class GeoZoneListBuilder implements Builder<GeoZoneList, GeoZoneListBuilder> {
  _$GeoZoneList? _$v;

  ListBuilder<GeoZone>? _items;
  ListBuilder<GeoZone> get items => _$this._items ??= ListBuilder<GeoZone>();
  set items(ListBuilder<GeoZone>? items) => _$this._items = items;

  GeoZoneListBuilder() {
    GeoZoneList._defaults(this);
  }

  GeoZoneListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(GeoZoneList other) {
    _$v = other as _$GeoZoneList;
  }

  @override
  void update(void Function(GeoZoneListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  GeoZoneList build() => _build();

  _$GeoZoneList _build() {
    _$GeoZoneList _$result;
    try {
      _$result = _$v ??
          _$GeoZoneList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'GeoZoneList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
