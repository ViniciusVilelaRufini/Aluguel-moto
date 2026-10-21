// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'audit_log.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AuditLog extends AuditLog {
  @override
  final String id;
  @override
  final ActorType actorType;
  @override
  final String? actorId;
  @override
  final String? actorName;
  @override
  final String action;
  @override
  final String entityType;
  @override
  final String entityId;
  @override
  final String? reason;
  @override
  final BuiltMap<String, JsonObject?>? metadata;
  @override
  final DateTime createdAt;

  factory _$AuditLog([void Function(AuditLogBuilder)? updates]) =>
      (AuditLogBuilder()..update(updates))._build();

  _$AuditLog._(
      {required this.id,
      required this.actorType,
      this.actorId,
      this.actorName,
      required this.action,
      required this.entityType,
      required this.entityId,
      this.reason,
      this.metadata,
      required this.createdAt})
      : super._();
  @override
  AuditLog rebuild(void Function(AuditLogBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AuditLogBuilder toBuilder() => AuditLogBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AuditLog &&
        id == other.id &&
        actorType == other.actorType &&
        actorId == other.actorId &&
        actorName == other.actorName &&
        action == other.action &&
        entityType == other.entityType &&
        entityId == other.entityId &&
        reason == other.reason &&
        metadata == other.metadata &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, actorType.hashCode);
    _$hash = $jc(_$hash, actorId.hashCode);
    _$hash = $jc(_$hash, actorName.hashCode);
    _$hash = $jc(_$hash, action.hashCode);
    _$hash = $jc(_$hash, entityType.hashCode);
    _$hash = $jc(_$hash, entityId.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, metadata.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AuditLog')
          ..add('id', id)
          ..add('actorType', actorType)
          ..add('actorId', actorId)
          ..add('actorName', actorName)
          ..add('action', action)
          ..add('entityType', entityType)
          ..add('entityId', entityId)
          ..add('reason', reason)
          ..add('metadata', metadata)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class AuditLogBuilder implements Builder<AuditLog, AuditLogBuilder> {
  _$AuditLog? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  ActorType? _actorType;
  ActorType? get actorType => _$this._actorType;
  set actorType(ActorType? actorType) => _$this._actorType = actorType;

  String? _actorId;
  String? get actorId => _$this._actorId;
  set actorId(String? actorId) => _$this._actorId = actorId;

  String? _actorName;
  String? get actorName => _$this._actorName;
  set actorName(String? actorName) => _$this._actorName = actorName;

  String? _action;
  String? get action => _$this._action;
  set action(String? action) => _$this._action = action;

  String? _entityType;
  String? get entityType => _$this._entityType;
  set entityType(String? entityType) => _$this._entityType = entityType;

  String? _entityId;
  String? get entityId => _$this._entityId;
  set entityId(String? entityId) => _$this._entityId = entityId;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  MapBuilder<String, JsonObject?>? _metadata;
  MapBuilder<String, JsonObject?> get metadata =>
      _$this._metadata ??= MapBuilder<String, JsonObject?>();
  set metadata(MapBuilder<String, JsonObject?>? metadata) =>
      _$this._metadata = metadata;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  AuditLogBuilder() {
    AuditLog._defaults(this);
  }

  AuditLogBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _actorType = $v.actorType;
      _actorId = $v.actorId;
      _actorName = $v.actorName;
      _action = $v.action;
      _entityType = $v.entityType;
      _entityId = $v.entityId;
      _reason = $v.reason;
      _metadata = $v.metadata?.toBuilder();
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AuditLog other) {
    _$v = other as _$AuditLog;
  }

  @override
  void update(void Function(AuditLogBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AuditLog build() => _build();

  _$AuditLog _build() {
    _$AuditLog _$result;
    try {
      _$result = _$v ??
          _$AuditLog._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'AuditLog', 'id'),
            actorType: BuiltValueNullFieldError.checkNotNull(
                actorType, r'AuditLog', 'actorType'),
            actorId: actorId,
            actorName: actorName,
            action: BuiltValueNullFieldError.checkNotNull(
                action, r'AuditLog', 'action'),
            entityType: BuiltValueNullFieldError.checkNotNull(
                entityType, r'AuditLog', 'entityType'),
            entityId: BuiltValueNullFieldError.checkNotNull(
                entityId, r'AuditLog', 'entityId'),
            reason: reason,
            metadata: _metadata?.build(),
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'AuditLog', 'createdAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'metadata';
        _metadata?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AuditLog', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
