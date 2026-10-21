// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rental_event_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$RentalEventList extends RentalEventList {
  @override
  final BuiltList<RentalEvent> items;

  factory _$RentalEventList([void Function(RentalEventListBuilder)? updates]) =>
      (RentalEventListBuilder()..update(updates))._build();

  _$RentalEventList._({required this.items}) : super._();
  @override
  RentalEventList rebuild(void Function(RentalEventListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RentalEventListBuilder toBuilder() => RentalEventListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is RentalEventList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'RentalEventList')
          ..add('items', items))
        .toString();
  }
}

class RentalEventListBuilder
    implements Builder<RentalEventList, RentalEventListBuilder> {
  _$RentalEventList? _$v;

  ListBuilder<RentalEvent>? _items;
  ListBuilder<RentalEvent> get items =>
      _$this._items ??= ListBuilder<RentalEvent>();
  set items(ListBuilder<RentalEvent>? items) => _$this._items = items;

  RentalEventListBuilder() {
    RentalEventList._defaults(this);
  }

  RentalEventListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(RentalEventList other) {
    _$v = other as _$RentalEventList;
  }

  @override
  void update(void Function(RentalEventListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  RentalEventList build() => _build();

  _$RentalEventList _build() {
    _$RentalEventList _$result;
    try {
      _$result = _$v ??
          _$RentalEventList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'RentalEventList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
