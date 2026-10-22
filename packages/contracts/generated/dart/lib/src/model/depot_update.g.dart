// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'depot_update.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DepotUpdate extends DepotUpdate {
  @override
  final String? name;
  @override
  final String? address;
  @override
  final String? district;
  @override
  final double? lat;
  @override
  final double? lng;
  @override
  final String? timezone;
  @override
  final BuiltList<DepotOpeningHours>? openingHours;
  @override
  final int? pickupNowWindowMinutes;
  @override
  final int? maxScheduleDays;
  @override
  final int? scheduledGraceMinutes;
  @override
  final String? swapStationId;
  @override
  final bool? active;

  factory _$DepotUpdate([void Function(DepotUpdateBuilder)? updates]) =>
      (DepotUpdateBuilder()..update(updates))._build();

  _$DepotUpdate._(
      {this.name,
      this.address,
      this.district,
      this.lat,
      this.lng,
      this.timezone,
      this.openingHours,
      this.pickupNowWindowMinutes,
      this.maxScheduleDays,
      this.scheduledGraceMinutes,
      this.swapStationId,
      this.active})
      : super._();
  @override
  DepotUpdate rebuild(void Function(DepotUpdateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DepotUpdateBuilder toBuilder() => DepotUpdateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DepotUpdate &&
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
        active == other.active;
  }

  @override
  int get hashCode {
    var _$hash = 0;
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
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DepotUpdate')
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
          ..add('active', active))
        .toString();
  }
}

class DepotUpdateBuilder implements Builder<DepotUpdate, DepotUpdateBuilder> {
  _$DepotUpdate? _$v;

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

  bool? _active;
  bool? get active => _$this._active;
  set active(bool? active) => _$this._active = active;

  DepotUpdateBuilder() {
    DepotUpdate._defaults(this);
  }

  DepotUpdateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _address = $v.address;
      _district = $v.district;
      _lat = $v.lat;
      _lng = $v.lng;
      _timezone = $v.timezone;
      _openingHours = $v.openingHours?.toBuilder();
      _pickupNowWindowMinutes = $v.pickupNowWindowMinutes;
      _maxScheduleDays = $v.maxScheduleDays;
      _scheduledGraceMinutes = $v.scheduledGraceMinutes;
      _swapStationId = $v.swapStationId;
      _active = $v.active;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DepotUpdate other) {
    _$v = other as _$DepotUpdate;
  }

  @override
  void update(void Function(DepotUpdateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DepotUpdate build() => _build();

  _$DepotUpdate _build() {
    _$DepotUpdate _$result;
    try {
      _$result = _$v ??
          _$DepotUpdate._(
            name: name,
            address: address,
            district: district,
            lat: lat,
            lng: lng,
            timezone: timezone,
            openingHours: _openingHours?.build(),
            pickupNowWindowMinutes: pickupNowWindowMinutes,
            maxScheduleDays: maxScheduleDays,
            scheduledGraceMinutes: scheduledGraceMinutes,
            swapStationId: swapStationId,
            active: active,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'openingHours';
        _openingHours?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'DepotUpdate', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
