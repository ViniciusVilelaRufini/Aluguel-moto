// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'coverage_item.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CoverageItem extends CoverageItem {
  @override
  final String code;
  @override
  final String description;
  @override
  final int? limitCents;

  factory _$CoverageItem([void Function(CoverageItemBuilder)? updates]) =>
      (CoverageItemBuilder()..update(updates))._build();

  _$CoverageItem._(
      {required this.code, required this.description, this.limitCents})
      : super._();
  @override
  CoverageItem rebuild(void Function(CoverageItemBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CoverageItemBuilder toBuilder() => CoverageItemBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CoverageItem &&
        code == other.code &&
        description == other.description &&
        limitCents == other.limitCents;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, limitCents.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CoverageItem')
          ..add('code', code)
          ..add('description', description)
          ..add('limitCents', limitCents))
        .toString();
  }
}

class CoverageItemBuilder
    implements Builder<CoverageItem, CoverageItemBuilder> {
  _$CoverageItem? _$v;

  String? _code;
  String? get code => _$this._code;
  set code(String? code) => _$this._code = code;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  int? _limitCents;
  int? get limitCents => _$this._limitCents;
  set limitCents(int? limitCents) => _$this._limitCents = limitCents;

  CoverageItemBuilder() {
    CoverageItem._defaults(this);
  }

  CoverageItemBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _code = $v.code;
      _description = $v.description;
      _limitCents = $v.limitCents;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CoverageItem other) {
    _$v = other as _$CoverageItem;
  }

  @override
  void update(void Function(CoverageItemBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CoverageItem build() => _build();

  _$CoverageItem _build() {
    final _$result = _$v ??
        _$CoverageItem._(
          code: BuiltValueNullFieldError.checkNotNull(
              code, r'CoverageItem', 'code'),
          description: BuiltValueNullFieldError.checkNotNull(
              description, r'CoverageItem', 'description'),
          limitCents: limitCents,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
