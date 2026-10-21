// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'insurance_coverage_update.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$InsuranceCoverageUpdate extends InsuranceCoverageUpdate {
  @override
  final String? name;
  @override
  final String? description;
  @override
  final int? premiumCents;
  @override
  final BuiltList<CoverageItem>? items;
  @override
  final bool? active;

  factory _$InsuranceCoverageUpdate(
          [void Function(InsuranceCoverageUpdateBuilder)? updates]) =>
      (InsuranceCoverageUpdateBuilder()..update(updates))._build();

  _$InsuranceCoverageUpdate._(
      {this.name, this.description, this.premiumCents, this.items, this.active})
      : super._();
  @override
  InsuranceCoverageUpdate rebuild(
          void Function(InsuranceCoverageUpdateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  InsuranceCoverageUpdateBuilder toBuilder() =>
      InsuranceCoverageUpdateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is InsuranceCoverageUpdate &&
        name == other.name &&
        description == other.description &&
        premiumCents == other.premiumCents &&
        items == other.items &&
        active == other.active;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, premiumCents.hashCode);
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'InsuranceCoverageUpdate')
          ..add('name', name)
          ..add('description', description)
          ..add('premiumCents', premiumCents)
          ..add('items', items)
          ..add('active', active))
        .toString();
  }
}

class InsuranceCoverageUpdateBuilder
    implements
        Builder<InsuranceCoverageUpdate, InsuranceCoverageUpdateBuilder> {
  _$InsuranceCoverageUpdate? _$v;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  int? _premiumCents;
  int? get premiumCents => _$this._premiumCents;
  set premiumCents(int? premiumCents) => _$this._premiumCents = premiumCents;

  ListBuilder<CoverageItem>? _items;
  ListBuilder<CoverageItem> get items =>
      _$this._items ??= ListBuilder<CoverageItem>();
  set items(ListBuilder<CoverageItem>? items) => _$this._items = items;

  bool? _active;
  bool? get active => _$this._active;
  set active(bool? active) => _$this._active = active;

  InsuranceCoverageUpdateBuilder() {
    InsuranceCoverageUpdate._defaults(this);
  }

  InsuranceCoverageUpdateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _description = $v.description;
      _premiumCents = $v.premiumCents;
      _items = $v.items?.toBuilder();
      _active = $v.active;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(InsuranceCoverageUpdate other) {
    _$v = other as _$InsuranceCoverageUpdate;
  }

  @override
  void update(void Function(InsuranceCoverageUpdateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  InsuranceCoverageUpdate build() => _build();

  _$InsuranceCoverageUpdate _build() {
    _$InsuranceCoverageUpdate _$result;
    try {
      _$result = _$v ??
          _$InsuranceCoverageUpdate._(
            name: name,
            description: description,
            premiumCents: premiumCents,
            items: _items?.build(),
            active: active,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        _items?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'InsuranceCoverageUpdate', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
