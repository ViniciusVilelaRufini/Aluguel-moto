// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reason_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ReasonRequest extends ReasonRequest {
  @override
  final String reason;

  factory _$ReasonRequest([void Function(ReasonRequestBuilder)? updates]) =>
      (ReasonRequestBuilder()..update(updates))._build();

  _$ReasonRequest._({required this.reason}) : super._();
  @override
  ReasonRequest rebuild(void Function(ReasonRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ReasonRequestBuilder toBuilder() => ReasonRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ReasonRequest && reason == other.reason;
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
    return (newBuiltValueToStringHelper(r'ReasonRequest')
          ..add('reason', reason))
        .toString();
  }
}

class ReasonRequestBuilder
    implements Builder<ReasonRequest, ReasonRequestBuilder> {
  _$ReasonRequest? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  ReasonRequestBuilder() {
    ReasonRequest._defaults(this);
  }

  ReasonRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ReasonRequest other) {
    _$v = other as _$ReasonRequest;
  }

  @override
  void update(void Function(ReasonRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ReasonRequest build() => _build();

  _$ReasonRequest _build() {
    final _$result = _$v ??
        _$ReasonRequest._(
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'ReasonRequest', 'reason'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
