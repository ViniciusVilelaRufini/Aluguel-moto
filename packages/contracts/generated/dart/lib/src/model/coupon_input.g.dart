// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'coupon_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CouponInput extends CouponInput {
  @override
  final String code;
  @override
  final String? description;
  @override
  final DiscountType discountType;
  @override
  final int? percentOff;
  @override
  final int? amountOffCents;
  @override
  final BuiltList<PlanCode>? planCodes;
  @override
  final DateTime? validFrom;
  @override
  final DateTime? validUntil;
  @override
  final int? maxRedemptions;
  @override
  final int? maxRedemptionsPerCustomer;
  @override
  final bool? active;

  factory _$CouponInput([void Function(CouponInputBuilder)? updates]) =>
      (CouponInputBuilder()..update(updates))._build();

  _$CouponInput._(
      {required this.code,
      this.description,
      required this.discountType,
      this.percentOff,
      this.amountOffCents,
      this.planCodes,
      this.validFrom,
      this.validUntil,
      this.maxRedemptions,
      this.maxRedemptionsPerCustomer,
      this.active})
      : super._();
  @override
  CouponInput rebuild(void Function(CouponInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CouponInputBuilder toBuilder() => CouponInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CouponInput &&
        code == other.code &&
        description == other.description &&
        discountType == other.discountType &&
        percentOff == other.percentOff &&
        amountOffCents == other.amountOffCents &&
        planCodes == other.planCodes &&
        validFrom == other.validFrom &&
        validUntil == other.validUntil &&
        maxRedemptions == other.maxRedemptions &&
        maxRedemptionsPerCustomer == other.maxRedemptionsPerCustomer &&
        active == other.active;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, discountType.hashCode);
    _$hash = $jc(_$hash, percentOff.hashCode);
    _$hash = $jc(_$hash, amountOffCents.hashCode);
    _$hash = $jc(_$hash, planCodes.hashCode);
    _$hash = $jc(_$hash, validFrom.hashCode);
    _$hash = $jc(_$hash, validUntil.hashCode);
    _$hash = $jc(_$hash, maxRedemptions.hashCode);
    _$hash = $jc(_$hash, maxRedemptionsPerCustomer.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CouponInput')
          ..add('code', code)
          ..add('description', description)
          ..add('discountType', discountType)
          ..add('percentOff', percentOff)
          ..add('amountOffCents', amountOffCents)
          ..add('planCodes', planCodes)
          ..add('validFrom', validFrom)
          ..add('validUntil', validUntil)
          ..add('maxRedemptions', maxRedemptions)
          ..add('maxRedemptionsPerCustomer', maxRedemptionsPerCustomer)
          ..add('active', active))
        .toString();
  }
}

class CouponInputBuilder implements Builder<CouponInput, CouponInputBuilder> {
  _$CouponInput? _$v;

  String? _code;
  String? get code => _$this._code;
  set code(String? code) => _$this._code = code;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  DiscountType? _discountType;
  DiscountType? get discountType => _$this._discountType;
  set discountType(DiscountType? discountType) =>
      _$this._discountType = discountType;

  int? _percentOff;
  int? get percentOff => _$this._percentOff;
  set percentOff(int? percentOff) => _$this._percentOff = percentOff;

  int? _amountOffCents;
  int? get amountOffCents => _$this._amountOffCents;
  set amountOffCents(int? amountOffCents) =>
      _$this._amountOffCents = amountOffCents;

  ListBuilder<PlanCode>? _planCodes;
  ListBuilder<PlanCode> get planCodes =>
      _$this._planCodes ??= ListBuilder<PlanCode>();
  set planCodes(ListBuilder<PlanCode>? planCodes) =>
      _$this._planCodes = planCodes;

  DateTime? _validFrom;
  DateTime? get validFrom => _$this._validFrom;
  set validFrom(DateTime? validFrom) => _$this._validFrom = validFrom;

  DateTime? _validUntil;
  DateTime? get validUntil => _$this._validUntil;
  set validUntil(DateTime? validUntil) => _$this._validUntil = validUntil;

  int? _maxRedemptions;
  int? get maxRedemptions => _$this._maxRedemptions;
  set maxRedemptions(int? maxRedemptions) =>
      _$this._maxRedemptions = maxRedemptions;

  int? _maxRedemptionsPerCustomer;
  int? get maxRedemptionsPerCustomer => _$this._maxRedemptionsPerCustomer;
  set maxRedemptionsPerCustomer(int? maxRedemptionsPerCustomer) =>
      _$this._maxRedemptionsPerCustomer = maxRedemptionsPerCustomer;

  bool? _active;
  bool? get active => _$this._active;
  set active(bool? active) => _$this._active = active;

  CouponInputBuilder() {
    CouponInput._defaults(this);
  }

  CouponInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _code = $v.code;
      _description = $v.description;
      _discountType = $v.discountType;
      _percentOff = $v.percentOff;
      _amountOffCents = $v.amountOffCents;
      _planCodes = $v.planCodes?.toBuilder();
      _validFrom = $v.validFrom;
      _validUntil = $v.validUntil;
      _maxRedemptions = $v.maxRedemptions;
      _maxRedemptionsPerCustomer = $v.maxRedemptionsPerCustomer;
      _active = $v.active;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CouponInput other) {
    _$v = other as _$CouponInput;
  }

  @override
  void update(void Function(CouponInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CouponInput build() => _build();

  _$CouponInput _build() {
    _$CouponInput _$result;
    try {
      _$result = _$v ??
          _$CouponInput._(
            code: BuiltValueNullFieldError.checkNotNull(
                code, r'CouponInput', 'code'),
            description: description,
            discountType: BuiltValueNullFieldError.checkNotNull(
                discountType, r'CouponInput', 'discountType'),
            percentOff: percentOff,
            amountOffCents: amountOffCents,
            planCodes: _planCodes?.build(),
            validFrom: validFrom,
            validUntil: validUntil,
            maxRedemptions: maxRedemptions,
            maxRedemptionsPerCustomer: maxRedemptionsPerCustomer,
            active: active,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'planCodes';
        _planCodes?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'CouponInput', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
