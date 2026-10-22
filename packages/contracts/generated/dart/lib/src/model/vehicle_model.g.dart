// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_model.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleModel extends VehicleModel {
  @override
  final String id;
  @override
  final String name;
  @override
  final String slug;
  @override
  final String categoryLabel;
  @override
  final String? description;
  @override
  final String? photoUrl;
  @override
  final String? photoObjectKey;
  @override
  final int pricePerMinuteCents;
  @override
  final int? unlockFeeCents;
  @override
  final int serviceIntervalKm;
  @override
  final int serviceIntervalHours;
  @override
  final bool active;
  @override
  final int sortOrder;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  factory _$VehicleModel([void Function(VehicleModelBuilder)? updates]) =>
      (VehicleModelBuilder()..update(updates))._build();

  _$VehicleModel._(
      {required this.id,
      required this.name,
      required this.slug,
      required this.categoryLabel,
      this.description,
      this.photoUrl,
      this.photoObjectKey,
      required this.pricePerMinuteCents,
      this.unlockFeeCents,
      required this.serviceIntervalKm,
      required this.serviceIntervalHours,
      required this.active,
      required this.sortOrder,
      required this.createdAt,
      required this.updatedAt})
      : super._();
  @override
  VehicleModel rebuild(void Function(VehicleModelBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleModelBuilder toBuilder() => VehicleModelBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleModel &&
        id == other.id &&
        name == other.name &&
        slug == other.slug &&
        categoryLabel == other.categoryLabel &&
        description == other.description &&
        photoUrl == other.photoUrl &&
        photoObjectKey == other.photoObjectKey &&
        pricePerMinuteCents == other.pricePerMinuteCents &&
        unlockFeeCents == other.unlockFeeCents &&
        serviceIntervalKm == other.serviceIntervalKm &&
        serviceIntervalHours == other.serviceIntervalHours &&
        active == other.active &&
        sortOrder == other.sortOrder &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, slug.hashCode);
    _$hash = $jc(_$hash, categoryLabel.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, photoUrl.hashCode);
    _$hash = $jc(_$hash, photoObjectKey.hashCode);
    _$hash = $jc(_$hash, pricePerMinuteCents.hashCode);
    _$hash = $jc(_$hash, unlockFeeCents.hashCode);
    _$hash = $jc(_$hash, serviceIntervalKm.hashCode);
    _$hash = $jc(_$hash, serviceIntervalHours.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jc(_$hash, sortOrder.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehicleModel')
          ..add('id', id)
          ..add('name', name)
          ..add('slug', slug)
          ..add('categoryLabel', categoryLabel)
          ..add('description', description)
          ..add('photoUrl', photoUrl)
          ..add('photoObjectKey', photoObjectKey)
          ..add('pricePerMinuteCents', pricePerMinuteCents)
          ..add('unlockFeeCents', unlockFeeCents)
          ..add('serviceIntervalKm', serviceIntervalKm)
          ..add('serviceIntervalHours', serviceIntervalHours)
          ..add('active', active)
          ..add('sortOrder', sortOrder)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class VehicleModelBuilder
    implements Builder<VehicleModel, VehicleModelBuilder> {
  _$VehicleModel? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _slug;
  String? get slug => _$this._slug;
  set slug(String? slug) => _$this._slug = slug;

  String? _categoryLabel;
  String? get categoryLabel => _$this._categoryLabel;
  set categoryLabel(String? categoryLabel) =>
      _$this._categoryLabel = categoryLabel;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  String? _photoUrl;
  String? get photoUrl => _$this._photoUrl;
  set photoUrl(String? photoUrl) => _$this._photoUrl = photoUrl;

  String? _photoObjectKey;
  String? get photoObjectKey => _$this._photoObjectKey;
  set photoObjectKey(String? photoObjectKey) =>
      _$this._photoObjectKey = photoObjectKey;

  int? _pricePerMinuteCents;
  int? get pricePerMinuteCents => _$this._pricePerMinuteCents;
  set pricePerMinuteCents(int? pricePerMinuteCents) =>
      _$this._pricePerMinuteCents = pricePerMinuteCents;

  int? _unlockFeeCents;
  int? get unlockFeeCents => _$this._unlockFeeCents;
  set unlockFeeCents(int? unlockFeeCents) =>
      _$this._unlockFeeCents = unlockFeeCents;

  int? _serviceIntervalKm;
  int? get serviceIntervalKm => _$this._serviceIntervalKm;
  set serviceIntervalKm(int? serviceIntervalKm) =>
      _$this._serviceIntervalKm = serviceIntervalKm;

  int? _serviceIntervalHours;
  int? get serviceIntervalHours => _$this._serviceIntervalHours;
  set serviceIntervalHours(int? serviceIntervalHours) =>
      _$this._serviceIntervalHours = serviceIntervalHours;

  bool? _active;
  bool? get active => _$this._active;
  set active(bool? active) => _$this._active = active;

  int? _sortOrder;
  int? get sortOrder => _$this._sortOrder;
  set sortOrder(int? sortOrder) => _$this._sortOrder = sortOrder;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  VehicleModelBuilder() {
    VehicleModel._defaults(this);
  }

  VehicleModelBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _name = $v.name;
      _slug = $v.slug;
      _categoryLabel = $v.categoryLabel;
      _description = $v.description;
      _photoUrl = $v.photoUrl;
      _photoObjectKey = $v.photoObjectKey;
      _pricePerMinuteCents = $v.pricePerMinuteCents;
      _unlockFeeCents = $v.unlockFeeCents;
      _serviceIntervalKm = $v.serviceIntervalKm;
      _serviceIntervalHours = $v.serviceIntervalHours;
      _active = $v.active;
      _sortOrder = $v.sortOrder;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleModel other) {
    _$v = other as _$VehicleModel;
  }

  @override
  void update(void Function(VehicleModelBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleModel build() => _build();

  _$VehicleModel _build() {
    final _$result = _$v ??
        _$VehicleModel._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'VehicleModel', 'id'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'VehicleModel', 'name'),
          slug: BuiltValueNullFieldError.checkNotNull(
              slug, r'VehicleModel', 'slug'),
          categoryLabel: BuiltValueNullFieldError.checkNotNull(
              categoryLabel, r'VehicleModel', 'categoryLabel'),
          description: description,
          photoUrl: photoUrl,
          photoObjectKey: photoObjectKey,
          pricePerMinuteCents: BuiltValueNullFieldError.checkNotNull(
              pricePerMinuteCents, r'VehicleModel', 'pricePerMinuteCents'),
          unlockFeeCents: unlockFeeCents,
          serviceIntervalKm: BuiltValueNullFieldError.checkNotNull(
              serviceIntervalKm, r'VehicleModel', 'serviceIntervalKm'),
          serviceIntervalHours: BuiltValueNullFieldError.checkNotNull(
              serviceIntervalHours, r'VehicleModel', 'serviceIntervalHours'),
          active: BuiltValueNullFieldError.checkNotNull(
              active, r'VehicleModel', 'active'),
          sortOrder: BuiltValueNullFieldError.checkNotNull(
              sortOrder, r'VehicleModel', 'sortOrder'),
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'VehicleModel', 'createdAt'),
          updatedAt: BuiltValueNullFieldError.checkNotNull(
              updatedAt, r'VehicleModel', 'updatedAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
