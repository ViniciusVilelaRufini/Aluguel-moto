// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'kyc_status_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$KycStatusResponse extends KycStatusResponse {
  @override
  final KycStatus status;
  @override
  final String? reason;
  @override
  final DateTime? submittedAt;
  @override
  final DateTime? reviewedAt;

  factory _$KycStatusResponse(
          [void Function(KycStatusResponseBuilder)? updates]) =>
      (KycStatusResponseBuilder()..update(updates))._build();

  _$KycStatusResponse._(
      {required this.status, this.reason, this.submittedAt, this.reviewedAt})
      : super._();
  @override
  KycStatusResponse rebuild(void Function(KycStatusResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  KycStatusResponseBuilder toBuilder() =>
      KycStatusResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is KycStatusResponse &&
        status == other.status &&
        reason == other.reason &&
        submittedAt == other.submittedAt &&
        reviewedAt == other.reviewedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, submittedAt.hashCode);
    _$hash = $jc(_$hash, reviewedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'KycStatusResponse')
          ..add('status', status)
          ..add('reason', reason)
          ..add('submittedAt', submittedAt)
          ..add('reviewedAt', reviewedAt))
        .toString();
  }
}

class KycStatusResponseBuilder
    implements Builder<KycStatusResponse, KycStatusResponseBuilder> {
  _$KycStatusResponse? _$v;

  KycStatus? _status;
  KycStatus? get status => _$this._status;
  set status(KycStatus? status) => _$this._status = status;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  DateTime? _submittedAt;
  DateTime? get submittedAt => _$this._submittedAt;
  set submittedAt(DateTime? submittedAt) => _$this._submittedAt = submittedAt;

  DateTime? _reviewedAt;
  DateTime? get reviewedAt => _$this._reviewedAt;
  set reviewedAt(DateTime? reviewedAt) => _$this._reviewedAt = reviewedAt;

  KycStatusResponseBuilder() {
    KycStatusResponse._defaults(this);
  }

  KycStatusResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _status = $v.status;
      _reason = $v.reason;
      _submittedAt = $v.submittedAt;
      _reviewedAt = $v.reviewedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(KycStatusResponse other) {
    _$v = other as _$KycStatusResponse;
  }

  @override
  void update(void Function(KycStatusResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  KycStatusResponse build() => _build();

  _$KycStatusResponse _build() {
    final _$result = _$v ??
        _$KycStatusResponse._(
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'KycStatusResponse', 'status'),
          reason: reason,
          submittedAt: submittedAt,
          reviewedAt: reviewedAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
