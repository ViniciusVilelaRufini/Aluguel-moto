// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'send_tracker_console_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SendTrackerConsoleRequest extends SendTrackerConsoleRequest {
  @override
  final String text;
  @override
  final bool? confirm;

  factory _$SendTrackerConsoleRequest(
          [void Function(SendTrackerConsoleRequestBuilder)? updates]) =>
      (SendTrackerConsoleRequestBuilder()..update(updates))._build();

  _$SendTrackerConsoleRequest._({required this.text, this.confirm}) : super._();
  @override
  SendTrackerConsoleRequest rebuild(
          void Function(SendTrackerConsoleRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SendTrackerConsoleRequestBuilder toBuilder() =>
      SendTrackerConsoleRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SendTrackerConsoleRequest &&
        text == other.text &&
        confirm == other.confirm;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, text.hashCode);
    _$hash = $jc(_$hash, confirm.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SendTrackerConsoleRequest')
          ..add('text', text)
          ..add('confirm', confirm))
        .toString();
  }
}

class SendTrackerConsoleRequestBuilder
    implements
        Builder<SendTrackerConsoleRequest, SendTrackerConsoleRequestBuilder> {
  _$SendTrackerConsoleRequest? _$v;

  String? _text;
  String? get text => _$this._text;
  set text(String? text) => _$this._text = text;

  bool? _confirm;
  bool? get confirm => _$this._confirm;
  set confirm(bool? confirm) => _$this._confirm = confirm;

  SendTrackerConsoleRequestBuilder() {
    SendTrackerConsoleRequest._defaults(this);
  }

  SendTrackerConsoleRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _text = $v.text;
      _confirm = $v.confirm;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SendTrackerConsoleRequest other) {
    _$v = other as _$SendTrackerConsoleRequest;
  }

  @override
  void update(void Function(SendTrackerConsoleRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SendTrackerConsoleRequest build() => _build();

  _$SendTrackerConsoleRequest _build() {
    final _$result = _$v ??
        _$SendTrackerConsoleRequest._(
          text: BuiltValueNullFieldError.checkNotNull(
              text, r'SendTrackerConsoleRequest', 'text'),
          confirm: confirm,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
