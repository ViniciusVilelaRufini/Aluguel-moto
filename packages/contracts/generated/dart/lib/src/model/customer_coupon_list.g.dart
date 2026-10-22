// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'customer_coupon_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CustomerCouponList extends CustomerCouponList {
  @override
  final BuiltList<CustomerCoupon> items;

  factory _$CustomerCouponList(
          [void Function(CustomerCouponListBuilder)? updates]) =>
      (CustomerCouponListBuilder()..update(updates))._build();

  _$CustomerCouponList._({required this.items}) : super._();
  @override
  CustomerCouponList rebuild(
          void Function(CustomerCouponListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CustomerCouponListBuilder toBuilder() =>
      CustomerCouponListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CustomerCouponList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'CustomerCouponList')
          ..add('items', items))
        .toString();
  }
}

class CustomerCouponListBuilder
    implements Builder<CustomerCouponList, CustomerCouponListBuilder> {
  _$CustomerCouponList? _$v;

  ListBuilder<CustomerCoupon>? _items;
  ListBuilder<CustomerCoupon> get items =>
      _$this._items ??= ListBuilder<CustomerCoupon>();
  set items(ListBuilder<CustomerCoupon>? items) => _$this._items = items;

  CustomerCouponListBuilder() {
    CustomerCouponList._defaults(this);
  }

  CustomerCouponListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CustomerCouponList other) {
    _$v = other as _$CustomerCouponList;
  }

  @override
  void update(void Function(CustomerCouponListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CustomerCouponList build() => _build();

  _$CustomerCouponList _build() {
    _$CustomerCouponList _$result;
    try {
      _$result = _$v ??
          _$CustomerCouponList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'CustomerCouponList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
