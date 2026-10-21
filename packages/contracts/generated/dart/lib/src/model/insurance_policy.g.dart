// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'insurance_policy.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$InsurancePolicy extends InsurancePolicy {
  @override
  final String id;
  @override
  final String rentalId;
  @override
  final String customerId;
  @override
  final InsuranceCoverage coverage;
  @override
  final int premiumCents;
  @override
  final int? payoutCents;
  @override
  final PolicyStatus status;
  @override
  final String? providerPolicyId;
  @override
  final DateTime issuedAt;
  @override
  final DateTime? canceledAt;

  factory _$InsurancePolicy([void Function(InsurancePolicyBuilder)? updates]) =>
      (InsurancePolicyBuilder()..update(updates))._build();

  _$InsurancePolicy._(
      {required this.id,
      required this.rentalId,
      required this.customerId,
      required this.coverage,
      required this.premiumCents,
      this.payoutCents,
      required this.status,
      this.providerPolicyId,
      required this.issuedAt,
      this.canceledAt})
      : super._();
  @override
  InsurancePolicy rebuild(void Function(InsurancePolicyBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  InsurancePolicyBuilder toBuilder() => InsurancePolicyBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is InsurancePolicy &&
        id == other.id &&
        rentalId == other.rentalId &&
        customerId == other.customerId &&
        coverage == other.coverage &&
        premiumCents == other.premiumCents &&
        payoutCents == other.payoutCents &&
        status == other.status &&
        providerPolicyId == other.providerPolicyId &&
        issuedAt == other.issuedAt &&
        canceledAt == other.canceledAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, customerId.hashCode);
    _$hash = $jc(_$hash, coverage.hashCode);
    _$hash = $jc(_$hash, premiumCents.hashCode);
    _$hash = $jc(_$hash, payoutCents.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, providerPolicyId.hashCode);
    _$hash = $jc(_$hash, issuedAt.hashCode);
    _$hash = $jc(_$hash, canceledAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'InsurancePolicy')
          ..add('id', id)
          ..add('rentalId', rentalId)
          ..add('customerId', customerId)
          ..add('coverage', coverage)
          ..add('premiumCents', premiumCents)
          ..add('payoutCents', payoutCents)
          ..add('status', status)
          ..add('providerPolicyId', providerPolicyId)
          ..add('issuedAt', issuedAt)
          ..add('canceledAt', canceledAt))
        .toString();
  }
}

class InsurancePolicyBuilder
    implements Builder<InsurancePolicy, InsurancePolicyBuilder> {
  _$InsurancePolicy? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _customerId;
  String? get customerId => _$this._customerId;
  set customerId(String? customerId) => _$this._customerId = customerId;

  InsuranceCoverage? _coverage;
  InsuranceCoverage? get coverage => _$this._coverage;
  set coverage(InsuranceCoverage? coverage) => _$this._coverage = coverage;

  int? _premiumCents;
  int? get premiumCents => _$this._premiumCents;
  set premiumCents(int? premiumCents) => _$this._premiumCents = premiumCents;

  int? _payoutCents;
  int? get payoutCents => _$this._payoutCents;
  set payoutCents(int? payoutCents) => _$this._payoutCents = payoutCents;

  PolicyStatus? _status;
  PolicyStatus? get status => _$this._status;
  set status(PolicyStatus? status) => _$this._status = status;

  String? _providerPolicyId;
  String? get providerPolicyId => _$this._providerPolicyId;
  set providerPolicyId(String? providerPolicyId) =>
      _$this._providerPolicyId = providerPolicyId;

  DateTime? _issuedAt;
  DateTime? get issuedAt => _$this._issuedAt;
  set issuedAt(DateTime? issuedAt) => _$this._issuedAt = issuedAt;

  DateTime? _canceledAt;
  DateTime? get canceledAt => _$this._canceledAt;
  set canceledAt(DateTime? canceledAt) => _$this._canceledAt = canceledAt;

  InsurancePolicyBuilder() {
    InsurancePolicy._defaults(this);
  }

  InsurancePolicyBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _rentalId = $v.rentalId;
      _customerId = $v.customerId;
      _coverage = $v.coverage;
      _premiumCents = $v.premiumCents;
      _payoutCents = $v.payoutCents;
      _status = $v.status;
      _providerPolicyId = $v.providerPolicyId;
      _issuedAt = $v.issuedAt;
      _canceledAt = $v.canceledAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(InsurancePolicy other) {
    _$v = other as _$InsurancePolicy;
  }

  @override
  void update(void Function(InsurancePolicyBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  InsurancePolicy build() => _build();

  _$InsurancePolicy _build() {
    final _$result = _$v ??
        _$InsurancePolicy._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'InsurancePolicy', 'id'),
          rentalId: BuiltValueNullFieldError.checkNotNull(
              rentalId, r'InsurancePolicy', 'rentalId'),
          customerId: BuiltValueNullFieldError.checkNotNull(
              customerId, r'InsurancePolicy', 'customerId'),
          coverage: BuiltValueNullFieldError.checkNotNull(
              coverage, r'InsurancePolicy', 'coverage'),
          premiumCents: BuiltValueNullFieldError.checkNotNull(
              premiumCents, r'InsurancePolicy', 'premiumCents'),
          payoutCents: payoutCents,
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'InsurancePolicy', 'status'),
          providerPolicyId: providerPolicyId,
          issuedAt: BuiltValueNullFieldError.checkNotNull(
              issuedAt, r'InsurancePolicy', 'issuedAt'),
          canceledAt: canceledAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
