// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'depot_pickup_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DepotPickupList extends DepotPickupList {
  @override
  final Date date;
  @override
  final BuiltList<Reservation> items;

  factory _$DepotPickupList([void Function(DepotPickupListBuilder)? updates]) =>
      (DepotPickupListBuilder()..update(updates))._build();

  _$DepotPickupList._({required this.date, required this.items}) : super._();
  @override
  DepotPickupList rebuild(void Function(DepotPickupListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DepotPickupListBuilder toBuilder() => DepotPickupListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DepotPickupList &&
        date == other.date &&
        items == other.items;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, date.hashCode);
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DepotPickupList')
          ..add('date', date)
          ..add('items', items))
        .toString();
  }
}

class DepotPickupListBuilder
    implements Builder<DepotPickupList, DepotPickupListBuilder> {
  _$DepotPickupList? _$v;

  Date? _date;
  Date? get date => _$this._date;
  set date(Date? date) => _$this._date = date;

  ListBuilder<Reservation>? _items;
  ListBuilder<Reservation> get items =>
      _$this._items ??= ListBuilder<Reservation>();
  set items(ListBuilder<Reservation>? items) => _$this._items = items;

  DepotPickupListBuilder() {
    DepotPickupList._defaults(this);
  }

  DepotPickupListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _date = $v.date;
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DepotPickupList other) {
    _$v = other as _$DepotPickupList;
  }

  @override
  void update(void Function(DepotPickupListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DepotPickupList build() => _build();

  _$DepotPickupList _build() {
    _$DepotPickupList _$result;
    try {
      _$result = _$v ??
          _$DepotPickupList._(
            date: BuiltValueNullFieldError.checkNotNull(
                date, r'DepotPickupList', 'date'),
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'DepotPickupList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
