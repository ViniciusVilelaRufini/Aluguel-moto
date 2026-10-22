// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'handover_dispute.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$HandoverDispute extends HandoverDispute {
  @override
  final String reason;

  factory _$HandoverDispute([void Function(HandoverDisputeBuilder)? updates]) =>
      (HandoverDisputeBuilder()..update(updates))._build();

  _$HandoverDispute._({required this.reason}) : super._();
  @override
  HandoverDispute rebuild(void Function(HandoverDisputeBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  HandoverDisputeBuilder toBuilder() => HandoverDisputeBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is HandoverDispute && reason == other.reason;
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
    return (newBuiltValueToStringHelper(r'HandoverDispute')
          ..add('reason', reason))
        .toString();
  }
}

class HandoverDisputeBuilder
    implements Builder<HandoverDispute, HandoverDisputeBuilder> {
  _$HandoverDispute? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  HandoverDisputeBuilder() {
    HandoverDispute._defaults(this);
  }

  HandoverDisputeBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(HandoverDispute other) {
    _$v = other as _$HandoverDispute;
  }

  @override
  void update(void Function(HandoverDisputeBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  HandoverDispute build() => _build();

  _$HandoverDispute _build() {
    final _$result = _$v ??
        _$HandoverDispute._(
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'HandoverDispute', 'reason'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
