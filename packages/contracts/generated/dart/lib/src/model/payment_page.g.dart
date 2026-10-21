// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PaymentPage extends PaymentPage {
  @override
  final BuiltList<Payment> items;
  @override
  final String? nextCursor;

  factory _$PaymentPage([void Function(PaymentPageBuilder)? updates]) =>
      (PaymentPageBuilder()..update(updates))._build();

  _$PaymentPage._({required this.items, this.nextCursor}) : super._();
  @override
  PaymentPage rebuild(void Function(PaymentPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PaymentPageBuilder toBuilder() => PaymentPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PaymentPage &&
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
    return (newBuiltValueToStringHelper(r'PaymentPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class PaymentPageBuilder implements Builder<PaymentPage, PaymentPageBuilder> {
  _$PaymentPage? _$v;

  ListBuilder<Payment>? _items;
  ListBuilder<Payment> get items => _$this._items ??= ListBuilder<Payment>();
  set items(ListBuilder<Payment>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  PaymentPageBuilder() {
    PaymentPage._defaults(this);
  }

  PaymentPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PaymentPage other) {
    _$v = other as _$PaymentPage;
  }

  @override
  void update(void Function(PaymentPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PaymentPage build() => _build();

  _$PaymentPage _build() {
    _$PaymentPage _$result;
    try {
      _$result = _$v ??
          _$PaymentPage._(
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
            r'PaymentPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
