// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_model_update.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleModelUpdate extends VehicleModelUpdate {
  @override
  final String? name;
  @override
  final String? categoryLabel;
  @override
  final String? description;
  @override
  final String? photoObjectKey;
  @override
  final int? pricePerMinuteCents;
  @override
  final int? unlockFeeCents;
  @override
  final int? serviceIntervalKm;
  @override
  final int? serviceIntervalHours;
  @override
  final bool? active;
  @override
  final int? sortOrder;

  factory _$VehicleModelUpdate(
          [void Function(VehicleModelUpdateBuilder)? updates]) =>
      (VehicleModelUpdateBuilder()..update(updates))._build();

  _$VehicleModelUpdate._(
      {this.name,
      this.categoryLabel,
      this.description,
      this.photoObjectKey,
      this.pricePerMinuteCents,
      this.unlockFeeCents,
      this.serviceIntervalKm,
      this.serviceIntervalHours,
      this.active,
      this.sortOrder})
      : super._();
  @override
  VehicleModelUpdate rebuild(
          void Function(VehicleModelUpdateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleModelUpdateBuilder toBuilder() =>
      VehicleModelUpdateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleModelUpdate &&
        name == other.name &&
        categoryLabel == other.categoryLabel &&
        description == other.description &&
        photoObjectKey == other.photoObjectKey &&
        pricePerMinuteCents == other.pricePerMinuteCents &&
        unlockFeeCents == other.unlockFeeCents &&
        serviceIntervalKm == other.serviceIntervalKm &&
        serviceIntervalHours == other.serviceIntervalHours &&
        active == other.active &&
        sortOrder == other.sortOrder;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, categoryLabel.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, photoObjectKey.hashCode);
    _$hash = $jc(_$hash, pricePerMinuteCents.hashCode);
    _$hash = $jc(_$hash, unlockFeeCents.hashCode);
    _$hash = $jc(_$hash, serviceIntervalKm.hashCode);
    _$hash = $jc(_$hash, serviceIntervalHours.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jc(_$hash, sortOrder.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehicleModelUpdate')
          ..add('name', name)
          ..add('categoryLabel', categoryLabel)
          ..add('description', description)
          ..add('photoObjectKey', photoObjectKey)
          ..add('pricePerMinuteCents', pricePerMinuteCents)
          ..add('unlockFeeCents', unlockFeeCents)
          ..add('serviceIntervalKm', serviceIntervalKm)
          ..add('serviceIntervalHours', serviceIntervalHours)
          ..add('active', active)
          ..add('sortOrder', sortOrder))
        .toString();
  }
}

class VehicleModelUpdateBuilder
    implements Builder<VehicleModelUpdate, VehicleModelUpdateBuilder> {
  _$VehicleModelUpdate? _$v;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _categoryLabel;
  String? get categoryLabel => _$this._categoryLabel;
  set categoryLabel(String? categoryLabel) =>
      _$this._categoryLabel = categoryLabel;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

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

  VehicleModelUpdateBuilder() {
    VehicleModelUpdate._defaults(this);
  }

  VehicleModelUpdateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _categoryLabel = $v.categoryLabel;
      _description = $v.description;
      _photoObjectKey = $v.photoObjectKey;
      _pricePerMinuteCents = $v.pricePerMinuteCents;
      _unlockFeeCents = $v.unlockFeeCents;
      _serviceIntervalKm = $v.serviceIntervalKm;
      _serviceIntervalHours = $v.serviceIntervalHours;
      _active = $v.active;
      _sortOrder = $v.sortOrder;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleModelUpdate other) {
    _$v = other as _$VehicleModelUpdate;
  }

  @override
  void update(void Function(VehicleModelUpdateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleModelUpdate build() => _build();

  _$VehicleModelUpdate _build() {
    final _$result = _$v ??
        _$VehicleModelUpdate._(
          name: name,
          categoryLabel: categoryLabel,
          description: description,
          photoObjectKey: photoObjectKey,
          pricePerMinuteCents: pricePerMinuteCents,
          unlockFeeCents: unlockFeeCents,
          serviceIntervalKm: serviceIntervalKm,
          serviceIntervalHours: serviceIntervalHours,
          active: active,
          sortOrder: sortOrder,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
