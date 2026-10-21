// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pricing_plan_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PricingPlanInput extends PricingPlanInput {
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
  final bool? active;

  factory _$PricingPlanInput(
          [void Function(PricingPlanInputBuilder)? updates]) =>
      (PricingPlanInputBuilder()..update(updates))._build();

  _$PricingPlanInput._(
      {required this.code,
      required this.name,
      this.description,
      required this.unit,
      required this.unlockFeeCents,
      required this.unitPriceCents,
      required this.pausePerMinuteCents,
      required this.recurring,
      this.active})
      : super._();
  @override
  PricingPlanInput rebuild(void Function(PricingPlanInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PricingPlanInputBuilder toBuilder() =>
      PricingPlanInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PricingPlanInput &&
        code == other.code &&
        name == other.name &&
        description == other.description &&
        unit == other.unit &&
        unlockFeeCents == other.unlockFeeCents &&
        unitPriceCents == other.unitPriceCents &&
        pausePerMinuteCents == other.pausePerMinuteCents &&
        recurring == other.recurring &&
        active == other.active;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, unit.hashCode);
    _$hash = $jc(_$hash, unlockFeeCents.hashCode);
    _$hash = $jc(_$hash, unitPriceCents.hashCode);
    _$hash = $jc(_$hash, pausePerMinuteCents.hashCode);
    _$hash = $jc(_$hash, recurring.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PricingPlanInput')
          ..add('code', code)
          ..add('name', name)
          ..add('description', description)
          ..add('unit', unit)
          ..add('unlockFeeCents', unlockFeeCents)
          ..add('unitPriceCents', unitPriceCents)
          ..add('pausePerMinuteCents', pausePerMinuteCents)
          ..add('recurring', recurring)
          ..add('active', active))
        .toString();
  }
}

class PricingPlanInputBuilder
    implements Builder<PricingPlanInput, PricingPlanInputBuilder> {
  _$PricingPlanInput? _$v;

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

  PricingPlanInputBuilder() {
    PricingPlanInput._defaults(this);
  }

  PricingPlanInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _code = $v.code;
      _name = $v.name;
      _description = $v.description;
      _unit = $v.unit;
      _unlockFeeCents = $v.unlockFeeCents;
      _unitPriceCents = $v.unitPriceCents;
      _pausePerMinuteCents = $v.pausePerMinuteCents;
      _recurring = $v.recurring;
      _active = $v.active;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PricingPlanInput other) {
    _$v = other as _$PricingPlanInput;
  }

  @override
  void update(void Function(PricingPlanInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PricingPlanInput build() => _build();

  _$PricingPlanInput _build() {
    final _$result = _$v ??
        _$PricingPlanInput._(
          code: BuiltValueNullFieldError.checkNotNull(
              code, r'PricingPlanInput', 'code'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'PricingPlanInput', 'name'),
          description: description,
          unit: BuiltValueNullFieldError.checkNotNull(
              unit, r'PricingPlanInput', 'unit'),
          unlockFeeCents: BuiltValueNullFieldError.checkNotNull(
              unlockFeeCents, r'PricingPlanInput', 'unlockFeeCents'),
          unitPriceCents: BuiltValueNullFieldError.checkNotNull(
              unitPriceCents, r'PricingPlanInput', 'unitPriceCents'),
          pausePerMinuteCents: BuiltValueNullFieldError.checkNotNull(
              pausePerMinuteCents, r'PricingPlanInput', 'pausePerMinuteCents'),
          recurring: BuiltValueNullFieldError.checkNotNull(
              recurring, r'PricingPlanInput', 'recurring'),
          active: active,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
