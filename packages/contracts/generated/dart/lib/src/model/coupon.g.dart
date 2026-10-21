// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'coupon.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Coupon extends Coupon {
  @override
  final String id;
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
  final int redemptions;
  @override
  final bool active;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  factory _$Coupon([void Function(CouponBuilder)? updates]) =>
      (CouponBuilder()..update(updates))._build();

  _$Coupon._(
      {required this.id,
      required this.code,
      this.description,
      required this.discountType,
      this.percentOff,
      this.amountOffCents,
      this.planCodes,
      this.validFrom,
      this.validUntil,
      this.maxRedemptions,
      this.maxRedemptionsPerCustomer,
      required this.redemptions,
      required this.active,
      required this.createdAt,
      required this.updatedAt})
      : super._();
  @override
  Coupon rebuild(void Function(CouponBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CouponBuilder toBuilder() => CouponBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Coupon &&
        id == other.id &&
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
        redemptions == other.redemptions &&
        active == other.active &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
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
    _$hash = $jc(_$hash, redemptions.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Coupon')
          ..add('id', id)
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
          ..add('redemptions', redemptions)
          ..add('active', active)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class CouponBuilder implements Builder<Coupon, CouponBuilder> {
  _$Coupon? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

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

  int? _redemptions;
  int? get redemptions => _$this._redemptions;
  set redemptions(int? redemptions) => _$this._redemptions = redemptions;

  bool? _active;
  bool? get active => _$this._active;
  set active(bool? active) => _$this._active = active;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  CouponBuilder() {
    Coupon._defaults(this);
  }

  CouponBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
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
      _redemptions = $v.redemptions;
      _active = $v.active;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Coupon other) {
    _$v = other as _$Coupon;
  }

  @override
  void update(void Function(CouponBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Coupon build() => _build();

  _$Coupon _build() {
    _$Coupon _$result;
    try {
      _$result = _$v ??
          _$Coupon._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'Coupon', 'id'),
            code:
                BuiltValueNullFieldError.checkNotNull(code, r'Coupon', 'code'),
            description: description,
            discountType: BuiltValueNullFieldError.checkNotNull(
                discountType, r'Coupon', 'discountType'),
            percentOff: percentOff,
            amountOffCents: amountOffCents,
            planCodes: _planCodes?.build(),
            validFrom: validFrom,
            validUntil: validUntil,
            maxRedemptions: maxRedemptions,
            maxRedemptionsPerCustomer: maxRedemptionsPerCustomer,
            redemptions: BuiltValueNullFieldError.checkNotNull(
                redemptions, r'Coupon', 'redemptions'),
            active: BuiltValueNullFieldError.checkNotNull(
                active, r'Coupon', 'active'),
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'Coupon', 'createdAt'),
            updatedAt: BuiltValueNullFieldError.checkNotNull(
                updatedAt, r'Coupon', 'updatedAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'planCodes';
        _planCodes?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'Coupon', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
