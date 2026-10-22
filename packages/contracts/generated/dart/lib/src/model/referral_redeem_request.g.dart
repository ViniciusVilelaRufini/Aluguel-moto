// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referral_redeem_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ReferralRedeemRequest extends ReferralRedeemRequest {
  @override
  final String code;

  factory _$ReferralRedeemRequest(
          [void Function(ReferralRedeemRequestBuilder)? updates]) =>
      (ReferralRedeemRequestBuilder()..update(updates))._build();

  _$ReferralRedeemRequest._({required this.code}) : super._();
  @override
  ReferralRedeemRequest rebuild(
          void Function(ReferralRedeemRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ReferralRedeemRequestBuilder toBuilder() =>
      ReferralRedeemRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ReferralRedeemRequest && code == other.code;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ReferralRedeemRequest')
          ..add('code', code))
        .toString();
  }
}

class ReferralRedeemRequestBuilder
    implements Builder<ReferralRedeemRequest, ReferralRedeemRequestBuilder> {
  _$ReferralRedeemRequest? _$v;

  String? _code;
  String? get code => _$this._code;
  set code(String? code) => _$this._code = code;

  ReferralRedeemRequestBuilder() {
    ReferralRedeemRequest._defaults(this);
  }

  ReferralRedeemRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _code = $v.code;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ReferralRedeemRequest other) {
    _$v = other as _$ReferralRedeemRequest;
  }

  @override
  void update(void Function(ReferralRedeemRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ReferralRedeemRequest build() => _build();

  _$ReferralRedeemRequest _build() {
    final _$result = _$v ??
        _$ReferralRedeemRequest._(
          code: BuiltValueNullFieldError.checkNotNull(
              code, r'ReferralRedeemRequest', 'code'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
