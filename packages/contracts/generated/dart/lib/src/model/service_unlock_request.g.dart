// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'service_unlock_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ServiceUnlockRequest extends ServiceUnlockRequest {
  @override
  final String reason;
  @override
  final String? fieldTaskId;

  factory _$ServiceUnlockRequest(
          [void Function(ServiceUnlockRequestBuilder)? updates]) =>
      (ServiceUnlockRequestBuilder()..update(updates))._build();

  _$ServiceUnlockRequest._({required this.reason, this.fieldTaskId})
      : super._();
  @override
  ServiceUnlockRequest rebuild(
          void Function(ServiceUnlockRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ServiceUnlockRequestBuilder toBuilder() =>
      ServiceUnlockRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ServiceUnlockRequest &&
        reason == other.reason &&
        fieldTaskId == other.fieldTaskId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, fieldTaskId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ServiceUnlockRequest')
          ..add('reason', reason)
          ..add('fieldTaskId', fieldTaskId))
        .toString();
  }
}

class ServiceUnlockRequestBuilder
    implements Builder<ServiceUnlockRequest, ServiceUnlockRequestBuilder> {
  _$ServiceUnlockRequest? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  String? _fieldTaskId;
  String? get fieldTaskId => _$this._fieldTaskId;
  set fieldTaskId(String? fieldTaskId) => _$this._fieldTaskId = fieldTaskId;

  ServiceUnlockRequestBuilder() {
    ServiceUnlockRequest._defaults(this);
  }

  ServiceUnlockRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _fieldTaskId = $v.fieldTaskId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ServiceUnlockRequest other) {
    _$v = other as _$ServiceUnlockRequest;
  }

  @override
  void update(void Function(ServiceUnlockRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ServiceUnlockRequest build() => _build();

  _$ServiceUnlockRequest _build() {
    final _$result = _$v ??
        _$ServiceUnlockRequest._(
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'ServiceUnlockRequest', 'reason'),
          fieldTaskId: fieldTaskId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
