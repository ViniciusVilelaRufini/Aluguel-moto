// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'kyc_review_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$KycReviewRequest extends KycReviewRequest {
  @override
  final KycDecision decision;
  @override
  final String reason;

  factory _$KycReviewRequest(
          [void Function(KycReviewRequestBuilder)? updates]) =>
      (KycReviewRequestBuilder()..update(updates))._build();

  _$KycReviewRequest._({required this.decision, required this.reason})
      : super._();
  @override
  KycReviewRequest rebuild(void Function(KycReviewRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  KycReviewRequestBuilder toBuilder() =>
      KycReviewRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is KycReviewRequest &&
        decision == other.decision &&
        reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, decision.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'KycReviewRequest')
          ..add('decision', decision)
          ..add('reason', reason))
        .toString();
  }
}

class KycReviewRequestBuilder
    implements Builder<KycReviewRequest, KycReviewRequestBuilder> {
  _$KycReviewRequest? _$v;

  KycDecision? _decision;
  KycDecision? get decision => _$this._decision;
  set decision(KycDecision? decision) => _$this._decision = decision;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  KycReviewRequestBuilder() {
    KycReviewRequest._defaults(this);
  }

  KycReviewRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _decision = $v.decision;
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(KycReviewRequest other) {
    _$v = other as _$KycReviewRequest;
  }

  @override
  void update(void Function(KycReviewRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  KycReviewRequest build() => _build();

  _$KycReviewRequest _build() {
    final _$result = _$v ??
        _$KycReviewRequest._(
          decision: BuiltValueNullFieldError.checkNotNull(
              decision, r'KycReviewRequest', 'decision'),
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'KycReviewRequest', 'reason'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
