// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_summary.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleSummary extends VehicleSummary {
  @override
  final String id;
  @override
  final String code;
  @override
  final String model;
  @override
  final VehicleStatus status;
  @override
  final double lat;
  @override
  final double lng;
  @override
  final int batteryPct;
  @override
  final double estimatedRangeKm;
  @override
  final int? distanceM;
  @override
  final String? vehicleModelId;
  @override
  final String? categoryLabel;
  @override
  final int? pricePerMinuteCents;

  factory _$VehicleSummary([void Function(VehicleSummaryBuilder)? updates]) =>
      (VehicleSummaryBuilder()..update(updates))._build();

  _$VehicleSummary._(
      {required this.id,
      required this.code,
      required this.model,
      required this.status,
      required this.lat,
      required this.lng,
      required this.batteryPct,
      required this.estimatedRangeKm,
      this.distanceM,
      this.vehicleModelId,
      this.categoryLabel,
      this.pricePerMinuteCents})
      : super._();
  @override
  VehicleSummary rebuild(void Function(VehicleSummaryBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleSummaryBuilder toBuilder() => VehicleSummaryBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleSummary &&
        id == other.id &&
        code == other.code &&
        model == other.model &&
        status == other.status &&
        lat == other.lat &&
        lng == other.lng &&
        batteryPct == other.batteryPct &&
        estimatedRangeKm == other.estimatedRangeKm &&
        distanceM == other.distanceM &&
        vehicleModelId == other.vehicleModelId &&
        categoryLabel == other.categoryLabel &&
        pricePerMinuteCents == other.pricePerMinuteCents;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jc(_$hash, model.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, lat.hashCode);
    _$hash = $jc(_$hash, lng.hashCode);
    _$hash = $jc(_$hash, batteryPct.hashCode);
    _$hash = $jc(_$hash, estimatedRangeKm.hashCode);
    _$hash = $jc(_$hash, distanceM.hashCode);
    _$hash = $jc(_$hash, vehicleModelId.hashCode);
    _$hash = $jc(_$hash, categoryLabel.hashCode);
    _$hash = $jc(_$hash, pricePerMinuteCents.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehicleSummary')
          ..add('id', id)
          ..add('code', code)
          ..add('model', model)
          ..add('status', status)
          ..add('lat', lat)
          ..add('lng', lng)
          ..add('batteryPct', batteryPct)
          ..add('estimatedRangeKm', estimatedRangeKm)
          ..add('distanceM', distanceM)
          ..add('vehicleModelId', vehicleModelId)
          ..add('categoryLabel', categoryLabel)
          ..add('pricePerMinuteCents', pricePerMinuteCents))
        .toString();
  }
}

class VehicleSummaryBuilder
    implements Builder<VehicleSummary, VehicleSummaryBuilder> {
  _$VehicleSummary? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _code;
  String? get code => _$this._code;
  set code(String? code) => _$this._code = code;

  String? _model;
  String? get model => _$this._model;
  set model(String? model) => _$this._model = model;

  VehicleStatus? _status;
  VehicleStatus? get status => _$this._status;
  set status(VehicleStatus? status) => _$this._status = status;

  double? _lat;
  double? get lat => _$this._lat;
  set lat(double? lat) => _$this._lat = lat;

  double? _lng;
  double? get lng => _$this._lng;
  set lng(double? lng) => _$this._lng = lng;

  int? _batteryPct;
  int? get batteryPct => _$this._batteryPct;
  set batteryPct(int? batteryPct) => _$this._batteryPct = batteryPct;

  double? _estimatedRangeKm;
  double? get estimatedRangeKm => _$this._estimatedRangeKm;
  set estimatedRangeKm(double? estimatedRangeKm) =>
      _$this._estimatedRangeKm = estimatedRangeKm;

  int? _distanceM;
  int? get distanceM => _$this._distanceM;
  set distanceM(int? distanceM) => _$this._distanceM = distanceM;

  String? _vehicleModelId;
  String? get vehicleModelId => _$this._vehicleModelId;
  set vehicleModelId(String? vehicleModelId) =>
      _$this._vehicleModelId = vehicleModelId;

  String? _categoryLabel;
  String? get categoryLabel => _$this._categoryLabel;
  set categoryLabel(String? categoryLabel) =>
      _$this._categoryLabel = categoryLabel;

  int? _pricePerMinuteCents;
  int? get pricePerMinuteCents => _$this._pricePerMinuteCents;
  set pricePerMinuteCents(int? pricePerMinuteCents) =>
      _$this._pricePerMinuteCents = pricePerMinuteCents;

  VehicleSummaryBuilder() {
    VehicleSummary._defaults(this);
  }

  VehicleSummaryBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _code = $v.code;
      _model = $v.model;
      _status = $v.status;
      _lat = $v.lat;
      _lng = $v.lng;
      _batteryPct = $v.batteryPct;
      _estimatedRangeKm = $v.estimatedRangeKm;
      _distanceM = $v.distanceM;
      _vehicleModelId = $v.vehicleModelId;
      _categoryLabel = $v.categoryLabel;
      _pricePerMinuteCents = $v.pricePerMinuteCents;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleSummary other) {
    _$v = other as _$VehicleSummary;
  }

  @override
  void update(void Function(VehicleSummaryBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleSummary build() => _build();

  _$VehicleSummary _build() {
    final _$result = _$v ??
        _$VehicleSummary._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'VehicleSummary', 'id'),
          code: BuiltValueNullFieldError.checkNotNull(
              code, r'VehicleSummary', 'code'),
          model: BuiltValueNullFieldError.checkNotNull(
              model, r'VehicleSummary', 'model'),
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'VehicleSummary', 'status'),
          lat: BuiltValueNullFieldError.checkNotNull(
              lat, r'VehicleSummary', 'lat'),
          lng: BuiltValueNullFieldError.checkNotNull(
              lng, r'VehicleSummary', 'lng'),
          batteryPct: BuiltValueNullFieldError.checkNotNull(
              batteryPct, r'VehicleSummary', 'batteryPct'),
          estimatedRangeKm: BuiltValueNullFieldError.checkNotNull(
              estimatedRangeKm, r'VehicleSummary', 'estimatedRangeKm'),
          distanceM: distanceM,
          vehicleModelId: vehicleModelId,
          categoryLabel: categoryLabel,
          pricePerMinuteCents: pricePerMinuteCents,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
