// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'insurance_policy_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$InsurancePolicyPage extends InsurancePolicyPage {
  @override
  final BuiltList<InsurancePolicy> items;
  @override
  final String? nextCursor;

  factory _$InsurancePolicyPage(
          [void Function(InsurancePolicyPageBuilder)? updates]) =>
      (InsurancePolicyPageBuilder()..update(updates))._build();

  _$InsurancePolicyPage._({required this.items, this.nextCursor}) : super._();
  @override
  InsurancePolicyPage rebuild(
          void Function(InsurancePolicyPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  InsurancePolicyPageBuilder toBuilder() =>
      InsurancePolicyPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is InsurancePolicyPage &&
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
    return (newBuiltValueToStringHelper(r'InsurancePolicyPage')
          ..add('items', items)
          ..add('nextCursor', nextCursor))
        .toString();
  }
}

class InsurancePolicyPageBuilder
    implements Builder<InsurancePolicyPage, InsurancePolicyPageBuilder> {
  _$InsurancePolicyPage? _$v;

  ListBuilder<InsurancePolicy>? _items;
  ListBuilder<InsurancePolicy> get items =>
      _$this._items ??= ListBuilder<InsurancePolicy>();
  set items(ListBuilder<InsurancePolicy>? items) => _$this._items = items;

  String? _nextCursor;
  String? get nextCursor => _$this._nextCursor;
  set nextCursor(String? nextCursor) => _$this._nextCursor = nextCursor;

  InsurancePolicyPageBuilder() {
    InsurancePolicyPage._defaults(this);
  }

  InsurancePolicyPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _nextCursor = $v.nextCursor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(InsurancePolicyPage other) {
    _$v = other as _$InsurancePolicyPage;
  }

  @override
  void update(void Function(InsurancePolicyPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  InsurancePolicyPage build() => _build();

  _$InsurancePolicyPage _build() {
    _$InsurancePolicyPage _$result;
    try {
      _$result = _$v ??
          _$InsurancePolicyPage._(
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
            r'InsurancePolicyPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
