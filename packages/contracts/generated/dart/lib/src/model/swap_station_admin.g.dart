// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'swap_station_admin.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SwapStationAdmin extends SwapStationAdmin {
  @override
  final String id;
  @override
  final String name;
  @override
  final String address;
  @override
  final double lat;
  @override
  final double lng;
  @override
  final int availableBatteries;
  @override
  final int totalSlots;
  @override
  final String openingHours;
  @override
  final bool open24h;
  @override
  final bool active;
  @override
  final String thingName;
  @override
  final int batteriesInStation;
  @override
  final int openSwaps;
  @override
  final BuiltList<String> depotIds;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  factory _$SwapStationAdmin(
          [void Function(SwapStationAdminBuilder)? updates]) =>
      (SwapStationAdminBuilder()..update(updates))._build();

  _$SwapStationAdmin._(
      {required this.id,
      required this.name,
      required this.address,
      required this.lat,
      required this.lng,
      required this.availableBatteries,
      required this.totalSlots,
      required this.openingHours,
      required this.open24h,
      required this.active,
      required this.thingName,
      required this.batteriesInStation,
      required this.openSwaps,
      required this.depotIds,
      required this.createdAt,
      required this.updatedAt})
      : super._();
  @override
  SwapStationAdmin rebuild(void Function(SwapStationAdminBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SwapStationAdminBuilder toBuilder() =>
      SwapStationAdminBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SwapStationAdmin &&
        id == other.id &&
        name == other.name &&
        address == other.address &&
        lat == other.lat &&
        lng == other.lng &&
        availableBatteries == other.availableBatteries &&
        totalSlots == other.totalSlots &&
        openingHours == other.openingHours &&
        open24h == other.open24h &&
        active == other.active &&
        thingName == other.thingName &&
        batteriesInStation == other.batteriesInStation &&
        openSwaps == other.openSwaps &&
        depotIds == other.depotIds &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, address.hashCode);
    _$hash = $jc(_$hash, lat.hashCode);
    _$hash = $jc(_$hash, lng.hashCode);
    _$hash = $jc(_$hash, availableBatteries.hashCode);
    _$hash = $jc(_$hash, totalSlots.hashCode);
    _$hash = $jc(_$hash, openingHours.hashCode);
    _$hash = $jc(_$hash, open24h.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jc(_$hash, thingName.hashCode);
    _$hash = $jc(_$hash, batteriesInStation.hashCode);
    _$hash = $jc(_$hash, openSwaps.hashCode);
    _$hash = $jc(_$hash, depotIds.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SwapStationAdmin')
          ..add('id', id)
          ..add('name', name)
          ..add('address', address)
          ..add('lat', lat)
          ..add('lng', lng)
          ..add('availableBatteries', availableBatteries)
          ..add('totalSlots', totalSlots)
          ..add('openingHours', openingHours)
          ..add('open24h', open24h)
          ..add('active', active)
          ..add('thingName', thingName)
          ..add('batteriesInStation', batteriesInStation)
          ..add('openSwaps', openSwaps)
          ..add('depotIds', depotIds)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class SwapStationAdminBuilder
    implements Builder<SwapStationAdmin, SwapStationAdminBuilder> {
  _$SwapStationAdmin? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _address;
  String? get address => _$this._address;
  set address(String? address) => _$this._address = address;

  double? _lat;
  double? get lat => _$this._lat;
  set lat(double? lat) => _$this._lat = lat;

  double? _lng;
  double? get lng => _$this._lng;
  set lng(double? lng) => _$this._lng = lng;

  int? _availableBatteries;
  int? get availableBatteries => _$this._availableBatteries;
  set availableBatteries(int? availableBatteries) =>
      _$this._availableBatteries = availableBatteries;

  int? _totalSlots;
  int? get totalSlots => _$this._totalSlots;
  set totalSlots(int? totalSlots) => _$this._totalSlots = totalSlots;

  String? _openingHours;
  String? get openingHours => _$this._openingHours;
  set openingHours(String? openingHours) => _$this._openingHours = openingHours;

  bool? _open24h;
  bool? get open24h => _$this._open24h;
  set open24h(bool? open24h) => _$this._open24h = open24h;

  bool? _active;
  bool? get active => _$this._active;
  set active(bool? active) => _$this._active = active;

  String? _thingName;
  String? get thingName => _$this._thingName;
  set thingName(String? thingName) => _$this._thingName = thingName;

  int? _batteriesInStation;
  int? get batteriesInStation => _$this._batteriesInStation;
  set batteriesInStation(int? batteriesInStation) =>
      _$this._batteriesInStation = batteriesInStation;

  int? _openSwaps;
  int? get openSwaps => _$this._openSwaps;
  set openSwaps(int? openSwaps) => _$this._openSwaps = openSwaps;

  ListBuilder<String>? _depotIds;
  ListBuilder<String> get depotIds =>
      _$this._depotIds ??= ListBuilder<String>();
  set depotIds(ListBuilder<String>? depotIds) => _$this._depotIds = depotIds;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  SwapStationAdminBuilder() {
    SwapStationAdmin._defaults(this);
  }

  SwapStationAdminBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _name = $v.name;
      _address = $v.address;
      _lat = $v.lat;
      _lng = $v.lng;
      _availableBatteries = $v.availableBatteries;
      _totalSlots = $v.totalSlots;
      _openingHours = $v.openingHours;
      _open24h = $v.open24h;
      _active = $v.active;
      _thingName = $v.thingName;
      _batteriesInStation = $v.batteriesInStation;
      _openSwaps = $v.openSwaps;
      _depotIds = $v.depotIds.toBuilder();
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SwapStationAdmin other) {
    _$v = other as _$SwapStationAdmin;
  }

  @override
  void update(void Function(SwapStationAdminBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SwapStationAdmin build() => _build();

  _$SwapStationAdmin _build() {
    _$SwapStationAdmin _$result;
    try {
      _$result = _$v ??
          _$SwapStationAdmin._(
            id: BuiltValueNullFieldError.checkNotNull(
                id, r'SwapStationAdmin', 'id'),
            name: BuiltValueNullFieldError.checkNotNull(
                name, r'SwapStationAdmin', 'name'),
            address: BuiltValueNullFieldError.checkNotNull(
                address, r'SwapStationAdmin', 'address'),
            lat: BuiltValueNullFieldError.checkNotNull(
                lat, r'SwapStationAdmin', 'lat'),
            lng: BuiltValueNullFieldError.checkNotNull(
                lng, r'SwapStationAdmin', 'lng'),
            availableBatteries: BuiltValueNullFieldError.checkNotNull(
                availableBatteries, r'SwapStationAdmin', 'availableBatteries'),
            totalSlots: BuiltValueNullFieldError.checkNotNull(
                totalSlots, r'SwapStationAdmin', 'totalSlots'),
            openingHours: BuiltValueNullFieldError.checkNotNull(
                openingHours, r'SwapStationAdmin', 'openingHours'),
            open24h: BuiltValueNullFieldError.checkNotNull(
                open24h, r'SwapStationAdmin', 'open24h'),
            active: BuiltValueNullFieldError.checkNotNull(
                active, r'SwapStationAdmin', 'active'),
            thingName: BuiltValueNullFieldError.checkNotNull(
                thingName, r'SwapStationAdmin', 'thingName'),
            batteriesInStation: BuiltValueNullFieldError.checkNotNull(
                batteriesInStation, r'SwapStationAdmin', 'batteriesInStation'),
            openSwaps: BuiltValueNullFieldError.checkNotNull(
                openSwaps, r'SwapStationAdmin', 'openSwaps'),
            depotIds: depotIds.build(),
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'SwapStationAdmin', 'createdAt'),
            updatedAt: BuiltValueNullFieldError.checkNotNull(
                updatedAt, r'SwapStationAdmin', 'updatedAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'depotIds';
        depotIds.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'SwapStationAdmin', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
