// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'minute_package_list.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$MinutePackageList extends MinutePackageList {
  @override
  final BuiltList<MinutePackage> items;

  factory _$MinutePackageList(
          [void Function(MinutePackageListBuilder)? updates]) =>
      (MinutePackageListBuilder()..update(updates))._build();

  _$MinutePackageList._({required this.items}) : super._();
  @override
  MinutePackageList rebuild(void Function(MinutePackageListBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  MinutePackageListBuilder toBuilder() =>
      MinutePackageListBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is MinutePackageList && items == other.items;
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
    return (newBuiltValueToStringHelper(r'MinutePackageList')
          ..add('items', items))
        .toString();
  }
}

class MinutePackageListBuilder
    implements Builder<MinutePackageList, MinutePackageListBuilder> {
  _$MinutePackageList? _$v;

  ListBuilder<MinutePackage>? _items;
  ListBuilder<MinutePackage> get items =>
      _$this._items ??= ListBuilder<MinutePackage>();
  set items(ListBuilder<MinutePackage>? items) => _$this._items = items;

  MinutePackageListBuilder() {
    MinutePackageList._defaults(this);
  }

  MinutePackageListBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(MinutePackageList other) {
    _$v = other as _$MinutePackageList;
  }

  @override
  void update(void Function(MinutePackageListBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  MinutePackageList build() => _build();

  _$MinutePackageList _build() {
    _$MinutePackageList _$result;
    try {
      _$result = _$v ??
          _$MinutePackageList._(
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'MinutePackageList', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
