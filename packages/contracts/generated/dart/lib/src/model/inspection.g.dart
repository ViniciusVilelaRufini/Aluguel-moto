// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'inspection.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Inspection extends Inspection {
  @override
  final String id;
  @override
  final String fieldTaskId;
  @override
  final String vehicleId;
  @override
  final String inspectorId;
  @override
  final ChecklistItem brakes;
  @override
  final ChecklistItem tires;
  @override
  final ChecklistItem lights;
  @override
  final ChecklistItem bell;
  @override
  final SpeedLimiterCheck speedLimiter;
  @override
  final BuiltList<String> photoObjectKeys;
  @override
  final String? notes;
  @override
  final bool passed;
  @override
  final DateTime recordedAt;
  @override
  final DateTime createdAt;

  factory _$Inspection([void Function(InspectionBuilder)? updates]) =>
      (InspectionBuilder()..update(updates))._build();

  _$Inspection._(
      {required this.id,
      required this.fieldTaskId,
      required this.vehicleId,
      required this.inspectorId,
      required this.brakes,
      required this.tires,
      required this.lights,
      required this.bell,
      required this.speedLimiter,
      required this.photoObjectKeys,
      this.notes,
      required this.passed,
      required this.recordedAt,
      required this.createdAt})
      : super._();
  @override
  Inspection rebuild(void Function(InspectionBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  InspectionBuilder toBuilder() => InspectionBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Inspection &&
        id == other.id &&
        fieldTaskId == other.fieldTaskId &&
        vehicleId == other.vehicleId &&
        inspectorId == other.inspectorId &&
        brakes == other.brakes &&
        tires == other.tires &&
        lights == other.lights &&
        bell == other.bell &&
        speedLimiter == other.speedLimiter &&
        photoObjectKeys == other.photoObjectKeys &&
        notes == other.notes &&
        passed == other.passed &&
        recordedAt == other.recordedAt &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, fieldTaskId.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, inspectorId.hashCode);
    _$hash = $jc(_$hash, brakes.hashCode);
    _$hash = $jc(_$hash, tires.hashCode);
    _$hash = $jc(_$hash, lights.hashCode);
    _$hash = $jc(_$hash, bell.hashCode);
    _$hash = $jc(_$hash, speedLimiter.hashCode);
    _$hash = $jc(_$hash, photoObjectKeys.hashCode);
    _$hash = $jc(_$hash, notes.hashCode);
    _$hash = $jc(_$hash, passed.hashCode);
    _$hash = $jc(_$hash, recordedAt.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Inspection')
          ..add('id', id)
          ..add('fieldTaskId', fieldTaskId)
          ..add('vehicleId', vehicleId)
          ..add('inspectorId', inspectorId)
          ..add('brakes', brakes)
          ..add('tires', tires)
          ..add('lights', lights)
          ..add('bell', bell)
          ..add('speedLimiter', speedLimiter)
          ..add('photoObjectKeys', photoObjectKeys)
          ..add('notes', notes)
          ..add('passed', passed)
          ..add('recordedAt', recordedAt)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class InspectionBuilder implements Builder<Inspection, InspectionBuilder> {
  _$Inspection? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _fieldTaskId;
  String? get fieldTaskId => _$this._fieldTaskId;
  set fieldTaskId(String? fieldTaskId) => _$this._fieldTaskId = fieldTaskId;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _inspectorId;
  String? get inspectorId => _$this._inspectorId;
  set inspectorId(String? inspectorId) => _$this._inspectorId = inspectorId;

  ChecklistItemBuilder? _brakes;
  ChecklistItemBuilder get brakes => _$this._brakes ??= ChecklistItemBuilder();
  set brakes(ChecklistItemBuilder? brakes) => _$this._brakes = brakes;

  ChecklistItemBuilder? _tires;
  ChecklistItemBuilder get tires => _$this._tires ??= ChecklistItemBuilder();
  set tires(ChecklistItemBuilder? tires) => _$this._tires = tires;

  ChecklistItemBuilder? _lights;
  ChecklistItemBuilder get lights => _$this._lights ??= ChecklistItemBuilder();
  set lights(ChecklistItemBuilder? lights) => _$this._lights = lights;

  ChecklistItemBuilder? _bell;
  ChecklistItemBuilder get bell => _$this._bell ??= ChecklistItemBuilder();
  set bell(ChecklistItemBuilder? bell) => _$this._bell = bell;

  SpeedLimiterCheckBuilder? _speedLimiter;
  SpeedLimiterCheckBuilder get speedLimiter =>
      _$this._speedLimiter ??= SpeedLimiterCheckBuilder();
  set speedLimiter(SpeedLimiterCheckBuilder? speedLimiter) =>
      _$this._speedLimiter = speedLimiter;

  ListBuilder<String>? _photoObjectKeys;
  ListBuilder<String> get photoObjectKeys =>
      _$this._photoObjectKeys ??= ListBuilder<String>();
  set photoObjectKeys(ListBuilder<String>? photoObjectKeys) =>
      _$this._photoObjectKeys = photoObjectKeys;

  String? _notes;
  String? get notes => _$this._notes;
  set notes(String? notes) => _$this._notes = notes;

  bool? _passed;
  bool? get passed => _$this._passed;
  set passed(bool? passed) => _$this._passed = passed;

  DateTime? _recordedAt;
  DateTime? get recordedAt => _$this._recordedAt;
  set recordedAt(DateTime? recordedAt) => _$this._recordedAt = recordedAt;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  InspectionBuilder() {
    Inspection._defaults(this);
  }

  InspectionBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _fieldTaskId = $v.fieldTaskId;
      _vehicleId = $v.vehicleId;
      _inspectorId = $v.inspectorId;
      _brakes = $v.brakes.toBuilder();
      _tires = $v.tires.toBuilder();
      _lights = $v.lights.toBuilder();
      _bell = $v.bell.toBuilder();
      _speedLimiter = $v.speedLimiter.toBuilder();
      _photoObjectKeys = $v.photoObjectKeys.toBuilder();
      _notes = $v.notes;
      _passed = $v.passed;
      _recordedAt = $v.recordedAt;
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Inspection other) {
    _$v = other as _$Inspection;
  }

  @override
  void update(void Function(InspectionBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Inspection build() => _build();

  _$Inspection _build() {
    _$Inspection _$result;
    try {
      _$result = _$v ??
          _$Inspection._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'Inspection', 'id'),
            fieldTaskId: BuiltValueNullFieldError.checkNotNull(
                fieldTaskId, r'Inspection', 'fieldTaskId'),
            vehicleId: BuiltValueNullFieldError.checkNotNull(
                vehicleId, r'Inspection', 'vehicleId'),
            inspectorId: BuiltValueNullFieldError.checkNotNull(
                inspectorId, r'Inspection', 'inspectorId'),
            brakes: brakes.build(),
            tires: tires.build(),
            lights: lights.build(),
            bell: bell.build(),
            speedLimiter: speedLimiter.build(),
            photoObjectKeys: photoObjectKeys.build(),
            notes: notes,
            passed: BuiltValueNullFieldError.checkNotNull(
                passed, r'Inspection', 'passed'),
            recordedAt: BuiltValueNullFieldError.checkNotNull(
                recordedAt, r'Inspection', 'recordedAt'),
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'Inspection', 'createdAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'brakes';
        brakes.build();
        _$failedField = 'tires';
        tires.build();
        _$failedField = 'lights';
        lights.build();
        _$failedField = 'bell';
        bell.build();
        _$failedField = 'speedLimiter';
        speedLimiter.build();
        _$failedField = 'photoObjectKeys';
        photoObjectKeys.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'Inspection', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
