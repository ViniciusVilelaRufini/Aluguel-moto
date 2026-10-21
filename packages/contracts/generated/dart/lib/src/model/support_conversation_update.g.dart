// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'support_conversation_update.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SupportConversationUpdate extends SupportConversationUpdate {
  @override
  final ConversationStatus status;

  factory _$SupportConversationUpdate(
          [void Function(SupportConversationUpdateBuilder)? updates]) =>
      (SupportConversationUpdateBuilder()..update(updates))._build();

  _$SupportConversationUpdate._({required this.status}) : super._();
  @override
  SupportConversationUpdate rebuild(
          void Function(SupportConversationUpdateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SupportConversationUpdateBuilder toBuilder() =>
      SupportConversationUpdateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SupportConversationUpdate && status == other.status;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SupportConversationUpdate')
          ..add('status', status))
        .toString();
  }
}

class SupportConversationUpdateBuilder
    implements
        Builder<SupportConversationUpdate, SupportConversationUpdateBuilder> {
  _$SupportConversationUpdate? _$v;

  ConversationStatus? _status;
  ConversationStatus? get status => _$this._status;
  set status(ConversationStatus? status) => _$this._status = status;

  SupportConversationUpdateBuilder() {
    SupportConversationUpdate._defaults(this);
  }

  SupportConversationUpdateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SupportConversationUpdate other) {
    _$v = other as _$SupportConversationUpdate;
  }

  @override
  void update(void Function(SupportConversationUpdateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SupportConversationUpdate build() => _build();

  _$SupportConversationUpdate _build() {
    final _$result = _$v ??
        _$SupportConversationUpdate._(
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'SupportConversationUpdate', 'status'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
