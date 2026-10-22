// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'coupon_code_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CouponCodeRequest extends CouponCodeRequest {
  @override
  final String code;
  @override
  final PlanCode? planCode;

  factory _$CouponCodeRequest(
          [void Function(CouponCodeRequestBuilder)? updates]) =>
      (CouponCodeRequestBuilder()..update(updates))._build();

  _$CouponCodeRequest._({required this.code, this.planCode}) : super._();
  @override
  CouponCodeRequest rebuild(void Function(CouponCodeRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CouponCodeRequestBuilder toBuilder() =>
      CouponCodeRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CouponCodeRequest &&
        code == other.code &&
        planCode == other.planCode;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jc(_$hash, planCode.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CouponCodeRequest')
          ..add('code', code)
          ..add('planCode', planCode))
        .toString();
  }
}

class CouponCodeRequestBuilder
    implements Builder<CouponCodeRequest, CouponCodeRequestBuilder> {
  _$CouponCodeRequest? _$v;

  String? _code;
  String? get code => _$this._code;
  set code(String? code) => _$this._code = code;

  PlanCode? _planCode;
  PlanCode? get planCode => _$this._planCode;
  set planCode(PlanCode? planCode) => _$this._planCode = planCode;

  CouponCodeRequestBuilder() {
    CouponCodeRequest._defaults(this);
  }

  CouponCodeRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _code = $v.code;
      _planCode = $v.planCode;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CouponCodeRequest other) {
    _$v = other as _$CouponCodeRequest;
  }

  @override
  void update(void Function(CouponCodeRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CouponCodeRequest build() => _build();

  _$CouponCodeRequest _build() {
    final _$result = _$v ??
        _$CouponCodeRequest._(
          code: BuiltValueNullFieldError.checkNotNull(
              code, r'CouponCodeRequest', 'code'),
          planCode: planCode,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
