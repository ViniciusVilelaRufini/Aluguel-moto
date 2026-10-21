// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'coupon_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CouponPage extends CouponPage {
  @override
  final BuiltList<Coupon> items;
  @override
  final String? nextCursor;

  factory _$CouponPage([void Function(CouponPageBuilder)? updates]) =>
      (CouponPageBuilder()..update(updates))._build();

  _$CouponPage._({required this.items, this.nextCursor}) : super._();
  @override
  CouponPage rebuild(void Function(CouponPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CouponPageBuilder toBuilder() => CouponPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CouponPage &&
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
    return (newBuiltValueToStringHelper(r'CouponPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class CouponPageBuilder implements Builder<CouponPage, CouponPageBuilder> {
  _$CouponPage? _$v;

  ListBuilder<Coupon>? _items;
  ListBuilder<Coupon> get items => _$this._items ??= ListBuilder<Coupon>();
  set items(ListBuilder<Coupon>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  CouponPageBuilder() {
    CouponPage._defaults(this);
  }

  CouponPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CouponPage other) {
    _$v = other as _$CouponPage;
  }

  @override
  void update(void Function(CouponPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CouponPage build() => _build();

  _$CouponPage _build() {
    _$CouponPage _$result;
    try {
      _$result = _$v ??
          _$CouponPage._(
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
            r'CouponPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
