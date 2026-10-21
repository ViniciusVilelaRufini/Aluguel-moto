// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'insurance_coverage_option_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$InsuranceCoverageOptionList extends InsuranceCoverageOptionList {
  @override
  final BuiltList<InsuranceCoverageOption> items;

  factory _$InsuranceCoverageOptionList(
          [void Function(InsuranceCoverageOptionListBuilder)? updates]) =>
      (InsuranceCoverageOptionListBuilder()..update(updates))._build();

  _$InsuranceCoverageOptionList._({required this.items}) : super._();
  @override
  InsuranceCoverageOptionList rebuild(
          void Function(InsuranceCoverageOptionListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  InsuranceCoverageOptionListBuilder toBuilder() =>
      InsuranceCoverageOptionListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is InsuranceCoverageOptionList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'InsuranceCoverageOptionList')
          ..add('items', items))
        .toString();
  }
}

class InsuranceCoverageOptionListBuilder
    implements
        Builder<InsuranceCoverageOptionList,
            InsuranceCoverageOptionListBuilder> {
  _$InsuranceCoverageOptionList? _$v;

  ListBuilder<InsuranceCoverageOption>? _items;
  ListBuilder<InsuranceCoverageOption> get items =>
      _$this._items ??= ListBuilder<InsuranceCoverageOption>();
  set items(ListBuilder<InsuranceCoverageOption>? items) =>
      _$this._items = items;

  InsuranceCoverageOptionListBuilder() {
    InsuranceCoverageOptionList._defaults(this);
  }

  InsuranceCoverageOptionListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(InsuranceCoverageOptionList other) {
    _$v = other as _$InsuranceCoverageOptionList;
  }

  @override
  void update(void Function(InsuranceCoverageOptionListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  InsuranceCoverageOptionList build() => _build();

  _$InsuranceCoverageOptionList _build() {
    _$InsuranceCoverageOptionList _$result;
    try {
      _$result = _$v ??
          _$InsuranceCoverageOptionList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'InsuranceCoverageOptionList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
