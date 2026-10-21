// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'subscription_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SubscriptionList extends SubscriptionList {
  @override
  final BuiltList<Subscription> items;

  factory _$SubscriptionList(
          [void Function(SubscriptionListBuilder)? updates]) =>
      (SubscriptionListBuilder()..update(updates))._build();

  _$SubscriptionList._({required this.items}) : super._();
  @override
  SubscriptionList rebuild(void Function(SubscriptionListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SubscriptionListBuilder toBuilder() =>
      SubscriptionListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SubscriptionList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'SubscriptionList')
          ..add('items', items))
        .toString();
  }
}

class SubscriptionListBuilder
    implements Builder<SubscriptionList, SubscriptionListBuilder> {
  _$SubscriptionList? _$v;

  ListBuilder<Subscription>? _items;
  ListBuilder<Subscription> get items =>
      _$this._items ??= ListBuilder<Subscription>();
  set items(ListBuilder<Subscription>? items) => _$this._items = items;

  SubscriptionListBuilder() {
    SubscriptionList._defaults(this);
  }

  SubscriptionListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SubscriptionList other) {
    _$v = other as _$SubscriptionList;
  }

  @override
  void update(void Function(SubscriptionListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SubscriptionList build() => _build();

  _$SubscriptionList _build() {
    _$SubscriptionList _$result;
    try {
      _$result = _$v ??
          _$SubscriptionList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'SubscriptionList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
