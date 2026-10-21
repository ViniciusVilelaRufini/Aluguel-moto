// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'customer_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CustomerPage extends CustomerPage {
  @override
  final BuiltList<Customer> items;
  @override
  final String? nextCursor;

  factory _$CustomerPage([void Function(CustomerPageBuilder)? updates]) =>
      (CustomerPageBuilder()..update(updates))._build();

  _$CustomerPage._({required this.items, this.nextCursor}) : super._();
  @override
  CustomerPage rebuild(void Function(CustomerPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CustomerPageBuilder toBuilder() => CustomerPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CustomerPage &&
        items == other.items &&
        nextCursor == other.nextCursor;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jc(_$hash, nextCursor.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CustomerPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class CustomerPageBuilder
    implements Builder<CustomerPage, CustomerPageBuilder> {
  _$CustomerPage? _$v;

  ListBuilder<Customer>? _items;
  ListBuilder<Customer> get items => _$this._items ??= ListBuilder<Customer>();
  set items(ListBuilder<Customer>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  CustomerPageBuilder() {
    CustomerPage._defaults(this);
  }

  CustomerPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CustomerPage other) {
    _$v = other as _$CustomerPage;
  }

  @override
  void update(void Function(CustomerPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CustomerPage build() => _build();

  _$CustomerPage _build() {
    _$CustomerPage _$result;
    try {
      _$result = _$v ??
          _$CustomerPage._(
            items: items.build(),
            nextCursor: nextCursor,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'CustomerPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
