// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'mercado_pago_webhook_event.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$MercadoPagoWebhookEvent extends MercadoPagoWebhookEvent {
  @override
  final int? id;
  @override
  final String type;
  @override
  final String? action;
  @override
  final bool? liveMode;
  @override
  final DateTime? dateCreated;
  @override
  final int? userId;
  @override
  final String? apiVersion;
  @override
  final MercadoPagoWebhookData data;

  factory _$MercadoPagoWebhookEvent(
          [void Function(MercadoPagoWebhookEventBuilder)? updates]) =>
      (MercadoPagoWebhookEventBuilder()..update(updates))._build();

  _$MercadoPagoWebhookEvent._(
      {this.id,
      required this.type,
      this.action,
      this.liveMode,
      this.dateCreated,
      this.userId,
      this.apiVersion,
      required this.data})
      : super._();
  @override
  MercadoPagoWebhookEvent rebuild(
          void Function(MercadoPagoWebhookEventBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  MercadoPagoWebhookEventBuilder toBuilder() =>
      MercadoPagoWebhookEventBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is MercadoPagoWebhookEvent &&
        id == other.id &&
        type == other.type &&
        action == other.action &&
        liveMode == other.liveMode &&
        dateCreated == other.dateCreated &&
        userId == other.userId &&
        apiVersion == other.apiVersion &&
        data == other.data;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, action.hashCode);
    _$hash = $jc(_$hash, liveMode.hashCode);
    _$hash = $jc(_$hash, dateCreated.hashCode);
    _$hash = $jc(_$hash, userId.hashCode);
    _$hash = $jc(_$hash, apiVersion.hashCode);
    _$hash = $jc(_$hash, data.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'MercadoPagoWebhookEvent')
          ..add('id', id)
          ..add('type', type)
          ..add('action', action)
          ..add('liveMode', liveMode)
          ..add('dateCreated', dateCreated)
          ..add('userId', userId)
          ..add('apiVersion', apiVersion)
          ..add('data', data))
        .toString();
  }
}

class MercadoPagoWebhookEventBuilder
    implements
        Builder<MercadoPagoWebhookEvent, MercadoPagoWebhookEventBuilder> {
  _$MercadoPagoWebhookEvent? _$v;

  int? _id;
  int? get id => _$this._id;
  set id(int? id) => _$this._id = id;

  String? _type;
  String? get type => _$this._type;
  set type(String? type) => _$this._type = type;

  String? _action;
  String? get action => _$this._action;
  set action(String? action) => _$this._action = action;

  bool? _liveMode;
  bool? get liveMode => _$this._liveMode;
  set liveMode(bool? liveMode) => _$this._liveMode = liveMode;

  DateTime? _dateCreated;
  DateTime? get dateCreated => _$this._dateCreated;
  set dateCreated(DateTime? dateCreated) => _$this._dateCreated = dateCreated;

  int? _userId;
  int? get userId => _$this._userId;
  set userId(int? userId) => _$this._userId = userId;

  String? _apiVersion;
  String? get apiVersion => _$this._apiVersion;
  set apiVersion(String? apiVersion) => _$this._apiVersion = apiVersion;

  MercadoPagoWebhookDataBuilder? _data;
  MercadoPagoWebhookDataBuilder get data =>
      _$this._data ??= MercadoPagoWebhookDataBuilder();
  set data(MercadoPagoWebhookDataBuilder? data) => _$this._data = data;

  MercadoPagoWebhookEventBuilder() {
    MercadoPagoWebhookEvent._defaults(this);
  }

  MercadoPagoWebhookEventBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _type = $v.type;
      _action = $v.action;
      _liveMode = $v.liveMode;
      _dateCreated = $v.dateCreated;
      _userId = $v.userId;
      _apiVersion = $v.apiVersion;
      _data = $v.data.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(MercadoPagoWebhookEvent other) {
    _$v = other as _$MercadoPagoWebhookEvent;
  }

  @override
  void update(void Function(MercadoPagoWebhookEventBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  MercadoPagoWebhookEvent build() => _build();

  _$MercadoPagoWebhookEvent _build() {
    _$MercadoPagoWebhookEvent _$result;
    try {
      _$result = _$v ??
          _$MercadoPagoWebhookEvent._(
            id: id,
            type: BuiltValueNullFieldError.checkNotNull(
                type, r'MercadoPagoWebhookEvent', 'type'),
            action: action,
            liveMode: liveMode,
            dateCreated: dateCreated,
            userId: userId,
            apiVersion: apiVersion,
            data: data.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'data';
        data.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'MercadoPagoWebhookEvent', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
