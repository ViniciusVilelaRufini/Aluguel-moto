// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sim_card_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SimCardList extends SimCardList {
  @override
  final BuiltList<SimCard> items;

  factory _$SimCardList([void Function(SimCardListBuilder)? updates]) =>
      (SimCardListBuilder()..update(updates))._build();

  _$SimCardList._({required this.items}) : super._();
  @override
  SimCardList rebuild(void Function(SimCardListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SimCardListBuilder toBuilder() => SimCardListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SimCardList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'SimCardList')..add('items', items))
        .toString();
  }
}

class SimCardListBuilder implements Builder<SimCardList, SimCardListBuilder> {
  _$SimCardList? _$v;

  ListBuilder<SimCard>? _items;
  ListBuilder<SimCard> get items => _$this._items ??= ListBuilder<SimCard>();
  set items(ListBuilder<SimCard>? items) => _$this._items = items;

  SimCardListBuilder() {
    SimCardList._defaults(this);
  }

  SimCardListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SimCardList other) {
    _$v = other as _$SimCardList;
  }

  @override
  void update(void Function(SimCardListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SimCardList build() => _build();

  _$SimCardList _build() {
    _$SimCardList _$result;
    try {
      _$result = _$v ??
          _$SimCardList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'SimCardList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
