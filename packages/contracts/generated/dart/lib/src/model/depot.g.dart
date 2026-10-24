// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'depot.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Depot extends Depot {
  @override
  final String id;
  @override
  final String name;
  @override
  final String address;
  @override
  final String? district;
  @override
  final double lat;
  @override
  final double lng;
  @override
  final String timezone;
  @override
  final BuiltList<DepotOpeningHours> openingHours;
  @override
  final int pickupNowWindowMinutes;
  @override
  final int maxScheduleDays;
  @override
  final int scheduledGraceMinutes;
  @override
  final String? swapStationId;
  @override
  final int? minChargedBatteries;
  @override
  final bool active;
  @override
  final int? availableVehicleCount;
  @override
  final int? distanceM;
  @override
  final DateTime? createdAt;
  @override
  final DateTime? updatedAt;

  factory _$Depot([void Function(DepotBuilder)? updates]) =>
      (DepotBuilder()..update(updates))._build();

  _$Depot._(
      {required this.id,
      required this.name,
      required this.address,
      this.district,
      required this.lat,
      required this.lng,
      required this.timezone,
      required this.openingHours,
      required this.pickupNowWindowMinutes,
      required this.maxScheduleDays,
      required this.scheduledGraceMinutes,
      this.swapStationId,
      this.minChargedBatteries,
      required this.active,
      this.availableVehicleCount,
      this.distanceM,
      this.createdAt,
      this.updatedAt})
      : super._();
  @override
  Depot rebuild(void Function(DepotBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DepotBuilder toBuilder() => DepotBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Depot &&
        id == other.id &&
        name == other.name &&
        address == other.address &&
        district == other.district &&
        lat == other.lat &&
        lng == other.lng &&
        timezone == other.timezone &&
        openingHours == other.openingHours &&
        pickupNowWindowMinutes == other.pickupNowWindowMinutes &&
        maxScheduleDays == other.maxScheduleDays &&
        scheduledGraceMinutes == other.scheduledGraceMinutes &&
        swapStationId == other.swapStationId &&
        minChargedBatteries == other.minChargedBatteries &&
        active == other.active &&
        availableVehicleCount == other.availableVehicleCount &&
        distanceM == other.distanceM &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, address.hashCode);
    _$hash = $jc(_$hash, district.hashCode);
    _$hash = $jc(_$hash, lat.hashCode);
    _$hash = $jc(_$hash, lng.hashCode);
    _$hash = $jc(_$hash, timezone.hashCode);
    _$hash = $jc(_$hash, openingHours.hashCode);
    _$hash = $jc(_$hash, pickupNowWindowMinutes.hashCode);
    _$hash = $jc(_$hash, maxScheduleDays.hashCode);
    _$hash = $jc(_$hash, scheduledGraceMinutes.hashCode);
    _$hash = $jc(_$hash, swapStationId.hashCode);
    _$hash = $jc(_$hash, minChargedBatteries.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jc(_$hash, availableVehicleCount.hashCode);
    _$hash = $jc(_$hash, distanceM.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Depot')
          ..add('id', id)
          ..add('name', name)
          ..add('address', address)
          ..add('district', district)
          ..add('lat', lat)
          ..add('lng', lng)
          ..add('timezone', timezone)
          ..add('openingHours', openingHours)
          ..add('pickupNowWindowMinutes', pickupNowWindowMinutes)
          ..add('maxScheduleDays', maxScheduleDays)
          ..add('scheduledGraceMinutes', scheduledGraceMinutes)
          ..add('swapStationId', swapStationId)
          ..add('minChargedBatteries', minChargedBatteries)
          ..add('active', active)
          ..add('availableVehicleCount', availableVehicleCount)
          ..add('distanceM', distanceM)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class DepotBuilder implements Builder<Depot, DepotBuilder> {
  _$Depot? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _address;
  String? get address => _$this._address;
  set address(String? address) => _$this._address = address;

  String? _district;
  String? get district => _$this._district;
  set district(String? district) => _$this._district = district;

  double? _lat;
  double? get lat => _$this._lat;
  set lat(double? lat) => _$this._lat = lat;

  double? _lng;
  double? get lng => _$this._lng;
  set lng(double? lng) => _$this._lng = lng;

  String? _timezone;
  String? get timezone => _$this._timezone;
  set timezone(String? timezone) => _$this._timezone = timezone;

  ListBuilder<DepotOpeningHours>? _openingHours;
  ListBuilder<DepotOpeningHours> get openingHours =>
      _$this._openingHours ??= ListBuilder<DepotOpeningHours>();
  set openingHours(ListBuilder<DepotOpeningHours>? openingHours) =>
      _$this._openingHours = openingHours;

  int? _pickupNowWindowMinutes;
  int? get pickupNowWindowMinutes => _$this._pickupNowWindowMinutes;
  set pickupNowWindowMinutes(int? pickupNowWindowMinutes) =>
      _$this._pickupNowWindowMinutes = pickupNowWindowMinutes;

  int? _maxScheduleDays;
  int? get maxScheduleDays => _$this._maxScheduleDays;
  set maxScheduleDays(int? maxScheduleDays) =>
      _$this._maxScheduleDays = maxScheduleDays;

  int? _scheduledGraceMinutes;
  int? get scheduledGraceMinutes => _$this._scheduledGraceMinutes;
  set scheduledGraceMinutes(int? scheduledGraceMinutes) =>
      _$this._scheduledGraceMinutes = scheduledGraceMinutes;

  String? _swapStationId;
  String? get swapStationId => _$this._swapStationId;
  set swapStationId(String? swapStationId) =>
      _$this._swapStationId = swapStationId;

  int? _minChargedBatteries;
  int? get minChargedBatteries => _$this._minChargedBatteries;
  set minChargedBatteries(int? minChargedBatteries) =>
      _$this._minChargedBatteries = minChargedBatteries;

  bool? _active;
  bool? get active => _$this._active;
  set active(bool? active) => _$this._active = active;

  int? _availableVehicleCount;
  int? get availableVehicleCount => _$this._availableVehicleCount;
  set availableVehicleCount(int? availableVehicleCount) =>
      _$this._availableVehicleCount = availableVehicleCount;

  int? _distanceM;
  int? get distanceM => _$this._distanceM;
  set distanceM(int? distanceM) => _$this._distanceM = distanceM;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  DepotBuilder() {
    Depot._defaults(this);
  }

  DepotBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _name = $v.name;
      _address = $v.address;
      _district = $v.district;
      _lat = $v.lat;
      _lng = $v.lng;
      _timezone = $v.timezone;
      _openingHours = $v.openingHours.toBuilder();
      _pickupNowWindowMinutes = $v.pickupNowWindowMinutes;
      _maxScheduleDays = $v.maxScheduleDays;
      _scheduledGraceMinutes = $v.scheduledGraceMinutes;
      _swapStationId = $v.swapStationId;
      _minChargedBatteries = $v.minChargedBatteries;
      _active = $v.active;
      _availableVehicleCount = $v.availableVehicleCount;
      _distanceM = $v.distanceM;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Depot other) {
    _$v = other as _$Depot;
  }

  @override
  void update(void Function(DepotBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Depot build() => _build();

  _$Depot _build() {
    _$Depot _$result;
    try {
      _$result = _$v ??
          _$Depot._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'Depot', 'id'),
            name: BuiltValueNullFieldError.checkNotNull(name, r'Depot', 'name'),
            address: BuiltValueNullFieldError.checkNotNull(
                address, r'Depot', 'address'),
            district: district,
            lat: BuiltValueNullFieldError.checkNotNull(lat, r'Depot', 'lat'),
            lng: BuiltValueNullFieldError.checkNotNull(lng, r'Depot', 'lng'),
            timezone: BuiltValueNullFieldError.checkNotNull(
                timezone, r'Depot', 'timezone'),
            openingHours: openingHours.build(),
            pickupNowWindowMinutes: BuiltValueNullFieldError.checkNotNull(
                pickupNowWindowMinutes, r'Depot', 'pickupNowWindowMinutes'),
            maxScheduleDays: BuiltValueNullFieldError.checkNotNull(
                maxScheduleDays, r'Depot', 'maxScheduleDays'),
            scheduledGraceMinutes: BuiltValueNullFieldError.checkNotNull(
                scheduledGraceMinutes, r'Depot', 'scheduledGraceMinutes'),
            swapStationId: swapStationId,
            minChargedBatteries: minChargedBatteries,
            active: BuiltValueNullFieldError.checkNotNull(
                active, r'Depot', 'active'),
            availableVehicleCount: availableVehicleCount,
            distanceM: distanceM,
            createdAt: createdAt,
            updatedAt: updatedAt,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'openingHours';
        openingHours.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(r'Depot', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
