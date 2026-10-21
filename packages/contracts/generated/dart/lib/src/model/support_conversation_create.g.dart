// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'support_conversation_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SupportConversationCreate extends SupportConversationCreate {
  @override
  final String subject;
  @override
  final String message;
  @override
  final String? rentalId;

  factory _$SupportConversationCreate(
          [void Function(SupportConversationCreateBuilder)? updates]) =>
      (SupportConversationCreateBuilder()..update(updates))._build();

  _$SupportConversationCreate._(
      {required this.subject, required this.message, this.rentalId})
      : super._();
  @override
  SupportConversationCreate rebuild(
          void Function(SupportConversationCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SupportConversationCreateBuilder toBuilder() =>
      SupportConversationCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SupportConversationCreate &&
        subject == other.subject &&
        message == other.message &&
        rentalId == other.rentalId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, subject.hashCode);
    _$hash = $jc(_$hash, message.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SupportConversationCreate')
          ..add('subject', subject)
          ..add('message', message)
          ..add('rentalId', rentalId))
        .toString();
  }
}

class SupportConversationCreateBuilder
    implements
        Builder<SupportConversationCreate, SupportConversationCreateBuilder> {
  _$SupportConversationCreate? _$v;

  String? _subject;
  String? get subject => _$this._subject;
  set subject(String? subject) => _$this._subject = subject;

  String? _message;
  String? get message => _$this._message;
  set message(String? message) => _$this._message = message;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  SupportConversationCreateBuilder() {
    SupportConversationCreate._defaults(this);
  }

  SupportConversationCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _subject = $v.subject;
      _message = $v.message;
      _rentalId = $v.rentalId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SupportConversationCreate other) {
    _$v = other as _$SupportConversationCreate;
  }

  @override
  void update(void Function(SupportConversationCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SupportConversationCreate build() => _build();

  _$SupportConversationCreate _build() {
    final _$result = _$v ??
        _$SupportConversationCreate._(
          subject: BuiltValueNullFieldError.checkNotNull(
              subject, r'SupportConversationCreate', 'subject'),
          message: BuiltValueNullFieldError.checkNotNull(
              message, r'SupportConversationCreate', 'message'),
          rentalId: rentalId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
