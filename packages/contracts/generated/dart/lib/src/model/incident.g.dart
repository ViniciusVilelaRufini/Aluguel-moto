// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'incident.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Incident extends Incident {
  @override
  final String id;
  @override
  final String? customerId;
  @override
  final String? rentalId;
  @override
  final String? vehicleId;
  @override
  final IncidentCategory category;
  @override
  final IncidentStatus status;
  @override
  final String description;
  @override
  final BuiltList<String>? photoObjectKeys;
  @override
  final double? lat;
  @override
  final double? lng;
  @override
  final String? resolutionNote;
  @override
  final String? createdById;
  @override
  final ActorType? createdByType;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  factory _$Incident([void Function(IncidentBuilder)? updates]) =>
      (IncidentBuilder()..update(updates))._build();

  _$Incident._(
      {required this.id,
      this.customerId,
      this.rentalId,
      this.vehicleId,
      required this.category,
      required this.status,
      required this.description,
      this.photoObjectKeys,
      this.lat,
      this.lng,
      this.resolutionNote,
      this.createdById,
      this.createdByType,
      required this.createdAt,
      required this.updatedAt})
      : super._();
  @override
  Incident rebuild(void Function(IncidentBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  IncidentBuilder toBuilder() => IncidentBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Incident &&
        id == other.id &&
        customerId == other.customerId &&
        rentalId == other.rentalId &&
        vehicleId == other.vehicleId &&
        category == other.category &&
        status == other.status &&
        description == other.description &&
        photoObjectKeys == other.photoObjectKeys &&
        lat == other.lat &&
        lng == other.lng &&
        resolutionNote == other.resolutionNote &&
        createdById == other.createdById &&
        createdByType == other.createdByType &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, customerId.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, category.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, photoObjectKeys.hashCode);
    _$hash = $jc(_$hash, lat.hashCode);
    _$hash = $jc(_$hash, lng.hashCode);
    _$hash = $jc(_$hash, resolutionNote.hashCode);
    _$hash = $jc(_$hash, createdById.hashCode);
    _$hash = $jc(_$hash, createdByType.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Incident')
          ..add('id', id)
          ..add('customerId', customerId)
          ..add('rentalId', rentalId)
          ..add('vehicleId', vehicleId)
          ..add('category', category)
          ..add('status', status)
          ..add('description', description)
          ..add('photoObjectKeys', photoObjectKeys)
          ..add('lat', lat)
          ..add('lng', lng)
          ..add('resolutionNote', resolutionNote)
          ..add('createdById', createdById)
          ..add('createdByType', createdByType)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class IncidentBuilder implements Builder<Incident, IncidentBuilder> {
  _$Incident? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _customerId;
  String? get customerId => _$this._customerId;
  set customerId(String? customerId) => _$this._customerId = customerId;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  IncidentCategory? _category;
  IncidentCategory? get category => _$this._category;
  set category(IncidentCategory? category) => _$this._category = category;

  IncidentStatus? _status;
  IncidentStatus? get status => _$this._status;
  set status(IncidentStatus? status) => _$this._status = status;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

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

  String? _resolutionNote;
  String? get resolutionNote => _$this._resolutionNote;
  set resolutionNote(String? resolutionNote) =>
      _$this._resolutionNote = resolutionNote;

  String? _createdById;
  String? get createdById => _$this._createdById;
  set createdById(String? createdById) => _$this._createdById = createdById;

  ActorType? _createdByType;
  ActorType? get createdByType => _$this._createdByType;
  set createdByType(ActorType? createdByType) =>
      _$this._createdByType = createdByType;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  IncidentBuilder() {
    Incident._defaults(this);
  }

  IncidentBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _customerId = $v.customerId;
      _rentalId = $v.rentalId;
      _vehicleId = $v.vehicleId;
      _category = $v.category;
      _status = $v.status;
      _description = $v.description;
      _photoObjectKeys = $v.photoObjectKeys?.toBuilder();
      _lat = $v.lat;
      _lng = $v.lng;
      _resolutionNote = $v.resolutionNote;
      _createdById = $v.createdById;
      _createdByType = $v.createdByType;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Incident other) {
    _$v = other as _$Incident;
  }

  @override
  void update(void Function(IncidentBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Incident build() => _build();

  _$Incident _build() {
    _$Incident _$result;
    try {
      _$result = _$v ??
          _$Incident._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'Incident', 'id'),
            customerId: customerId,
            rentalId: rentalId,
            vehicleId: vehicleId,
            category: BuiltValueNullFieldError.checkNotNull(
                category, r'Incident', 'category'),
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'Incident', 'status'),
            description: BuiltValueNullFieldError.checkNotNull(
                description, r'Incident', 'description'),
            photoObjectKeys: _photoObjectKeys?.build(),
            lat: lat,
            lng: lng,
            resolutionNote: resolutionNote,
            createdById: createdById,
            createdByType: createdByType,
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'Incident', 'createdAt'),
            updatedAt: BuiltValueNullFieldError.checkNotNull(
                updatedAt, r'Incident', 'updatedAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'photoObjectKeys';
        _photoObjectKeys?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'Incident', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
