// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'fee_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$FeeInput extends FeeInput {
  @override
  final String code;
  @override
  final String name;
  @override
  final String? description;
  @override
  final int amountCents;
  @override
  final bool? active;

  factory _$FeeInput([void Function(FeeInputBuilder)? updates]) =>
      (FeeInputBuilder()..update(updates))._build();

  _$FeeInput._(
      {required this.code,
      required this.name,
      this.description,
      required this.amountCents,
      this.active})
      : super._();
  @override
  FeeInput rebuild(void Function(FeeInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  FeeInputBuilder toBuilder() => FeeInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is FeeInput &&
        code == other.code &&
        name == other.name &&
        description == other.description &&
        amountCents == other.amountCents &&
        active == other.active;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'FeeInput')
          ..add('code', code)
          ..add('name', name)
          ..add('description', description)
          ..add('amountCents', amountCents)
          ..add('active', active))
        .toString();
  }
}

class FeeInputBuilder implements Builder<FeeInput, FeeInputBuilder> {
  _$FeeInput? _$v;

  String? _code;
  String? get code => _$this._code;
  set code(String? code) => _$this._code = code;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  bool? _active;
  bool? get active => _$this._active;
  set active(bool? active) => _$this._active = active;

  FeeInputBuilder() {
    FeeInput._defaults(this);
  }

  FeeInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _code = $v.code;
      _name = $v.name;
      _description = $v.description;
      _amountCents = $v.amountCents;
      _active = $v.active;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(FeeInput other) {
    _$v = other as _$FeeInput;
  }

  @override
  void update(void Function(FeeInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  FeeInput build() => _build();

  _$FeeInput _build() {
    final _$result = _$v ??
        _$FeeInput._(
          code:
              BuiltValueNullFieldError.checkNotNull(code, r'FeeInput', 'code'),
          name:
              BuiltValueNullFieldError.checkNotNull(name, r'FeeInput', 'name'),
          description: description,
          amountCents: BuiltValueNullFieldError.checkNotNull(
              amountCents, r'FeeInput', 'amountCents'),
          active: active,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
