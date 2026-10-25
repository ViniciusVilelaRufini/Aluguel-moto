// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'support_message.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SupportMessage extends SupportMessage {
  @override
  final String id;
  @override
  final String conversationId;
  @override
  final MessageAuthorType authorType;
  @override
  final String? authorId;
  @override
  final String? authorName;
  @override
  final String body;
  @override
  final BuiltList<String>? attachmentObjectKeys;
  @override
  final BuiltList<String>? attachmentUrls;
  @override
  final SupportMessageStatus? status;
  @override
  final DateTime? deliveredAt;
  @override
  final DateTime? readAt;
  @override
  final DateTime createdAt;

  factory _$SupportMessage([void Function(SupportMessageBuilder)? updates]) =>
      (SupportMessageBuilder()..update(updates))._build();

  _$SupportMessage._(
      {required this.id,
      required this.conversationId,
      required this.authorType,
      this.authorId,
      this.authorName,
      required this.body,
      this.attachmentObjectKeys,
      this.attachmentUrls,
      this.status,
      this.deliveredAt,
      this.readAt,
      required this.createdAt})
      : super._();
  @override
  SupportMessage rebuild(void Function(SupportMessageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SupportMessageBuilder toBuilder() => SupportMessageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SupportMessage &&
        id == other.id &&
        conversationId == other.conversationId &&
        authorType == other.authorType &&
        authorId == other.authorId &&
        authorName == other.authorName &&
        body == other.body &&
        attachmentObjectKeys == other.attachmentObjectKeys &&
        attachmentUrls == other.attachmentUrls &&
        status == other.status &&
        deliveredAt == other.deliveredAt &&
        readAt == other.readAt &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, conversationId.hashCode);
    _$hash = $jc(_$hash, authorType.hashCode);
    _$hash = $jc(_$hash, authorId.hashCode);
    _$hash = $jc(_$hash, authorName.hashCode);
    _$hash = $jc(_$hash, body.hashCode);
    _$hash = $jc(_$hash, attachmentObjectKeys.hashCode);
    _$hash = $jc(_$hash, attachmentUrls.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, deliveredAt.hashCode);
    _$hash = $jc(_$hash, readAt.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SupportMessage')
          ..add('id', id)
          ..add('conversationId', conversationId)
          ..add('authorType', authorType)
          ..add('authorId', authorId)
          ..add('authorName', authorName)
          ..add('body', body)
          ..add('attachmentObjectKeys', attachmentObjectKeys)
          ..add('attachmentUrls', attachmentUrls)
          ..add('status', status)
          ..add('deliveredAt', deliveredAt)
          ..add('readAt', readAt)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class SupportMessageBuilder
    implements Builder<SupportMessage, SupportMessageBuilder> {
  _$SupportMessage? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _conversationId;
  String? get conversationId => _$this._conversationId;
  set conversationId(String? conversationId) =>
      _$this._conversationId = conversationId;

  MessageAuthorType? _authorType;
  MessageAuthorType? get authorType => _$this._authorType;
  set authorType(MessageAuthorType? authorType) =>
      _$this._authorType = authorType;

  String? _authorId;
  String? get authorId => _$this._authorId;
  set authorId(String? authorId) => _$this._authorId = authorId;

  String? _authorName;
  String? get authorName => _$this._authorName;
  set authorName(String? authorName) => _$this._authorName = authorName;

  String? _body;
  String? get body => _$this._body;
  set body(String? body) => _$this._body = body;

  ListBuilder<String>? _attachmentObjectKeys;
  ListBuilder<String> get attachmentObjectKeys =>
      _$this._attachmentObjectKeys ??= ListBuilder<String>();
  set attachmentObjectKeys(ListBuilder<String>? attachmentObjectKeys) =>
      _$this._attachmentObjectKeys = attachmentObjectKeys;

  ListBuilder<String>? _attachmentUrls;
  ListBuilder<String> get attachmentUrls =>
      _$this._attachmentUrls ??= ListBuilder<String>();
  set attachmentUrls(ListBuilder<String>? attachmentUrls) =>
      _$this._attachmentUrls = attachmentUrls;

  SupportMessageStatus? _status;
  SupportMessageStatus? get status => _$this._status;
  set status(SupportMessageStatus? status) => _$this._status = status;

  DateTime? _deliveredAt;
  DateTime? get deliveredAt => _$this._deliveredAt;
  set deliveredAt(DateTime? deliveredAt) => _$this._deliveredAt = deliveredAt;

  DateTime? _readAt;
  DateTime? get readAt => _$this._readAt;
  set readAt(DateTime? readAt) => _$this._readAt = readAt;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  SupportMessageBuilder() {
    SupportMessage._defaults(this);
  }

  SupportMessageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _conversationId = $v.conversationId;
      _authorType = $v.authorType;
      _authorId = $v.authorId;
      _authorName = $v.authorName;
      _body = $v.body;
      _attachmentObjectKeys = $v.attachmentObjectKeys?.toBuilder();
      _attachmentUrls = $v.attachmentUrls?.toBuilder();
      _status = $v.status;
      _deliveredAt = $v.deliveredAt;
      _readAt = $v.readAt;
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SupportMessage other) {
    _$v = other as _$SupportMessage;
  }

  @override
  void update(void Function(SupportMessageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SupportMessage build() => _build();

  _$SupportMessage _build() {
    _$SupportMessage _$result;
    try {
      _$result = _$v ??
          _$SupportMessage._(
            id: BuiltValueNullFieldError.checkNotNull(
                id, r'SupportMessage', 'id'),
            conversationId: BuiltValueNullFieldError.checkNotNull(
                conversationId, r'SupportMessage', 'conversationId'),
            authorType: BuiltValueNullFieldError.checkNotNull(
                authorType, r'SupportMessage', 'authorType'),
            authorId: authorId,
            authorName: authorName,
            body: BuiltValueNullFieldError.checkNotNull(
                body, r'SupportMessage', 'body'),
            attachmentObjectKeys: _attachmentObjectKeys?.build(),
            attachmentUrls: _attachmentUrls?.build(),
            status: status,
            deliveredAt: deliveredAt,
            readAt: readAt,
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'SupportMessage', 'createdAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'attachmentObjectKeys';
        _attachmentObjectKeys?.build();
        _$failedField = 'attachmentUrls';
        _attachmentUrls?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'SupportMessage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
