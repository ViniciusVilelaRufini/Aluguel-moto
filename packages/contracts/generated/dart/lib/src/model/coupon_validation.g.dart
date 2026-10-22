// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'coupon_validation.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CouponValidation extends CouponValidation {
  @override
  final String code;
  @override
  final bool valid;
  @override
  final String? message;
  @override
  final String? description;
  @override
  final DiscountType? discountType;
  @override
  final int? percentOff;
  @override
  final int? amountOffCents;
  @override
  final BuiltList<PlanCode>? planCodes;
  @override
  final DateTime? validUntil;

  factory _$CouponValidation(
          [void Function(CouponValidationBuilder)? updates]) =>
      (CouponValidationBuilder()..update(updates))._build();

  _$CouponValidation._(
      {required this.code,
      required this.valid,
      this.message,
      this.description,
      this.discountType,
      this.percentOff,
      this.amountOffCents,
      this.planCodes,
      this.validUntil})
      : super._();
  @override
  CouponValidation rebuild(void Function(CouponValidationBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CouponValidationBuilder toBuilder() =>
      CouponValidationBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CouponValidation &&
        code == other.code &&
        valid == other.valid &&
        message == other.message &&
        description == other.description &&
        discountType == other.discountType &&
        percentOff == other.percentOff &&
        amountOffCents == other.amountOffCents &&
        planCodes == other.planCodes &&
        validUntil == other.validUntil;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jc(_$hash, valid.hashCode);
    _$hash = $jc(_$hash, message.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, discountType.hashCode);
    _$hash = $jc(_$hash, percentOff.hashCode);
    _$hash = $jc(_$hash, amountOffCents.hashCode);
    _$hash = $jc(_$hash, planCodes.hashCode);
    _$hash = $jc(_$hash, validUntil.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CouponValidation')
          ..add('code', code)
          ..add('valid', valid)
          ..add('message', message)
          ..add('description', description)
          ..add('discountType', discountType)
          ..add('percentOff', percentOff)
          ..add('amountOffCents', amountOffCents)
          ..add('planCodes', planCodes)
          ..add('validUntil', validUntil))
        .toString();
  }
}

class CouponValidationBuilder
    implements Builder<CouponValidation, CouponValidationBuilder> {
  _$CouponValidation? _$v;

  String? _code;
  String? get code => _$this._code;
  set code(String? code) => _$this._code = code;

  bool? _valid;
  bool? get valid => _$this._valid;
  set valid(bool? valid) => _$this._valid = valid;

  String? _message;
  String? get message => _$this._message;
  set message(String? message) => _$this._message = message;

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

  DateTime? _validUntil;
  DateTime? get validUntil => _$this._validUntil;
  set validUntil(DateTime? validUntil) => _$this._validUntil = validUntil;

  CouponValidationBuilder() {
    CouponValidation._defaults(this);
  }

  CouponValidationBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _code = $v.code;
      _valid = $v.valid;
      _message = $v.message;
      _description = $v.description;
      _discountType = $v.discountType;
      _percentOff = $v.percentOff;
      _amountOffCents = $v.amountOffCents;
      _planCodes = $v.planCodes?.toBuilder();
      _validUntil = $v.validUntil;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CouponValidation other) {
    _$v = other as _$CouponValidation;
  }

  @override
  void update(void Function(CouponValidationBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CouponValidation build() => _build();

  _$CouponValidation _build() {
    _$CouponValidation _$result;
    try {
      _$result = _$v ??
          _$CouponValidation._(
            code: BuiltValueNullFieldError.checkNotNull(
                code, r'CouponValidation', 'code'),
            valid: BuiltValueNullFieldError.checkNotNull(
                valid, r'CouponValidation', 'valid'),
            message: message,
            description: description,
            discountType: discountType,
            percentOff: percentOff,
            amountOffCents: amountOffCents,
            planCodes: _planCodes?.build(),
            validUntil: validUntil,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'planCodes';
        _planCodes?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'CouponValidation', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
