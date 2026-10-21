// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_card_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PaymentCardList extends PaymentCardList {
  @override
  final BuiltList<PaymentCard> items;

  factory _$PaymentCardList([void Function(PaymentCardListBuilder)? updates]) =>
      (PaymentCardListBuilder()..update(updates))._build();

  _$PaymentCardList._({required this.items}) : super._();
  @override
  PaymentCardList rebuild(void Function(PaymentCardListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PaymentCardListBuilder toBuilder() => PaymentCardListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PaymentCardList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'PaymentCardList')
          ..add('items', items))
        .toString();
  }
}

class PaymentCardListBuilder
    implements Builder<PaymentCardList, PaymentCardListBuilder> {
  _$PaymentCardList? _$v;

  ListBuilder<PaymentCard>? _items;
  ListBuilder<PaymentCard> get items =>
      _$this._items ??= ListBuilder<PaymentCard>();
  set items(ListBuilder<PaymentCard>? items) => _$this._items = items;

  PaymentCardListBuilder() {
    PaymentCardList._defaults(this);
  }

  PaymentCardListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PaymentCardList other) {
    _$v = other as _$PaymentCardList;
  }

  @override
  void update(void Function(PaymentCardListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PaymentCardList build() => _build();

  _$PaymentCardList _build() {
    _$PaymentCardList _$result;
    try {
      _$result = _$v ??
          _$PaymentCardList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'PaymentCardList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
