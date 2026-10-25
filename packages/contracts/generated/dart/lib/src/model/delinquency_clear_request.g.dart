// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'delinquency_clear_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DelinquencyClearRequest extends DelinquencyClearRequest {
  @override
  final String reason;

  factory _$DelinquencyClearRequest(
          [void Function(DelinquencyClearRequestBuilder)? updates]) =>
      (DelinquencyClearRequestBuilder()..update(updates))._build();

  _$DelinquencyClearRequest._({required this.reason}) : super._();
  @override
  DelinquencyClearRequest rebuild(
          void Function(DelinquencyClearRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DelinquencyClearRequestBuilder toBuilder() =>
      DelinquencyClearRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DelinquencyClearRequest && reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DelinquencyClearRequest')
          ..add('reason', reason))
        .toString();
  }
}

class DelinquencyClearRequestBuilder
    implements
        Builder<DelinquencyClearRequest, DelinquencyClearRequestBuilder> {
  _$DelinquencyClearRequest? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  DelinquencyClearRequestBuilder() {
    DelinquencyClearRequest._defaults(this);
  }

  DelinquencyClearRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DelinquencyClearRequest other) {
    _$v = other as _$DelinquencyClearRequest;
  }

  @override
  void update(void Function(DelinquencyClearRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DelinquencyClearRequest build() => _build();

  _$DelinquencyClearRequest _build() {
    final _$result = _$v ??
        _$DelinquencyClearRequest._(
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'DelinquencyClearRequest', 'reason'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
