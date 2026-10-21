// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'insurance_coverage_option.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$InsuranceCoverageOption extends InsuranceCoverageOption {
  @override
  final InsuranceCoverage coverage;
  @override
  final String name;
  @override
  final String description;
  @override
  final int premiumCents;
  @override
  final bool mandatory;
  @override
  final BuiltList<CoverageItem> items;
  @override
  final bool active;

  factory _$InsuranceCoverageOption(
          [void Function(InsuranceCoverageOptionBuilder)? updates]) =>
      (InsuranceCoverageOptionBuilder()..update(updates))._build();

  _$InsuranceCoverageOption._(
      {required this.coverage,
      required this.name,
      required this.description,
      required this.premiumCents,
      required this.mandatory,
      required this.items,
      required this.active})
      : super._();
  @override
  InsuranceCoverageOption rebuild(
          void Function(InsuranceCoverageOptionBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  InsuranceCoverageOptionBuilder toBuilder() =>
      InsuranceCoverageOptionBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is InsuranceCoverageOption &&
        coverage == other.coverage &&
        name == other.name &&
        description == other.description &&
        premiumCents == other.premiumCents &&
        mandatory == other.mandatory &&
        items == other.items &&
        active == other.active;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, coverage.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, premiumCents.hashCode);
    _$hash = $jc(_$hash, mandatory.hashCode);
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'InsuranceCoverageOption')
          ..add('coverage', coverage)
          ..add('name', name)
          ..add('description', description)
          ..add('premiumCents', premiumCents)
          ..add('mandatory', mandatory)
          ..add('items', items)
          ..add('active', active))
        .toString();
  }
}

class InsuranceCoverageOptionBuilder
    implements
        Builder<InsuranceCoverageOption, InsuranceCoverageOptionBuilder> {
  _$InsuranceCoverageOption? _$v;

  InsuranceCoverage? _coverage;
  InsuranceCoverage? get coverage => _$this._coverage;
  set coverage(InsuranceCoverage? coverage) => _$this._coverage = coverage;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  int? _premiumCents;
  int? get premiumCents => _$this._premiumCents;
  set premiumCents(int? premiumCents) => _$this._premiumCents = premiumCents;

  bool? _mandatory;
  bool? get mandatory => _$this._mandatory;
  set mandatory(bool? mandatory) => _$this._mandatory = mandatory;

  ListBuilder<CoverageItem>? _items;
  ListBuilder<CoverageItem> get items =>
      _$this._items ??= ListBuilder<CoverageItem>();
  set items(ListBuilder<CoverageItem>? items) => _$this._items = items;

  bool? _active;
  bool? get active => _$this._active;
  set active(bool? active) => _$this._active = active;

  InsuranceCoverageOptionBuilder() {
    InsuranceCoverageOption._defaults(this);
  }

  InsuranceCoverageOptionBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _coverage = $v.coverage;
      _name = $v.name;
      _description = $v.description;
      _premiumCents = $v.premiumCents;
      _mandatory = $v.mandatory;
      _items = $v.items.toBuilder();
      _active = $v.active;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(InsuranceCoverageOption other) {
    _$v = other as _$InsuranceCoverageOption;
  }

  @override
  void update(void Function(InsuranceCoverageOptionBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  InsuranceCoverageOption build() => _build();

  _$InsuranceCoverageOption _build() {
    _$InsuranceCoverageOption _$result;
    try {
      _$result = _$v ??
          _$InsuranceCoverageOption._(
            coverage: BuiltValueNullFieldError.checkNotNull(
                coverage, r'InsuranceCoverageOption', 'coverage'),
            name: BuiltValueNullFieldError.checkNotNull(
                name, r'InsuranceCoverageOption', 'name'),
            description: BuiltValueNullFieldError.checkNotNull(
                description, r'InsuranceCoverageOption', 'description'),
            premiumCents: BuiltValueNullFieldError.checkNotNull(
                premiumCents, r'InsuranceCoverageOption', 'premiumCents'),
            mandatory: BuiltValueNullFieldError.checkNotNull(
                mandatory, r'InsuranceCoverageOption', 'mandatory'),
            items: items.build(),
            active: BuiltValueNullFieldError.checkNotNull(
                active, r'InsuranceCoverageOption', 'active'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'InsuranceCoverageOption', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
