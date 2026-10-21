// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rental_event.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$RentalEvent extends RentalEvent {
  @override
  final String id;
  @override
  final String rentalId;
  @override
  final RentalEventType type;
  @override
  final DateTime at;
  @override
  final ActorType actorType;
  @override
  final String? actorId;
  @override
  final String? message;
  @override
  final BuiltMap<String, JsonObject?>? data;

  factory _$RentalEvent([void Function(RentalEventBuilder)? updates]) =>
      (RentalEventBuilder()..update(updates))._build();

  _$RentalEvent._(
      {required this.id,
      required this.rentalId,
      required this.type,
      required this.at,
      required this.actorType,
      this.actorId,
      this.message,
      this.data})
      : super._();
  @override
  RentalEvent rebuild(void Function(RentalEventBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RentalEventBuilder toBuilder() => RentalEventBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is RentalEvent &&
        id == other.id &&
        rentalId == other.rentalId &&
        type == other.type &&
        at == other.at &&
        actorType == other.actorType &&
        actorId == other.actorId &&
        message == other.message &&
        data == other.data;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, at.hashCode);
    _$hash = $jc(_$hash, actorType.hashCode);
    _$hash = $jc(_$hash, actorId.hashCode);
    _$hash = $jc(_$hash, message.hashCode);
    _$hash = $jc(_$hash, data.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'RentalEvent')
          ..add('id', id)
          ..add('rentalId', rentalId)
          ..add('type', type)
          ..add('at', at)
          ..add('actorType', actorType)
          ..add('actorId', actorId)
          ..add('message', message)
          ..add('data', data))
        .toString();
  }
}

class RentalEventBuilder implements Builder<RentalEvent, RentalEventBuilder> {
  _$RentalEvent? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  RentalEventType? _type;
  RentalEventType? get type => _$this._type;
  set type(RentalEventType? type) => _$this._type = type;

  DateTime? _at;
  DateTime? get at => _$this._at;
  set at(DateTime? at) => _$this._at = at;

  ActorType? _actorType;
  ActorType? get actorType => _$this._actorType;
  set actorType(ActorType? actorType) => _$this._actorType = actorType;

  String? _actorId;
  String? get actorId => _$this._actorId;
  set actorId(String? actorId) => _$this._actorId = actorId;

  String? _message;
  String? get message => _$this._message;
  set message(String? message) => _$this._message = message;

  MapBuilder<String, JsonObject?>? _data;
  MapBuilder<String, JsonObject?> get data =>
      _$this._data ??= MapBuilder<String, JsonObject?>();
  set data(MapBuilder<String, JsonObject?>? data) => _$this._data = data;

  RentalEventBuilder() {
    RentalEvent._defaults(this);
  }

  RentalEventBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _rentalId = $v.rentalId;
      _type = $v.type;
      _at = $v.at;
      _actorType = $v.actorType;
      _actorId = $v.actorId;
      _message = $v.message;
      _data = $v.data?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(RentalEvent other) {
    _$v = other as _$RentalEvent;
  }

  @override
  void update(void Function(RentalEventBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  RentalEvent build() => _build();

  _$RentalEvent _build() {
    _$RentalEvent _$result;
    try {
      _$result = _$v ??
          _$RentalEvent._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'RentalEvent', 'id'),
            rentalId: BuiltValueNullFieldError.checkNotNull(
                rentalId, r'RentalEvent', 'rentalId'),
            type: BuiltValueNullFieldError.checkNotNull(
                type, r'RentalEvent', 'type'),
            at: BuiltValueNullFieldError.checkNotNull(at, r'RentalEvent', 'at'),
            actorType: BuiltValueNullFieldError.checkNotNull(
                actorType, r'RentalEvent', 'actorType'),
            actorId: actorId,
            message: message,
            data: _data?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'data';
        _data?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'RentalEvent', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
