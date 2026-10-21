// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'start_rental_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$StartRentalRequest extends StartRentalRequest {
  @override
  final String vehicleId;
  @override
  final PlanCode planCode;
  @override
  final InsuranceCoverage coverage;
  @override
  final DepositMethod depositMethod;
  @override
  final String? couponCode;
  @override
  final String? cardId;
  @override
  final String? depositId;
  @override
  final bool? useWalletCredits;

  factory _$StartRentalRequest(
          [void Function(StartRentalRequestBuilder)? updates]) =>
      (StartRentalRequestBuilder()..update(updates))._build();

  _$StartRentalRequest._(
      {required this.vehicleId,
      required this.planCode,
      required this.coverage,
      required this.depositMethod,
      this.couponCode,
      this.cardId,
      this.depositId,
      this.useWalletCredits})
      : super._();
  @override
  StartRentalRequest rebuild(
          void Function(StartRentalRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  StartRentalRequestBuilder toBuilder() =>
      StartRentalRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is StartRentalRequest &&
        vehicleId == other.vehicleId &&
        planCode == other.planCode &&
        coverage == other.coverage &&
        depositMethod == other.depositMethod &&
        couponCode == other.couponCode &&
        cardId == other.cardId &&
        depositId == other.depositId &&
        useWalletCredits == other.useWalletCredits;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, planCode.hashCode);
    _$hash = $jc(_$hash, coverage.hashCode);
    _$hash = $jc(_$hash, depositMethod.hashCode);
    _$hash = $jc(_$hash, couponCode.hashCode);
    _$hash = $jc(_$hash, cardId.hashCode);
    _$hash = $jc(_$hash, depositId.hashCode);
    _$hash = $jc(_$hash, useWalletCredits.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'StartRentalRequest')
          ..add('vehicleId', vehicleId)
          ..add('planCode', planCode)
          ..add('coverage', coverage)
          ..add('depositMethod', depositMethod)
          ..add('couponCode', couponCode)
          ..add('cardId', cardId)
          ..add('depositId', depositId)
          ..add('useWalletCredits', useWalletCredits))
        .toString();
  }
}

class StartRentalRequestBuilder
    implements Builder<StartRentalRequest, StartRentalRequestBuilder> {
  _$StartRentalRequest? _$v;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  PlanCode? _planCode;
  PlanCode? get planCode => _$this._planCode;
  set planCode(PlanCode? planCode) => _$this._planCode = planCode;

  InsuranceCoverage? _coverage;
  InsuranceCoverage? get coverage => _$this._coverage;
  set coverage(InsuranceCoverage? coverage) => _$this._coverage = coverage;

  DepositMethod? _depositMethod;
  DepositMethod? get depositMethod => _$this._depositMethod;
  set depositMethod(DepositMethod? depositMethod) =>
      _$this._depositMethod = depositMethod;

  String? _couponCode;
  String? get couponCode => _$this._couponCode;
  set couponCode(String? couponCode) => _$this._couponCode = couponCode;

  String? _cardId;
  String? get cardId => _$this._cardId;
  set cardId(String? cardId) => _$this._cardId = cardId;

  String? _depositId;
  String? get depositId => _$this._depositId;
  set depositId(String? depositId) => _$this._depositId = depositId;

  bool? _useWalletCredits;
  bool? get useWalletCredits => _$this._useWalletCredits;
  set useWalletCredits(bool? useWalletCredits) =>
      _$this._useWalletCredits = useWalletCredits;

  StartRentalRequestBuilder() {
    StartRentalRequest._defaults(this);
  }

  StartRentalRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _vehicleId = $v.vehicleId;
      _planCode = $v.planCode;
      _coverage = $v.coverage;
      _depositMethod = $v.depositMethod;
      _couponCode = $v.couponCode;
      _cardId = $v.cardId;
      _depositId = $v.depositId;
      _useWalletCredits = $v.useWalletCredits;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(StartRentalRequest other) {
    _$v = other as _$StartRentalRequest;
  }

  @override
  void update(void Function(StartRentalRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  StartRentalRequest build() => _build();

  _$StartRentalRequest _build() {
    final _$result = _$v ??
        _$StartRentalRequest._(
          vehicleId: BuiltValueNullFieldError.checkNotNull(
              vehicleId, r'StartRentalRequest', 'vehicleId'),
          planCode: BuiltValueNullFieldError.checkNotNull(
              planCode, r'StartRentalRequest', 'planCode'),
          coverage: BuiltValueNullFieldError.checkNotNull(
              coverage, r'StartRentalRequest', 'coverage'),
          depositMethod: BuiltValueNullFieldError.checkNotNull(
              depositMethod, r'StartRentalRequest', 'depositMethod'),
          couponCode: couponCode,
          cardId: cardId,
          depositId: depositId,
          useWalletCredits: useWalletCredits,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
