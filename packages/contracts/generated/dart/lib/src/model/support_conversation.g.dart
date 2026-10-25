// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'support_conversation.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

abstract class SupportConversationBuilder {
  void replace(SupportConversation other);
  void update(void Function(SupportConversationBuilder) updates);
  String? get id;
  set id(String? id);

  String? get customerId;
  set customerId(String? customerId);

  String? get customerName;
  set customerName(String? customerName);

  String? get rentalId;
  set rentalId(String? rentalId);

  String? get subject;
  set subject(String? subject);

  ConversationStatus? get status;
  set status(ConversationStatus? status);

  int? get unreadCount;
  set unreadCount(int? unreadCount);

  DateTime? get createdAt;
  set createdAt(DateTime? createdAt);

  DateTime? get lastMessageAt;
  set lastMessageAt(DateTime? lastMessageAt);
}

class _$$SupportConversation extends $SupportConversation {
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

  factory _$$SupportConversation(
          [void Function($SupportConversationBuilder)? updates]) =>
      ($SupportConversationBuilder()..update(updates))._build();

  _$$SupportConversation._(
      {required this.id,
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
  $SupportConversation rebuild(
          void Function($SupportConversationBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  $SupportConversationBuilder toBuilder() =>
      $SupportConversationBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is $SupportConversation &&
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
    return (newBuiltValueToStringHelper(r'$SupportConversation')
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

class $SupportConversationBuilder
    implements
        Builder<$SupportConversation, $SupportConversationBuilder>,
        SupportConversationBuilder {
  _$$SupportConversation? _$v;

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

  $SupportConversationBuilder() {
    $SupportConversation._defaults(this);
  }

  $SupportConversationBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
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
  void replace(covariant $SupportConversation other) {
    _$v = other as _$$SupportConversation;
  }

  @override
  void update(void Function($SupportConversationBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  $SupportConversation build() => _build();

  _$$SupportConversation _build() {
    final _$result = _$v ??
        _$$SupportConversation._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'$SupportConversation', 'id'),
          customerId: BuiltValueNullFieldError.checkNotNull(
              customerId, r'$SupportConversation', 'customerId'),
          customerName: customerName,
          rentalId: rentalId,
          subject: BuiltValueNullFieldError.checkNotNull(
              subject, r'$SupportConversation', 'subject'),
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'$SupportConversation', 'status'),
          unreadCount: unreadCount,
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'$SupportConversation', 'createdAt'),
          lastMessageAt: BuiltValueNullFieldError.checkNotNull(
              lastMessageAt, r'$SupportConversation', 'lastMessageAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
