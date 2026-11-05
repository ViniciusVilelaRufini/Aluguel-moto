// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tracker_device.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$TrackerDevice extends TrackerDevice {
  @override
  final String id;
  @override
  final String imei;
  @override
  final TrackerModel model;
  @override
  final bool installed;
  @override
  final String? vehicleId;
  @override
  final String? vehicleCode;
  @override
  final SimCardSummary? simCard;
  @override
  final bool online;
  @override
  final DateTime? lastSeenAt;
  @override
  final DateTime createdAt;

  factory _$TrackerDevice([void Function(TrackerDeviceBuilder)? updates]) =>
      (TrackerDeviceBuilder()..update(updates))._build();

  _$TrackerDevice._(
      {required this.id,
      required this.imei,
      required this.model,
      required this.installed,
      this.vehicleId,
      this.vehicleCode,
      this.simCard,
      required this.online,
      this.lastSeenAt,
      required this.createdAt})
      : super._();
  @override
  TrackerDevice rebuild(void Function(TrackerDeviceBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  TrackerDeviceBuilder toBuilder() => TrackerDeviceBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is TrackerDevice &&
        id == other.id &&
        imei == other.imei &&
        model == other.model &&
        installed == other.installed &&
        vehicleId == other.vehicleId &&
        vehicleCode == other.vehicleCode &&
        simCard == other.simCard &&
        online == other.online &&
        lastSeenAt == other.lastSeenAt &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, imei.hashCode);
    _$hash = $jc(_$hash, model.hashCode);
    _$hash = $jc(_$hash, installed.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, vehicleCode.hashCode);
    _$hash = $jc(_$hash, simCard.hashCode);
    _$hash = $jc(_$hash, online.hashCode);
    _$hash = $jc(_$hash, lastSeenAt.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'TrackerDevice')
          ..add('id', id)
          ..add('imei', imei)
          ..add('model', model)
          ..add('installed', installed)
          ..add('vehicleId', vehicleId)
          ..add('vehicleCode', vehicleCode)
          ..add('simCard', simCard)
          ..add('online', online)
          ..add('lastSeenAt', lastSeenAt)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class TrackerDeviceBuilder
    implements Builder<TrackerDevice, TrackerDeviceBuilder> {
  _$TrackerDevice? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _imei;
  String? get imei => _$this._imei;
  set imei(String? imei) => _$this._imei = imei;

  TrackerModel? _model;
  TrackerModel? get model => _$this._model;
  set model(TrackerModel? model) => _$this._model = model;

  bool? _installed;
  bool? get installed => _$this._installed;
  set installed(bool? installed) => _$this._installed = installed;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _vehicleCode;
  String? get vehicleCode => _$this._vehicleCode;
  set vehicleCode(String? vehicleCode) => _$this._vehicleCode = vehicleCode;

  SimCardSummaryBuilder? _simCard;
  SimCardSummaryBuilder get simCard =>
      _$this._simCard ??= SimCardSummaryBuilder();
  set simCard(SimCardSummaryBuilder? simCard) => _$this._simCard = simCard;

  bool? _online;
  bool? get online => _$this._online;
  set online(bool? online) => _$this._online = online;

  DateTime? _lastSeenAt;
  DateTime? get lastSeenAt => _$this._lastSeenAt;
  set lastSeenAt(DateTime? lastSeenAt) => _$this._lastSeenAt = lastSeenAt;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  TrackerDeviceBuilder() {
    TrackerDevice._defaults(this);
  }

  TrackerDeviceBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _imei = $v.imei;
      _model = $v.model;
      _installed = $v.installed;
      _vehicleId = $v.vehicleId;
      _vehicleCode = $v.vehicleCode;
      _simCard = $v.simCard?.toBuilder();
      _online = $v.online;
      _lastSeenAt = $v.lastSeenAt;
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(TrackerDevice other) {
    _$v = other as _$TrackerDevice;
  }

  @override
  void update(void Function(TrackerDeviceBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  TrackerDevice build() => _build();

  _$TrackerDevice _build() {
    _$TrackerDevice _$result;
    try {
      _$result = _$v ??
          _$TrackerDevice._(
            id: BuiltValueNullFieldError.checkNotNull(
                id, r'TrackerDevice', 'id'),
            imei: BuiltValueNullFieldError.checkNotNull(
                imei, r'TrackerDevice', 'imei'),
            model: BuiltValueNullFieldError.checkNotNull(
                model, r'TrackerDevice', 'model'),
            installed: BuiltValueNullFieldError.checkNotNull(
                installed, r'TrackerDevice', 'installed'),
            vehicleId: vehicleId,
            vehicleCode: vehicleCode,
            simCard: _simCard?.build(),
            online: BuiltValueNullFieldError.checkNotNull(
                online, r'TrackerDevice', 'online'),
            lastSeenAt: lastSeenAt,
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'TrackerDevice', 'createdAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'simCard';
        _simCard?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'TrackerDevice', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
