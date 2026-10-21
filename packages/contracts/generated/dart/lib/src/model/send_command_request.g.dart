// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'send_command_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SendCommandRequest extends SendCommandRequest {
  @override
  final CommandType type;
  @override
  final String reason;
  @override
  final int? speedLimitKmh;
  @override
  final bool? on_;

  factory _$SendCommandRequest(
          [void Function(SendCommandRequestBuilder)? updates]) =>
      (SendCommandRequestBuilder()..update(updates))._build();

  _$SendCommandRequest._(
      {required this.type, required this.reason, this.speedLimitKmh, this.on_})
      : super._();
  @override
  SendCommandRequest rebuild(
          void Function(SendCommandRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SendCommandRequestBuilder toBuilder() =>
      SendCommandRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SendCommandRequest &&
        type == other.type &&
        reason == other.reason &&
        speedLimitKmh == other.speedLimitKmh &&
        on_ == other.on_;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, speedLimitKmh.hashCode);
    _$hash = $jc(_$hash, on_.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SendCommandRequest')
          ..add('type', type)
          ..add('reason', reason)
          ..add('speedLimitKmh', speedLimitKmh)
          ..add('on_', on_))
        .toString();
  }
}

class SendCommandRequestBuilder
    implements Builder<SendCommandRequest, SendCommandRequestBuilder> {
  _$SendCommandRequest? _$v;

  CommandType? _type;
  CommandType? get type => _$this._type;
  set type(CommandType? type) => _$this._type = type;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  int? _speedLimitKmh;
  int? get speedLimitKmh => _$this._speedLimitKmh;
  set speedLimitKmh(int? speedLimitKmh) =>
      _$this._speedLimitKmh = speedLimitKmh;

  bool? _on_;
  bool? get on_ => _$this._on_;
  set on_(bool? on_) => _$this._on_ = on_;

  SendCommandRequestBuilder() {
    SendCommandRequest._defaults(this);
  }

  SendCommandRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _type = $v.type;
      _reason = $v.reason;
      _speedLimitKmh = $v.speedLimitKmh;
      _on_ = $v.on_;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SendCommandRequest other) {
    _$v = other as _$SendCommandRequest;
  }

  @override
  void update(void Function(SendCommandRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SendCommandRequest build() => _build();

  _$SendCommandRequest _build() {
    final _$result = _$v ??
        _$SendCommandRequest._(
          type: BuiltValueNullFieldError.checkNotNull(
              type, r'SendCommandRequest', 'type'),
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'SendCommandRequest', 'reason'),
          speedLimitKmh: speedLimitKmh,
          on_: on_,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
