// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'fee_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$FeeList extends FeeList {
  @override
  final BuiltList<Fee> items;

  factory _$FeeList([void Function(FeeListBuilder)? updates]) =>
      (FeeListBuilder()..update(updates))._build();

  _$FeeList._({required this.items}) : super._();
  @override
  FeeList rebuild(void Function(FeeListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  FeeListBuilder toBuilder() => FeeListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is FeeList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'FeeList')..add('items', items))
        .toString();
  }
}

class FeeListBuilder implements Builder<FeeList, FeeListBuilder> {
  _$FeeList? _$v;

  ListBuilder<Fee>? _items;
  ListBuilder<Fee> get items => _$this._items ??= ListBuilder<Fee>();
  set items(ListBuilder<Fee>? items) => _$this._items = items;

  FeeListBuilder() {
    FeeList._defaults(this);
  }

  FeeListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(FeeList other) {
    _$v = other as _$FeeList;
  }

  @override
  void update(void Function(FeeListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  FeeList build() => _build();

  _$FeeList _build() {
    _$FeeList _$result;
    try {
      _$result = _$v ??
          _$FeeList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'FeeList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
