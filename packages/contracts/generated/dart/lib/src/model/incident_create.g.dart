// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'incident_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$IncidentCreate extends IncidentCreate {
  @override
  final IncidentCategory category;
  @override
  final String description;
  @override
  final String? rentalId;
  @override
  final String? vehicleId;
  @override
  final BuiltList<String>? photoObjectKeys;
  @override
  final double? lat;
  @override
  final double? lng;

  factory _$IncidentCreate([void Function(IncidentCreateBuilder)? updates]) =>
      (IncidentCreateBuilder()..update(updates))._build();

  _$IncidentCreate._(
      {required this.category,
      required this.description,
      this.rentalId,
      this.vehicleId,
      this.photoObjectKeys,
      this.lat,
      this.lng})
      : super._();
  @override
  IncidentCreate rebuild(void Function(IncidentCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  IncidentCreateBuilder toBuilder() => IncidentCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is IncidentCreate &&
        category == other.category &&
        description == other.description &&
        rentalId == other.rentalId &&
        vehicleId == other.vehicleId &&
        photoObjectKeys == other.photoObjectKeys &&
        lat == other.lat &&
        lng == other.lng;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, category.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, photoObjectKeys.hashCode);
    _$hash = $jc(_$hash, lat.hashCode);
    _$hash = $jc(_$hash, lng.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'IncidentCreate')
          ..add('category', category)
          ..add('description', description)
          ..add('rentalId', rentalId)
          ..add('vehicleId', vehicleId)
          ..add('photoObjectKeys', photoObjectKeys)
          ..add('lat', lat)
          ..add('lng', lng))
        .toString();
  }
}

class IncidentCreateBuilder
    implements Builder<IncidentCreate, IncidentCreateBuilder> {
  _$IncidentCreate? _$v;

  IncidentCategory? _category;
  IncidentCategory? get category => _$this._category;
  set category(IncidentCategory? category) => _$this._category = category;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  ListBuilder<String>? _photoObjectKeys;
  ListBuilder<String> get photoObjectKeys =>
      _$this._photoObjectKeys ??= ListBuilder<String>();
  set photoObjectKeys(ListBuilder<String>? photoObjectKeys) =>
      _$this._photoObjectKeys = photoObjectKeys;

  double? _lat;
  double? get lat => _$this._lat;
  set lat(double? lat) => _$this._lat = lat;

  double? _lng;
  double? get lng => _$this._lng;
  set lng(double? lng) => _$this._lng = lng;

  IncidentCreateBuilder() {
    IncidentCreate._defaults(this);
  }

  IncidentCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _category = $v.category;
      _description = $v.description;
      _rentalId = $v.rentalId;
      _vehicleId = $v.vehicleId;
      _photoObjectKeys = $v.photoObjectKeys?.toBuilder();
      _lat = $v.lat;
      _lng = $v.lng;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(IncidentCreate other) {
    _$v = other as _$IncidentCreate;
  }

  @override
  void update(void Function(IncidentCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  IncidentCreate build() => _build();

  _$IncidentCreate _build() {
    _$IncidentCreate _$result;
    try {
      _$result = _$v ??
          _$IncidentCreate._(
            category: BuiltValueNullFieldError.checkNotNull(
                category, r'IncidentCreate', 'category'),
            description: BuiltValueNullFieldError.checkNotNull(
                description, r'IncidentCreate', 'description'),
            rentalId: rentalId,
            vehicleId: vehicleId,
            photoObjectKeys: _photoObjectKeys?.build(),
            lat: lat,
            lng: lng,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'photoObjectKeys';
        _photoObjectKeys?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'IncidentCreate', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
