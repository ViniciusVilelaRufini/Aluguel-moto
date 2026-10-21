// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'claim_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ClaimCreate extends ClaimCreate {
  @override
  final String rentalId;
  @override
  final String? incidentId;
  @override
  final ClaimType type;
  @override
  final String description;
  @override
  final DateTime occurredAt;
  @override
  final double? lat;
  @override
  final double? lng;
  @override
  final BuiltList<String>? photoObjectKeys;

  factory _$ClaimCreate([void Function(ClaimCreateBuilder)? updates]) =>
      (ClaimCreateBuilder()..update(updates))._build();

  _$ClaimCreate._(
      {required this.rentalId,
      this.incidentId,
      required this.type,
      required this.description,
      required this.occurredAt,
      this.lat,
      this.lng,
      this.photoObjectKeys})
      : super._();
  @override
  ClaimCreate rebuild(void Function(ClaimCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ClaimCreateBuilder toBuilder() => ClaimCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ClaimCreate &&
        rentalId == other.rentalId &&
        incidentId == other.incidentId &&
        type == other.type &&
        description == other.description &&
        occurredAt == other.occurredAt &&
        lat == other.lat &&
        lng == other.lng &&
        photoObjectKeys == other.photoObjectKeys;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, incidentId.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, occurredAt.hashCode);
    _$hash = $jc(_$hash, lat.hashCode);
    _$hash = $jc(_$hash, lng.hashCode);
    _$hash = $jc(_$hash, photoObjectKeys.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ClaimCreate')
          ..add('rentalId', rentalId)
          ..add('incidentId', incidentId)
          ..add('type', type)
          ..add('description', description)
          ..add('occurredAt', occurredAt)
          ..add('lat', lat)
          ..add('lng', lng)
          ..add('photoObjectKeys', photoObjectKeys))
        .toString();
  }
}

class ClaimCreateBuilder implements Builder<ClaimCreate, ClaimCreateBuilder> {
  _$ClaimCreate? _$v;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _incidentId;
  String? get incidentId => _$this._incidentId;
  set incidentId(String? incidentId) => _$this._incidentId = incidentId;

  ClaimType? _type;
  ClaimType? get type => _$this._type;
  set type(ClaimType? type) => _$this._type = type;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  DateTime? _occurredAt;
  DateTime? get occurredAt => _$this._occurredAt;
  set occurredAt(DateTime? occurredAt) => _$this._occurredAt = occurredAt;

  double? _lat;
  double? get lat => _$this._lat;
  set lat(double? lat) => _$this._lat = lat;

  double? _lng;
  double? get lng => _$this._lng;
  set lng(double? lng) => _$this._lng = lng;

  ListBuilder<String>? _photoObjectKeys;
  ListBuilder<String> get photoObjectKeys =>
      _$this._photoObjectKeys ??= ListBuilder<String>();
  set photoObjectKeys(ListBuilder<String>? photoObjectKeys) =>
      _$this._photoObjectKeys = photoObjectKeys;

  ClaimCreateBuilder() {
    ClaimCreate._defaults(this);
  }

  ClaimCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _rentalId = $v.rentalId;
      _incidentId = $v.incidentId;
      _type = $v.type;
      _description = $v.description;
      _occurredAt = $v.occurredAt;
      _lat = $v.lat;
      _lng = $v.lng;
      _photoObjectKeys = $v.photoObjectKeys?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ClaimCreate other) {
    _$v = other as _$ClaimCreate;
  }

  @override
  void update(void Function(ClaimCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ClaimCreate build() => _build();

  _$ClaimCreate _build() {
    _$ClaimCreate _$result;
    try {
      _$result = _$v ??
          _$ClaimCreate._(
            rentalId: BuiltValueNullFieldError.checkNotNull(
                rentalId, r'ClaimCreate', 'rentalId'),
            incidentId: incidentId,
            type: BuiltValueNullFieldError.checkNotNull(
                type, r'ClaimCreate', 'type'),
            description: BuiltValueNullFieldError.checkNotNull(
                description, r'ClaimCreate', 'description'),
            occurredAt: BuiltValueNullFieldError.checkNotNull(
                occurredAt, r'ClaimCreate', 'occurredAt'),
            lat: lat,
            lng: lng,
            photoObjectKeys: _photoObjectKeys?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'photoObjectKeys';
        _photoObjectKeys?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'ClaimCreate', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
