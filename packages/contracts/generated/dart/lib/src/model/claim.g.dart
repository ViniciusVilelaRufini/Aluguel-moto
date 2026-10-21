// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'claim.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Claim extends Claim {
  @override
  final String id;
  @override
  final String customerId;
  @override
  final String rentalId;
  @override
  final String? incidentId;
  @override
  final String? insurancePolicyId;
  @override
  final String? providerClaimId;
  @override
  final ClaimType type;
  @override
  final ClaimStatus status;
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
  @override
  final String? statusNote;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  factory _$Claim([void Function(ClaimBuilder)? updates]) =>
      (ClaimBuilder()..update(updates))._build();

  _$Claim._(
      {required this.id,
      required this.customerId,
      required this.rentalId,
      this.incidentId,
      this.insurancePolicyId,
      this.providerClaimId,
      required this.type,
      required this.status,
      required this.description,
      required this.occurredAt,
      this.lat,
      this.lng,
      this.photoObjectKeys,
      this.statusNote,
      required this.createdAt,
      required this.updatedAt})
      : super._();
  @override
  Claim rebuild(void Function(ClaimBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ClaimBuilder toBuilder() => ClaimBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Claim &&
        id == other.id &&
        customerId == other.customerId &&
        rentalId == other.rentalId &&
        incidentId == other.incidentId &&
        insurancePolicyId == other.insurancePolicyId &&
        providerClaimId == other.providerClaimId &&
        type == other.type &&
        status == other.status &&
        description == other.description &&
        occurredAt == other.occurredAt &&
        lat == other.lat &&
        lng == other.lng &&
        photoObjectKeys == other.photoObjectKeys &&
        statusNote == other.statusNote &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, customerId.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, incidentId.hashCode);
    _$hash = $jc(_$hash, insurancePolicyId.hashCode);
    _$hash = $jc(_$hash, providerClaimId.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, occurredAt.hashCode);
    _$hash = $jc(_$hash, lat.hashCode);
    _$hash = $jc(_$hash, lng.hashCode);
    _$hash = $jc(_$hash, photoObjectKeys.hashCode);
    _$hash = $jc(_$hash, statusNote.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Claim')
          ..add('id', id)
          ..add('customerId', customerId)
          ..add('rentalId', rentalId)
          ..add('incidentId', incidentId)
          ..add('insurancePolicyId', insurancePolicyId)
          ..add('providerClaimId', providerClaimId)
          ..add('type', type)
          ..add('status', status)
          ..add('description', description)
          ..add('occurredAt', occurredAt)
          ..add('lat', lat)
          ..add('lng', lng)
          ..add('photoObjectKeys', photoObjectKeys)
          ..add('statusNote', statusNote)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class ClaimBuilder implements Builder<Claim, ClaimBuilder> {
  _$Claim? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _customerId;
  String? get customerId => _$this._customerId;
  set customerId(String? customerId) => _$this._customerId = customerId;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _incidentId;
  String? get incidentId => _$this._incidentId;
  set incidentId(String? incidentId) => _$this._incidentId = incidentId;

  String? _insurancePolicyId;
  String? get insurancePolicyId => _$this._insurancePolicyId;
  set insurancePolicyId(String? insurancePolicyId) =>
      _$this._insurancePolicyId = insurancePolicyId;

  String? _providerClaimId;
  String? get providerClaimId => _$this._providerClaimId;
  set providerClaimId(String? providerClaimId) =>
      _$this._providerClaimId = providerClaimId;

  ClaimType? _type;
  ClaimType? get type => _$this._type;
  set type(ClaimType? type) => _$this._type = type;

  ClaimStatus? _status;
  ClaimStatus? get status => _$this._status;
  set status(ClaimStatus? status) => _$this._status = status;

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

  String? _statusNote;
  String? get statusNote => _$this._statusNote;
  set statusNote(String? statusNote) => _$this._statusNote = statusNote;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  ClaimBuilder() {
    Claim._defaults(this);
  }

  ClaimBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _customerId = $v.customerId;
      _rentalId = $v.rentalId;
      _incidentId = $v.incidentId;
      _insurancePolicyId = $v.insurancePolicyId;
      _providerClaimId = $v.providerClaimId;
      _type = $v.type;
      _status = $v.status;
      _description = $v.description;
      _occurredAt = $v.occurredAt;
      _lat = $v.lat;
      _lng = $v.lng;
      _photoObjectKeys = $v.photoObjectKeys?.toBuilder();
      _statusNote = $v.statusNote;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Claim other) {
    _$v = other as _$Claim;
  }

  @override
  void update(void Function(ClaimBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Claim build() => _build();

  _$Claim _build() {
    _$Claim _$result;
    try {
      _$result = _$v ??
          _$Claim._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'Claim', 'id'),
            customerId: BuiltValueNullFieldError.checkNotNull(
                customerId, r'Claim', 'customerId'),
            rentalId: BuiltValueNullFieldError.checkNotNull(
                rentalId, r'Claim', 'rentalId'),
            incidentId: incidentId,
            insurancePolicyId: insurancePolicyId,
            providerClaimId: providerClaimId,
            type: BuiltValueNullFieldError.checkNotNull(type, r'Claim', 'type'),
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'Claim', 'status'),
            description: BuiltValueNullFieldError.checkNotNull(
                description, r'Claim', 'description'),
            occurredAt: BuiltValueNullFieldError.checkNotNull(
                occurredAt, r'Claim', 'occurredAt'),
            lat: lat,
            lng: lng,
            photoObjectKeys: _photoObjectKeys?.build(),
            statusNote: statusNote,
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'Claim', 'createdAt'),
            updatedAt: BuiltValueNullFieldError.checkNotNull(
                updatedAt, r'Claim', 'updatedAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'photoObjectKeys';
        _photoObjectKeys?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(r'Claim', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
