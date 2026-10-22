// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'handover_cancel.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$HandoverCancel extends HandoverCancel {
  @override
  final String reason;

  factory _$HandoverCancel([void Function(HandoverCancelBuilder)? updates]) =>
      (HandoverCancelBuilder()..update(updates))._build();

  _$HandoverCancel._({required this.reason}) : super._();
  @override
  HandoverCancel rebuild(void Function(HandoverCancelBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  HandoverCancelBuilder toBuilder() => HandoverCancelBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is HandoverCancel && reason == other.reason;
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
    return (newBuiltValueToStringHelper(r'HandoverCancel')
          ..add('reason', reason))
        .toString();
  }
}

class HandoverCancelBuilder
    implements Builder<HandoverCancel, HandoverCancelBuilder> {
  _$HandoverCancel? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  HandoverCancelBuilder() {
    HandoverCancel._defaults(this);
  }

  HandoverCancelBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(HandoverCancel other) {
    _$v = other as _$HandoverCancel;
  }

  @override
  void update(void Function(HandoverCancelBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  HandoverCancel build() => _build();

  _$HandoverCancel _build() {
    final _$result = _$v ??
        _$HandoverCancel._(
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'HandoverCancel', 'reason'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
