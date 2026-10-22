// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Vehicle extends Vehicle {
  @override
  final String id;
  @override
  final String code;
  @override
  final String? qrCode;
  @override
  final String model;
  @override
  final VehicleStatus status;
  @override
  final double lat;
  @override
  final double lng;
  @override
  final int batteryPct;
  @override
  final double estimatedRangeKm;
  @override
  final int speedLimitKmh;
  @override
  final String? thingName;
  @override
  final String? trackerId;
  @override
  final String? batterySerial;
  @override
  final bool? online;
  @override
  final bool? locked;
  @override
  final bool? ignition;
  @override
  final double? speedKmh;
  @override
  final int? signal;
  @override
  final bool? stolenMode;
  @override
  final String? firmwareVersion;
  @override
  final DateTime? lastSeenAt;
  @override
  final String? currentRentalId;
  @override
  final String? vehicleModelId;
  @override
  final String? categoryLabel;
  @override
  final int? pricePerMinuteCents;
  @override
  final String? address;
  @override
  final DateTime? addressUpdatedAt;
  @override
  final double? odometerKm;
  @override
  final double? usageHours;
  @override
  final VehicleServiceInfo? service;
  @override
  final Battery? battery;
  @override
  final String? assignedSubscriptionId;
  @override
  final DateTime? createdAt;
  @override
  final DateTime? updatedAt;

  factory _$Vehicle([void Function(VehicleBuilder)? updates]) =>
      (VehicleBuilder()..update(updates))._build();

  _$Vehicle._(
      {required this.id,
      required this.code,
      this.qrCode,
      required this.model,
      required this.status,
      required this.lat,
      required this.lng,
      required this.batteryPct,
      required this.estimatedRangeKm,
      required this.speedLimitKmh,
      this.thingName,
      this.trackerId,
      this.batterySerial,
      this.online,
      this.locked,
      this.ignition,
      this.speedKmh,
      this.signal,
      this.stolenMode,
      this.firmwareVersion,
      this.lastSeenAt,
      this.currentRentalId,
      this.vehicleModelId,
      this.categoryLabel,
      this.pricePerMinuteCents,
      this.address,
      this.addressUpdatedAt,
      this.odometerKm,
      this.usageHours,
      this.service,
      this.battery,
      this.assignedSubscriptionId,
      this.createdAt,
      this.updatedAt})
      : super._();
  @override
  Vehicle rebuild(void Function(VehicleBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleBuilder toBuilder() => VehicleBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Vehicle &&
        id == other.id &&
        code == other.code &&
        qrCode == other.qrCode &&
        model == other.model &&
        status == other.status &&
        lat == other.lat &&
        lng == other.lng &&
        batteryPct == other.batteryPct &&
        estimatedRangeKm == other.estimatedRangeKm &&
        speedLimitKmh == other.speedLimitKmh &&
        thingName == other.thingName &&
        trackerId == other.trackerId &&
        batterySerial == other.batterySerial &&
        online == other.online &&
        locked == other.locked &&
        ignition == other.ignition &&
        speedKmh == other.speedKmh &&
        signal == other.signal &&
        stolenMode == other.stolenMode &&
        firmwareVersion == other.firmwareVersion &&
        lastSeenAt == other.lastSeenAt &&
        currentRentalId == other.currentRentalId &&
        vehicleModelId == other.vehicleModelId &&
        categoryLabel == other.categoryLabel &&
        pricePerMinuteCents == other.pricePerMinuteCents &&
        address == other.address &&
        addressUpdatedAt == other.addressUpdatedAt &&
        odometerKm == other.odometerKm &&
        usageHours == other.usageHours &&
        service == other.service &&
        battery == other.battery &&
        assignedSubscriptionId == other.assignedSubscriptionId &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jc(_$hash, qrCode.hashCode);
    _$hash = $jc(_$hash, model.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, lat.hashCode);
    _$hash = $jc(_$hash, lng.hashCode);
    _$hash = $jc(_$hash, batteryPct.hashCode);
    _$hash = $jc(_$hash, estimatedRangeKm.hashCode);
    _$hash = $jc(_$hash, speedLimitKmh.hashCode);
    _$hash = $jc(_$hash, thingName.hashCode);
    _$hash = $jc(_$hash, trackerId.hashCode);
    _$hash = $jc(_$hash, batterySerial.hashCode);
    _$hash = $jc(_$hash, online.hashCode);
    _$hash = $jc(_$hash, locked.hashCode);
    _$hash = $jc(_$hash, ignition.hashCode);
    _$hash = $jc(_$hash, speedKmh.hashCode);
    _$hash = $jc(_$hash, signal.hashCode);
    _$hash = $jc(_$hash, stolenMode.hashCode);
    _$hash = $jc(_$hash, firmwareVersion.hashCode);
    _$hash = $jc(_$hash, lastSeenAt.hashCode);
    _$hash = $jc(_$hash, currentRentalId.hashCode);
    _$hash = $jc(_$hash, vehicleModelId.hashCode);
    _$hash = $jc(_$hash, categoryLabel.hashCode);
    _$hash = $jc(_$hash, pricePerMinuteCents.hashCode);
    _$hash = $jc(_$hash, address.hashCode);
    _$hash = $jc(_$hash, addressUpdatedAt.hashCode);
    _$hash = $jc(_$hash, odometerKm.hashCode);
    _$hash = $jc(_$hash, usageHours.hashCode);
    _$hash = $jc(_$hash, service.hashCode);
    _$hash = $jc(_$hash, battery.hashCode);
    _$hash = $jc(_$hash, assignedSubscriptionId.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Vehicle')
          ..add('id', id)
          ..add('code', code)
          ..add('qrCode', qrCode)
          ..add('model', model)
          ..add('status', status)
          ..add('lat', lat)
          ..add('lng', lng)
          ..add('batteryPct', batteryPct)
          ..add('estimatedRangeKm', estimatedRangeKm)
          ..add('speedLimitKmh', speedLimitKmh)
          ..add('thingName', thingName)
          ..add('trackerId', trackerId)
          ..add('batterySerial', batterySerial)
          ..add('online', online)
          ..add('locked', locked)
          ..add('ignition', ignition)
          ..add('speedKmh', speedKmh)
          ..add('signal', signal)
          ..add('stolenMode', stolenMode)
          ..add('firmwareVersion', firmwareVersion)
          ..add('lastSeenAt', lastSeenAt)
          ..add('currentRentalId', currentRentalId)
          ..add('vehicleModelId', vehicleModelId)
          ..add('categoryLabel', categoryLabel)
          ..add('pricePerMinuteCents', pricePerMinuteCents)
          ..add('address', address)
          ..add('addressUpdatedAt', addressUpdatedAt)
          ..add('odometerKm', odometerKm)
          ..add('usageHours', usageHours)
          ..add('service', service)
          ..add('battery', battery)
          ..add('assignedSubscriptionId', assignedSubscriptionId)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class VehicleBuilder implements Builder<Vehicle, VehicleBuilder> {
  _$Vehicle? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _code;
  String? get code => _$this._code;
  set code(String? code) => _$this._code = code;

  String? _qrCode;
  String? get qrCode => _$this._qrCode;
  set qrCode(String? qrCode) => _$this._qrCode = qrCode;

  String? _model;
  String? get model => _$this._model;
  set model(String? model) => _$this._model = model;

  VehicleStatus? _status;
  VehicleStatus? get status => _$this._status;
  set status(VehicleStatus? status) => _$this._status = status;

  double? _lat;
  double? get lat => _$this._lat;
  set lat(double? lat) => _$this._lat = lat;

  double? _lng;
  double? get lng => _$this._lng;
  set lng(double? lng) => _$this._lng = lng;

  int? _batteryPct;
  int? get batteryPct => _$this._batteryPct;
  set batteryPct(int? batteryPct) => _$this._batteryPct = batteryPct;

  double? _estimatedRangeKm;
  double? get estimatedRangeKm => _$this._estimatedRangeKm;
  set estimatedRangeKm(double? estimatedRangeKm) =>
      _$this._estimatedRangeKm = estimatedRangeKm;

  int? _speedLimitKmh;
  int? get speedLimitKmh => _$this._speedLimitKmh;
  set speedLimitKmh(int? speedLimitKmh) =>
      _$this._speedLimitKmh = speedLimitKmh;

  String? _thingName;
  String? get thingName => _$this._thingName;
  set thingName(String? thingName) => _$this._thingName = thingName;

  String? _trackerId;
  String? get trackerId => _$this._trackerId;
  set trackerId(String? trackerId) => _$this._trackerId = trackerId;

  String? _batterySerial;
  String? get batterySerial => _$this._batterySerial;
  set batterySerial(String? batterySerial) =>
      _$this._batterySerial = batterySerial;

  bool? _online;
  bool? get online => _$this._online;
  set online(bool? online) => _$this._online = online;

  bool? _locked;
  bool? get locked => _$this._locked;
  set locked(bool? locked) => _$this._locked = locked;

  bool? _ignition;
  bool? get ignition => _$this._ignition;
  set ignition(bool? ignition) => _$this._ignition = ignition;

  double? _speedKmh;
  double? get speedKmh => _$this._speedKmh;
  set speedKmh(double? speedKmh) => _$this._speedKmh = speedKmh;

  int? _signal;
  int? get signal => _$this._signal;
  set signal(int? signal) => _$this._signal = signal;

  bool? _stolenMode;
  bool? get stolenMode => _$this._stolenMode;
  set stolenMode(bool? stolenMode) => _$this._stolenMode = stolenMode;

  String? _firmwareVersion;
  String? get firmwareVersion => _$this._firmwareVersion;
  set firmwareVersion(String? firmwareVersion) =>
      _$this._firmwareVersion = firmwareVersion;

  DateTime? _lastSeenAt;
  DateTime? get lastSeenAt => _$this._lastSeenAt;
  set lastSeenAt(DateTime? lastSeenAt) => _$this._lastSeenAt = lastSeenAt;

  String? _currentRentalId;
  String? get currentRentalId => _$this._currentRentalId;
  set currentRentalId(String? currentRentalId) =>
      _$this._currentRentalId = currentRentalId;

  String? _vehicleModelId;
  String? get vehicleModelId => _$this._vehicleModelId;
  set vehicleModelId(String? vehicleModelId) =>
      _$this._vehicleModelId = vehicleModelId;

  String? _categoryLabel;
  String? get categoryLabel => _$this._categoryLabel;
  set categoryLabel(String? categoryLabel) =>
      _$this._categoryLabel = categoryLabel;

  int? _pricePerMinuteCents;
  int? get pricePerMinuteCents => _$this._pricePerMinuteCents;
  set pricePerMinuteCents(int? pricePerMinuteCents) =>
      _$this._pricePerMinuteCents = pricePerMinuteCents;

  String? _address;
  String? get address => _$this._address;
  set address(String? address) => _$this._address = address;

  DateTime? _addressUpdatedAt;
  DateTime? get addressUpdatedAt => _$this._addressUpdatedAt;
  set addressUpdatedAt(DateTime? addressUpdatedAt) =>
      _$this._addressUpdatedAt = addressUpdatedAt;

  double? _odometerKm;
  double? get odometerKm => _$this._odometerKm;
  set odometerKm(double? odometerKm) => _$this._odometerKm = odometerKm;

  double? _usageHours;
  double? get usageHours => _$this._usageHours;
  set usageHours(double? usageHours) => _$this._usageHours = usageHours;

  VehicleServiceInfoBuilder? _service;
  VehicleServiceInfoBuilder get service =>
      _$this._service ??= VehicleServiceInfoBuilder();
  set service(VehicleServiceInfoBuilder? service) => _$this._service = service;

  BatteryBuilder? _battery;
  BatteryBuilder get battery => _$this._battery ??= BatteryBuilder();
  set battery(BatteryBuilder? battery) => _$this._battery = battery;

  String? _assignedSubscriptionId;
  String? get assignedSubscriptionId => _$this._assignedSubscriptionId;
  set assignedSubscriptionId(String? assignedSubscriptionId) =>
      _$this._assignedSubscriptionId = assignedSubscriptionId;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  VehicleBuilder() {
    Vehicle._defaults(this);
  }

  VehicleBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _code = $v.code;
      _qrCode = $v.qrCode;
      _model = $v.model;
      _status = $v.status;
      _lat = $v.lat;
      _lng = $v.lng;
      _batteryPct = $v.batteryPct;
      _estimatedRangeKm = $v.estimatedRangeKm;
      _speedLimitKmh = $v.speedLimitKmh;
      _thingName = $v.thingName;
      _trackerId = $v.trackerId;
      _batterySerial = $v.batterySerial;
      _online = $v.online;
      _locked = $v.locked;
      _ignition = $v.ignition;
      _speedKmh = $v.speedKmh;
      _signal = $v.signal;
      _stolenMode = $v.stolenMode;
      _firmwareVersion = $v.firmwareVersion;
      _lastSeenAt = $v.lastSeenAt;
      _currentRentalId = $v.currentRentalId;
      _vehicleModelId = $v.vehicleModelId;
      _categoryLabel = $v.categoryLabel;
      _pricePerMinuteCents = $v.pricePerMinuteCents;
      _address = $v.address;
      _addressUpdatedAt = $v.addressUpdatedAt;
      _odometerKm = $v.odometerKm;
      _usageHours = $v.usageHours;
      _service = $v.service?.toBuilder();
      _battery = $v.battery?.toBuilder();
      _assignedSubscriptionId = $v.assignedSubscriptionId;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Vehicle other) {
    _$v = other as _$Vehicle;
  }

  @override
  void update(void Function(VehicleBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Vehicle build() => _build();

  _$Vehicle _build() {
    _$Vehicle _$result;
    try {
      _$result = _$v ??
          _$Vehicle._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'Vehicle', 'id'),
            code:
                BuiltValueNullFieldError.checkNotNull(code, r'Vehicle', 'code'),
            qrCode: qrCode,
            model: BuiltValueNullFieldError.checkNotNull(
                model, r'Vehicle', 'model'),
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'Vehicle', 'status'),
            lat: BuiltValueNullFieldError.checkNotNull(lat, r'Vehicle', 'lat'),
            lng: BuiltValueNullFieldError.checkNotNull(lng, r'Vehicle', 'lng'),
            batteryPct: BuiltValueNullFieldError.checkNotNull(
                batteryPct, r'Vehicle', 'batteryPct'),
            estimatedRangeKm: BuiltValueNullFieldError.checkNotNull(
                estimatedRangeKm, r'Vehicle', 'estimatedRangeKm'),
            speedLimitKmh: BuiltValueNullFieldError.checkNotNull(
                speedLimitKmh, r'Vehicle', 'speedLimitKmh'),
            thingName: thingName,
            trackerId: trackerId,
            batterySerial: batterySerial,
            online: online,
            locked: locked,
            ignition: ignition,
            speedKmh: speedKmh,
            signal: signal,
            stolenMode: stolenMode,
            firmwareVersion: firmwareVersion,
            lastSeenAt: lastSeenAt,
            currentRentalId: currentRentalId,
            vehicleModelId: vehicleModelId,
            categoryLabel: categoryLabel,
            pricePerMinuteCents: pricePerMinuteCents,
            address: address,
            addressUpdatedAt: addressUpdatedAt,
            odometerKm: odometerKm,
            usageHours: usageHours,
            service: _service?.build(),
            battery: _battery?.build(),
            assignedSubscriptionId: assignedSubscriptionId,
            createdAt: createdAt,
            updatedAt: updatedAt,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'service';
        _service?.build();
        _$failedField = 'battery';
        _battery?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'Vehicle', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
