// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'alert_assign_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AlertAssignRequest extends AlertAssignRequest {
  @override
  final String assigneeId;

  factory _$AlertAssignRequest(
          [void Function(AlertAssignRequestBuilder)? updates]) =>
      (AlertAssignRequestBuilder()..update(updates))._build();

  _$AlertAssignRequest._({required this.assigneeId}) : super._();
  @override
  AlertAssignRequest rebuild(
          void Function(AlertAssignRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AlertAssignRequestBuilder toBuilder() =>
      AlertAssignRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AlertAssignRequest && assigneeId == other.assigneeId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, assigneeId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AlertAssignRequest')
          ..add('assigneeId', assigneeId))
        .toString();
  }
}

class AlertAssignRequestBuilder
    implements Builder<AlertAssignRequest, AlertAssignRequestBuilder> {
  _$AlertAssignRequest? _$v;

  String? _assigneeId;
  String? get assigneeId => _$this._assigneeId;
  set assigneeId(String? assigneeId) => _$this._assigneeId = assigneeId;

  AlertAssignRequestBuilder() {
    AlertAssignRequest._defaults(this);
  }

  AlertAssignRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _assigneeId = $v.assigneeId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AlertAssignRequest other) {
    _$v = other as _$AlertAssignRequest;
  }

  @override
  void update(void Function(AlertAssignRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AlertAssignRequest build() => _build();

  _$AlertAssignRequest _build() {
    final _$result = _$v ??
        _$AlertAssignRequest._(
          assigneeId: BuiltValueNullFieldError.checkNotNull(
              assigneeId, r'AlertAssignRequest', 'assigneeId'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
