// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pricing_plan.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PricingPlan extends PricingPlan {
  @override
  final String id;
  @override
  final PlanCode code;
  @override
  final String name;
  @override
  final String? description;
  @override
  final PlanUnit unit;
  @override
  final int unlockFeeCents;
  @override
  final int unitPriceCents;
  @override
  final int pausePerMinuteCents;
  @override
  final bool recurring;
  @override
  final bool active;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  factory _$PricingPlan([void Function(PricingPlanBuilder)? updates]) =>
      (PricingPlanBuilder()..update(updates))._build();

  _$PricingPlan._(
      {required this.id,
      required this.code,
      required this.name,
      this.description,
      required this.unit,
      required this.unlockFeeCents,
      required this.unitPriceCents,
      required this.pausePerMinuteCents,
      required this.recurring,
      required this.active,
      required this.createdAt,
      required this.updatedAt})
      : super._();
  @override
  PricingPlan rebuild(void Function(PricingPlanBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PricingPlanBuilder toBuilder() => PricingPlanBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PricingPlan &&
        id == other.id &&
        code == other.code &&
        name == other.name &&
        description == other.description &&
        unit == other.unit &&
        unlockFeeCents == other.unlockFeeCents &&
        unitPriceCents == other.unitPriceCents &&
        pausePerMinuteCents == other.pausePerMinuteCents &&
        recurring == other.recurring &&
        active == other.active &&
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
    _$hash = $jc(_$hash, unit.hashCode);
    _$hash = $jc(_$hash, unlockFeeCents.hashCode);
    _$hash = $jc(_$hash, unitPriceCents.hashCode);
    _$hash = $jc(_$hash, pausePerMinuteCents.hashCode);
    _$hash = $jc(_$hash, recurring.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PricingPlan')
          ..add('id', id)
          ..add('code', code)
          ..add('name', name)
          ..add('description', description)
          ..add('unit', unit)
          ..add('unlockFeeCents', unlockFeeCents)
          ..add('unitPriceCents', unitPriceCents)
          ..add('pausePerMinuteCents', pausePerMinuteCents)
          ..add('recurring', recurring)
          ..add('active', active)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class PricingPlanBuilder implements Builder<PricingPlan, PricingPlanBuilder> {
  _$PricingPlan? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  PlanCode? _code;
  PlanCode? get code => _$this._code;
  set code(PlanCode? code) => _$this._code = code;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  PlanUnit? _unit;
  PlanUnit? get unit => _$this._unit;
  set unit(PlanUnit? unit) => _$this._unit = unit;

  int? _unlockFeeCents;
  int? get unlockFeeCents => _$this._unlockFeeCents;
  set unlockFeeCents(int? unlockFeeCents) =>
      _$this._unlockFeeCents = unlockFeeCents;

  int? _unitPriceCents;
  int? get unitPriceCents => _$this._unitPriceCents;
  set unitPriceCents(int? unitPriceCents) =>
      _$this._unitPriceCents = unitPriceCents;

  int? _pausePerMinuteCents;
  int? get pausePerMinuteCents => _$this._pausePerMinuteCents;
  set pausePerMinuteCents(int? pausePerMinuteCents) =>
      _$this._pausePerMinuteCents = pausePerMinuteCents;

  bool? _recurring;
  bool? get recurring => _$this._recurring;
  set recurring(bool? recurring) => _$this._recurring = recurring;

  bool? _active;
  bool? get active => _$this._active;
  set active(bool? active) => _$this._active = active;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  PricingPlanBuilder() {
    PricingPlan._defaults(this);
  }

  PricingPlanBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _code = $v.code;
      _name = $v.name;
      _description = $v.description;
      _unit = $v.unit;
      _unlockFeeCents = $v.unlockFeeCents;
      _unitPriceCents = $v.unitPriceCents;
      _pausePerMinuteCents = $v.pausePerMinuteCents;
      _recurring = $v.recurring;
      _active = $v.active;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PricingPlan other) {
    _$v = other as _$PricingPlan;
  }

  @override
  void update(void Function(PricingPlanBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PricingPlan build() => _build();

  _$PricingPlan _build() {
    final _$result = _$v ??
        _$PricingPlan._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'PricingPlan', 'id'),
          code: BuiltValueNullFieldError.checkNotNull(
              code, r'PricingPlan', 'code'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'PricingPlan', 'name'),
          description: description,
          unit: BuiltValueNullFieldError.checkNotNull(
              unit, r'PricingPlan', 'unit'),
          unlockFeeCents: BuiltValueNullFieldError.checkNotNull(
              unlockFeeCents, r'PricingPlan', 'unlockFeeCents'),
          unitPriceCents: BuiltValueNullFieldError.checkNotNull(
              unitPriceCents, r'PricingPlan', 'unitPriceCents'),
          pausePerMinuteCents: BuiltValueNullFieldError.checkNotNull(
              pausePerMinuteCents, r'PricingPlan', 'pausePerMinuteCents'),
          recurring: BuiltValueNullFieldError.checkNotNull(
              recurring, r'PricingPlan', 'recurring'),
          active: BuiltValueNullFieldError.checkNotNull(
              active, r'PricingPlan', 'active'),
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'PricingPlan', 'createdAt'),
          updatedAt: BuiltValueNullFieldError.checkNotNull(
              updatedAt, r'PricingPlan', 'updatedAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
