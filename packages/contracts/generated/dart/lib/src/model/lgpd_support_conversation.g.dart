// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lgpd_support_conversation.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$LgpdSupportConversation extends LgpdSupportConversation {
  @override
  final BuiltList<SupportMessage> messages;
  @override
  final String id;
  @override
  final String customerId;
  @override
  final String? customerName;
  @override
  final String? rentalId;
  @override
  final String subject;
  @override
  final ConversationStatus status;
  @override
  final int? unreadCount;
  @override
  final DateTime createdAt;
  @override
  final DateTime lastMessageAt;

  factory _$LgpdSupportConversation(
          [void Function(LgpdSupportConversationBuilder)? updates]) =>
      (LgpdSupportConversationBuilder()..update(updates))._build();

  _$LgpdSupportConversation._(
      {required this.messages,
      required this.id,
      required this.customerId,
      this.customerName,
      this.rentalId,
      required this.subject,
      required this.status,
      this.unreadCount,
      required this.createdAt,
      required this.lastMessageAt})
      : super._();
  @override
  LgpdSupportConversation rebuild(
          void Function(LgpdSupportConversationBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  LgpdSupportConversationBuilder toBuilder() =>
      LgpdSupportConversationBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is LgpdSupportConversation &&
        messages == other.messages &&
        id == other.id &&
        customerId == other.customerId &&
        customerName == other.customerName &&
        rentalId == other.rentalId &&
        subject == other.subject &&
        status == other.status &&
        unreadCount == other.unreadCount &&
        createdAt == other.createdAt &&
        lastMessageAt == other.lastMessageAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, messages.hashCode);
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, customerId.hashCode);
    _$hash = $jc(_$hash, customerName.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, subject.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, unreadCount.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, lastMessageAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'LgpdSupportConversation')
          ..add('messages', messages)
          ..add('id', id)
          ..add('customerId', customerId)
          ..add('customerName', customerName)
          ..add('rentalId', rentalId)
          ..add('subject', subject)
          ..add('status', status)
          ..add('unreadCount', unreadCount)
          ..add('createdAt', createdAt)
          ..add('lastMessageAt', lastMessageAt))
        .toString();
  }
}

class LgpdSupportConversationBuilder
    implements
        Builder<LgpdSupportConversation, LgpdSupportConversationBuilder>,
        SupportConversationBuilder {
  _$LgpdSupportConversation? _$v;

  ListBuilder<SupportMessage>? _messages;
  ListBuilder<SupportMessage> get messages =>
      _$this._messages ??= ListBuilder<SupportMessage>();
  set messages(covariant ListBuilder<SupportMessage>? messages) =>
      _$this._messages = messages;

  String? _id;
  String? get id => _$this._id;
  set id(covariant String? id) => _$this._id = id;

  String? _customerId;
  String? get customerId => _$this._customerId;
  set customerId(covariant String? customerId) =>
      _$this._customerId = customerId;

  String? _customerName;
  String? get customerName => _$this._customerName;
  set customerName(covariant String? customerName) =>
      _$this._customerName = customerName;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(covariant String? rentalId) => _$this._rentalId = rentalId;

  String? _subject;
  String? get subject => _$this._subject;
  set subject(covariant String? subject) => _$this._subject = subject;

  ConversationStatus? _status;
  ConversationStatus? get status => _$this._status;
  set status(covariant ConversationStatus? status) => _$this._status = status;

  int? _unreadCount;
  int? get unreadCount => _$this._unreadCount;
  set unreadCount(covariant int? unreadCount) =>
      _$this._unreadCount = unreadCount;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(covariant DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _lastMessageAt;
  DateTime? get lastMessageAt => _$this._lastMessageAt;
  set lastMessageAt(covariant DateTime? lastMessageAt) =>
      _$this._lastMessageAt = lastMessageAt;

  LgpdSupportConversationBuilder() {
    LgpdSupportConversation._defaults(this);
  }

  LgpdSupportConversationBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _messages = $v.messages.toBuilder();
      _id = $v.id;
      _customerId = $v.customerId;
      _customerName = $v.customerName;
      _rentalId = $v.rentalId;
      _subject = $v.subject;
      _status = $v.status;
      _unreadCount = $v.unreadCount;
      _createdAt = $v.createdAt;
      _lastMessageAt = $v.lastMessageAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(covariant LgpdSupportConversation other) {
    _$v = other as _$LgpdSupportConversation;
  }

  @override
  void update(void Function(LgpdSupportConversationBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  LgpdSupportConversation build() => _build();

  _$LgpdSupportConversation _build() {
    _$LgpdSupportConversation _$result;
    try {
      _$result = _$v ??
          _$LgpdSupportConversation._(
            messages: messages.build(),
            id: BuiltValueNullFieldError.checkNotNull(
                id, r'LgpdSupportConversation', 'id'),
            customerId: BuiltValueNullFieldError.checkNotNull(
                customerId, r'LgpdSupportConversation', 'customerId'),
            customerName: customerName,
            rentalId: rentalId,
            subject: BuiltValueNullFieldError.checkNotNull(
                subject, r'LgpdSupportConversation', 'subject'),
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'LgpdSupportConversation', 'status'),
            unreadCount: unreadCount,
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'LgpdSupportConversation', 'createdAt'),
            lastMessageAt: BuiltValueNullFieldError.checkNotNull(
                lastMessageAt, r'LgpdSupportConversation', 'lastMessageAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'messages';
        messages.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'LgpdSupportConversation', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
