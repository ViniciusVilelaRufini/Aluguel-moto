// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'swap_station_update.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SwapStationUpdate extends SwapStationUpdate {
  @override
  final String? name;
  @override
  final String? address;
  @override
  final double? lat;
  @override
  final double? lng;
  @override
  final String? openingHours;
  @override
  final bool? open24h;
  @override
  final int? totalSlots;
  @override
  final String? thingName;
  @override
  final bool? active;

  factory _$SwapStationUpdate(
          [void Function(SwapStationUpdateBuilder)? updates]) =>
      (SwapStationUpdateBuilder()..update(updates))._build();

  _$SwapStationUpdate._(
      {this.name,
      this.address,
      this.lat,
      this.lng,
      this.openingHours,
      this.open24h,
      this.totalSlots,
      this.thingName,
      this.active})
      : super._();
  @override
  SwapStationUpdate rebuild(void Function(SwapStationUpdateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SwapStationUpdateBuilder toBuilder() =>
      SwapStationUpdateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SwapStationUpdate &&
        name == other.name &&
        address == other.address &&
        lat == other.lat &&
        lng == other.lng &&
        openingHours == other.openingHours &&
        open24h == other.open24h &&
        totalSlots == other.totalSlots &&
        thingName == other.thingName &&
        active == other.active;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, address.hashCode);
    _$hash = $jc(_$hash, lat.hashCode);
    _$hash = $jc(_$hash, lng.hashCode);
    _$hash = $jc(_$hash, openingHours.hashCode);
    _$hash = $jc(_$hash, open24h.hashCode);
    _$hash = $jc(_$hash, totalSlots.hashCode);
    _$hash = $jc(_$hash, thingName.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SwapStationUpdate')
          ..add('name', name)
          ..add('address', address)
          ..add('lat', lat)
          ..add('lng', lng)
          ..add('openingHours', openingHours)
          ..add('open24h', open24h)
          ..add('totalSlots', totalSlots)
          ..add('thingName', thingName)
          ..add('active', active))
        .toString();
  }
}

class SwapStationUpdateBuilder
    implements Builder<SwapStationUpdate, SwapStationUpdateBuilder> {
  _$SwapStationUpdate? _$v;

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

  String? _openingHours;
  String? get openingHours => _$this._openingHours;
  set openingHours(String? openingHours) => _$this._openingHours = openingHours;

  bool? _open24h;
  bool? get open24h => _$this._open24h;
  set open24h(bool? open24h) => _$this._open24h = open24h;

  int? _totalSlots;
  int? get totalSlots => _$this._totalSlots;
  set totalSlots(int? totalSlots) => _$this._totalSlots = totalSlots;

  String? _thingName;
  String? get thingName => _$this._thingName;
  set thingName(String? thingName) => _$this._thingName = thingName;

  bool? _active;
  bool? get active => _$this._active;
  set active(bool? active) => _$this._active = active;

  SwapStationUpdateBuilder() {
    SwapStationUpdate._defaults(this);
  }

  SwapStationUpdateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _address = $v.address;
      _lat = $v.lat;
      _lng = $v.lng;
      _openingHours = $v.openingHours;
      _open24h = $v.open24h;
      _totalSlots = $v.totalSlots;
      _thingName = $v.thingName;
      _active = $v.active;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SwapStationUpdate other) {
    _$v = other as _$SwapStationUpdate;
  }

  @override
  void update(void Function(SwapStationUpdateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SwapStationUpdate build() => _build();

  _$SwapStationUpdate _build() {
    final _$result = _$v ??
        _$SwapStationUpdate._(
          name: name,
          address: address,
          lat: lat,
          lng: lng,
          openingHours: openingHours,
          open24h: open24h,
          totalSlots: totalSlots,
          thingName: thingName,
          active: active,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
