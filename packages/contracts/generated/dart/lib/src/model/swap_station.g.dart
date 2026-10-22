// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'swap_station.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SwapStation extends SwapStation {
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
  final bool? open24h;
  @override
  final int? distanceM;

  factory _$SwapStation([void Function(SwapStationBuilder)? updates]) =>
      (SwapStationBuilder()..update(updates))._build();

  _$SwapStation._(
      {required this.id,
      required this.name,
      required this.address,
      required this.lat,
      required this.lng,
      required this.availableBatteries,
      required this.totalSlots,
      required this.openingHours,
      this.open24h,
      this.distanceM})
      : super._();
  @override
  SwapStation rebuild(void Function(SwapStationBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SwapStationBuilder toBuilder() => SwapStationBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SwapStation &&
        id == other.id &&
        name == other.name &&
        address == other.address &&
        lat == other.lat &&
        lng == other.lng &&
        availableBatteries == other.availableBatteries &&
        totalSlots == other.totalSlots &&
        openingHours == other.openingHours &&
        open24h == other.open24h &&
        distanceM == other.distanceM;
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
    _$hash = $jc(_$hash, distanceM.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SwapStation')
          ..add('id', id)
          ..add('name', name)
          ..add('address', address)
          ..add('lat', lat)
          ..add('lng', lng)
          ..add('availableBatteries', availableBatteries)
          ..add('totalSlots', totalSlots)
          ..add('openingHours', openingHours)
          ..add('open24h', open24h)
          ..add('distanceM', distanceM))
        .toString();
  }
}

class SwapStationBuilder implements Builder<SwapStation, SwapStationBuilder> {
  _$SwapStation? _$v;

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

  int? _distanceM;
  int? get distanceM => _$this._distanceM;
  set distanceM(int? distanceM) => _$this._distanceM = distanceM;

  SwapStationBuilder() {
    SwapStation._defaults(this);
  }

  SwapStationBuilder get _$this {
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
      _distanceM = $v.distanceM;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SwapStation other) {
    _$v = other as _$SwapStation;
  }

  @override
  void update(void Function(SwapStationBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SwapStation build() => _build();

  _$SwapStation _build() {
    final _$result = _$v ??
        _$SwapStation._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'SwapStation', 'id'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'SwapStation', 'name'),
          address: BuiltValueNullFieldError.checkNotNull(
              address, r'SwapStation', 'address'),
          lat:
              BuiltValueNullFieldError.checkNotNull(lat, r'SwapStation', 'lat'),
          lng:
              BuiltValueNullFieldError.checkNotNull(lng, r'SwapStation', 'lng'),
          availableBatteries: BuiltValueNullFieldError.checkNotNull(
              availableBatteries, r'SwapStation', 'availableBatteries'),
          totalSlots: BuiltValueNullFieldError.checkNotNull(
              totalSlots, r'SwapStation', 'totalSlots'),
          openingHours: BuiltValueNullFieldError.checkNotNull(
              openingHours, r'SwapStation', 'openingHours'),
          open24h: open24h,
          distanceM: distanceM,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
