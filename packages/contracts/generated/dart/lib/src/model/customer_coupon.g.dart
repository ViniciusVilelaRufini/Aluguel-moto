// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'customer_coupon.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CustomerCoupon extends CustomerCoupon {
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
  final DateTime? validUntil;
  @override
  final int? usesRemaining;
  @override
  final CustomerCouponStatus status;
  @override
  final CustomerCouponSource source_;
  @override
  final DateTime addedAt;

  factory _$CustomerCoupon([void Function(CustomerCouponBuilder)? updates]) =>
      (CustomerCouponBuilder()..update(updates))._build();

  _$CustomerCoupon._(
      {required this.id,
      required this.code,
      this.description,
      required this.discountType,
      this.percentOff,
      this.amountOffCents,
      this.planCodes,
      this.validUntil,
      this.usesRemaining,
      required this.status,
      required this.source_,
      required this.addedAt})
      : super._();
  @override
  CustomerCoupon rebuild(void Function(CustomerCouponBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CustomerCouponBuilder toBuilder() => CustomerCouponBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CustomerCoupon &&
        id == other.id &&
        code == other.code &&
        description == other.description &&
        discountType == other.discountType &&
        percentOff == other.percentOff &&
        amountOffCents == other.amountOffCents &&
        planCodes == other.planCodes &&
        validUntil == other.validUntil &&
        usesRemaining == other.usesRemaining &&
        status == other.status &&
        source_ == other.source_ &&
        addedAt == other.addedAt;
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
    _$hash = $jc(_$hash, validUntil.hashCode);
    _$hash = $jc(_$hash, usesRemaining.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, source_.hashCode);
    _$hash = $jc(_$hash, addedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CustomerCoupon')
          ..add('id', id)
          ..add('code', code)
          ..add('description', description)
          ..add('discountType', discountType)
          ..add('percentOff', percentOff)
          ..add('amountOffCents', amountOffCents)
          ..add('planCodes', planCodes)
          ..add('validUntil', validUntil)
          ..add('usesRemaining', usesRemaining)
          ..add('status', status)
          ..add('source_', source_)
          ..add('addedAt', addedAt))
        .toString();
  }
}

class CustomerCouponBuilder
    implements Builder<CustomerCoupon, CustomerCouponBuilder> {
  _$CustomerCoupon? _$v;

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

  DateTime? _validUntil;
  DateTime? get validUntil => _$this._validUntil;
  set validUntil(DateTime? validUntil) => _$this._validUntil = validUntil;

  int? _usesRemaining;
  int? get usesRemaining => _$this._usesRemaining;
  set usesRemaining(int? usesRemaining) =>
      _$this._usesRemaining = usesRemaining;

  CustomerCouponStatus? _status;
  CustomerCouponStatus? get status => _$this._status;
  set status(CustomerCouponStatus? status) => _$this._status = status;

  CustomerCouponSource? _source_;
  CustomerCouponSource? get source_ => _$this._source_;
  set source_(CustomerCouponSource? source_) => _$this._source_ = source_;

  DateTime? _addedAt;
  DateTime? get addedAt => _$this._addedAt;
  set addedAt(DateTime? addedAt) => _$this._addedAt = addedAt;

  CustomerCouponBuilder() {
    CustomerCoupon._defaults(this);
  }

  CustomerCouponBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _code = $v.code;
      _description = $v.description;
      _discountType = $v.discountType;
      _percentOff = $v.percentOff;
      _amountOffCents = $v.amountOffCents;
      _planCodes = $v.planCodes?.toBuilder();
      _validUntil = $v.validUntil;
      _usesRemaining = $v.usesRemaining;
      _status = $v.status;
      _source_ = $v.source_;
      _addedAt = $v.addedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CustomerCoupon other) {
    _$v = other as _$CustomerCoupon;
  }

  @override
  void update(void Function(CustomerCouponBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CustomerCoupon build() => _build();

  _$CustomerCoupon _build() {
    _$CustomerCoupon _$result;
    try {
      _$result = _$v ??
          _$CustomerCoupon._(
            id: BuiltValueNullFieldError.checkNotNull(
                id, r'CustomerCoupon', 'id'),
            code: BuiltValueNullFieldError.checkNotNull(
                code, r'CustomerCoupon', 'code'),
            description: description,
            discountType: BuiltValueNullFieldError.checkNotNull(
                discountType, r'CustomerCoupon', 'discountType'),
            percentOff: percentOff,
            amountOffCents: amountOffCents,
            planCodes: _planCodes?.build(),
            validUntil: validUntil,
            usesRemaining: usesRemaining,
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'CustomerCoupon', 'status'),
            source_: BuiltValueNullFieldError.checkNotNull(
                source_, r'CustomerCoupon', 'source_'),
            addedAt: BuiltValueNullFieldError.checkNotNull(
                addedAt, r'CustomerCoupon', 'addedAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'planCodes';
        _planCodes?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'CustomerCoupon', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
