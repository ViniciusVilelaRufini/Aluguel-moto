// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'refund_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$RefundRequest extends RefundRequest {
  @override
  final int? amountCents;
  @override
  final String reason;

  factory _$RefundRequest([void Function(RefundRequestBuilder)? updates]) =>
      (RefundRequestBuilder()..update(updates))._build();

  _$RefundRequest._({this.amountCents, required this.reason}) : super._();
  @override
  RefundRequest rebuild(void Function(RefundRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RefundRequestBuilder toBuilder() => RefundRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is RefundRequest &&
        amountCents == other.amountCents &&
        reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'RefundRequest')
          ..add('amountCents', amountCents)
          ..add('reason', reason))
        .toString();
  }
}

class RefundRequestBuilder
    implements Builder<RefundRequest, RefundRequestBuilder> {
  _$RefundRequest? _$v;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  RefundRequestBuilder() {
    RefundRequest._defaults(this);
  }

  RefundRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _amountCents = $v.amountCents;
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(RefundRequest other) {
    _$v = other as _$RefundRequest;
  }

  @override
  void update(void Function(RefundRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  RefundRequest build() => _build();

  _$RefundRequest _build() {
    final _$result = _$v ??
        _$RefundRequest._(
          amountCents: amountCents,
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'RefundRequest', 'reason'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
