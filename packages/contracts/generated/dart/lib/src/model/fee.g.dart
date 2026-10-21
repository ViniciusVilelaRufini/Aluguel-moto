// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'fee.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Fee extends Fee {
  @override
  final String id;
  @override
  final String code;
  @override
  final String name;
  @override
  final String? description;
  @override
  final int amountCents;
  @override
  final bool active;
  @override
  final bool system;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  factory _$Fee([void Function(FeeBuilder)? updates]) =>
      (FeeBuilder()..update(updates))._build();

  _$Fee._(
      {required this.id,
      required this.code,
      required this.name,
      this.description,
      required this.amountCents,
      required this.active,
      required this.system,
      required this.createdAt,
      required this.updatedAt})
      : super._();
  @override
  Fee rebuild(void Function(FeeBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  FeeBuilder toBuilder() => FeeBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Fee &&
        id == other.id &&
        code == other.code &&
        name == other.name &&
        description == other.description &&
        amountCents == other.amountCents &&
        active == other.active &&
        system == other.system &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jc(_$hash, system.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Fee')
          ..add('id', id)
          ..add('code', code)
          ..add('name', name)
          ..add('description', description)
          ..add('amountCents', amountCents)
          ..add('active', active)
          ..add('system', system)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class FeeBuilder implements Builder<Fee, FeeBuilder> {
  _$Fee? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

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

  bool? _system;
  bool? get system => _$this._system;
  set system(bool? system) => _$this._system = system;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  FeeBuilder() {
    Fee._defaults(this);
  }

  FeeBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _code = $v.code;
      _name = $v.name;
      _description = $v.description;
      _amountCents = $v.amountCents;
      _active = $v.active;
      _system = $v.system;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Fee other) {
    _$v = other as _$Fee;
  }

  @override
  void update(void Function(FeeBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Fee build() => _build();

  _$Fee _build() {
    final _$result = _$v ??
        _$Fee._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'Fee', 'id'),
          code: BuiltValueNullFieldError.checkNotNull(code, r'Fee', 'code'),
          name: BuiltValueNullFieldError.checkNotNull(name, r'Fee', 'name'),
          description: description,
          amountCents: BuiltValueNullFieldError.checkNotNull(
              amountCents, r'Fee', 'amountCents'),
          active:
              BuiltValueNullFieldError.checkNotNull(active, r'Fee', 'active'),
          system:
              BuiltValueNullFieldError.checkNotNull(system, r'Fee', 'system'),
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'Fee', 'createdAt'),
          updatedAt: BuiltValueNullFieldError.checkNotNull(
              updatedAt, r'Fee', 'updatedAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
