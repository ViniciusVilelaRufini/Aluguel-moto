// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'inspection_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$InspectionRequest extends InspectionRequest {
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
  final DateTime recordedAt;

  factory _$InspectionRequest(
          [void Function(InspectionRequestBuilder)? updates]) =>
      (InspectionRequestBuilder()..update(updates))._build();

  _$InspectionRequest._(
      {required this.brakes,
      required this.tires,
      required this.lights,
      required this.bell,
      required this.speedLimiter,
      required this.photoObjectKeys,
      this.notes,
      required this.recordedAt})
      : super._();
  @override
  InspectionRequest rebuild(void Function(InspectionRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  InspectionRequestBuilder toBuilder() =>
      InspectionRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is InspectionRequest &&
        brakes == other.brakes &&
        tires == other.tires &&
        lights == other.lights &&
        bell == other.bell &&
        speedLimiter == other.speedLimiter &&
        photoObjectKeys == other.photoObjectKeys &&
        notes == other.notes &&
        recordedAt == other.recordedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, brakes.hashCode);
    _$hash = $jc(_$hash, tires.hashCode);
    _$hash = $jc(_$hash, lights.hashCode);
    _$hash = $jc(_$hash, bell.hashCode);
    _$hash = $jc(_$hash, speedLimiter.hashCode);
    _$hash = $jc(_$hash, photoObjectKeys.hashCode);
    _$hash = $jc(_$hash, notes.hashCode);
    _$hash = $jc(_$hash, recordedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'InspectionRequest')
          ..add('brakes', brakes)
          ..add('tires', tires)
          ..add('lights', lights)
          ..add('bell', bell)
          ..add('speedLimiter', speedLimiter)
          ..add('photoObjectKeys', photoObjectKeys)
          ..add('notes', notes)
          ..add('recordedAt', recordedAt))
        .toString();
  }
}

class InspectionRequestBuilder
    implements Builder<InspectionRequest, InspectionRequestBuilder> {
  _$InspectionRequest? _$v;

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

  DateTime? _recordedAt;
  DateTime? get recordedAt => _$this._recordedAt;
  set recordedAt(DateTime? recordedAt) => _$this._recordedAt = recordedAt;

  InspectionRequestBuilder() {
    InspectionRequest._defaults(this);
  }

  InspectionRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _brakes = $v.brakes.toBuilder();
      _tires = $v.tires.toBuilder();
      _lights = $v.lights.toBuilder();
      _bell = $v.bell.toBuilder();
      _speedLimiter = $v.speedLimiter.toBuilder();
      _photoObjectKeys = $v.photoObjectKeys.toBuilder();
      _notes = $v.notes;
      _recordedAt = $v.recordedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(InspectionRequest other) {
    _$v = other as _$InspectionRequest;
  }

  @override
  void update(void Function(InspectionRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  InspectionRequest build() => _build();

  _$InspectionRequest _build() {
    _$InspectionRequest _$result;
    try {
      _$result = _$v ??
          _$InspectionRequest._(
            brakes: brakes.build(),
            tires: tires.build(),
            lights: lights.build(),
            bell: bell.build(),
            speedLimiter: speedLimiter.build(),
            photoObjectKeys: photoObjectKeys.build(),
            notes: notes,
            recordedAt: BuiltValueNullFieldError.checkNotNull(
                recordedAt, r'InspectionRequest', 'recordedAt'),
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
            r'InspectionRequest', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
