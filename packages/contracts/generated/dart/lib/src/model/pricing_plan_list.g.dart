// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pricing_plan_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PricingPlanList extends PricingPlanList {
  @override
  final BuiltList<PricingPlan> items;

  factory _$PricingPlanList([void Function(PricingPlanListBuilder)? updates]) =>
      (PricingPlanListBuilder()..update(updates))._build();

  _$PricingPlanList._({required this.items}) : super._();
  @override
  PricingPlanList rebuild(void Function(PricingPlanListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PricingPlanListBuilder toBuilder() => PricingPlanListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PricingPlanList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'PricingPlanList')
          ..add('items', items))
        .toString();
  }
}

class PricingPlanListBuilder
    implements Builder<PricingPlanList, PricingPlanListBuilder> {
  _$PricingPlanList? _$v;

  ListBuilder<PricingPlan>? _items;
  ListBuilder<PricingPlan> get items =>
      _$this._items ??= ListBuilder<PricingPlan>();
  set items(ListBuilder<PricingPlan>? items) => _$this._items = items;

  PricingPlanListBuilder() {
    PricingPlanList._defaults(this);
  }

  PricingPlanListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PricingPlanList other) {
    _$v = other as _$PricingPlanList;
  }

  @override
  void update(void Function(PricingPlanListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PricingPlanList build() => _build();

  _$PricingPlanList _build() {
    _$PricingPlanList _$result;
    try {
      _$result = _$v ??
          _$PricingPlanList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'PricingPlanList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
