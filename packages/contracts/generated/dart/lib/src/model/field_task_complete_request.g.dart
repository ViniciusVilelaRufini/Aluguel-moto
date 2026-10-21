// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'field_task_complete_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$FieldTaskCompleteRequest extends FieldTaskCompleteRequest {
  @override
  final String? notes;
  @override
  final ServiceVehicleStatus? vehicleStatus;
  @override
  final DateTime? completedAt;

  factory _$FieldTaskCompleteRequest(
          [void Function(FieldTaskCompleteRequestBuilder)? updates]) =>
      (FieldTaskCompleteRequestBuilder()..update(updates))._build();

  _$FieldTaskCompleteRequest._(
      {this.notes, this.vehicleStatus, this.completedAt})
      : super._();
  @override
  FieldTaskCompleteRequest rebuild(
          void Function(FieldTaskCompleteRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  FieldTaskCompleteRequestBuilder toBuilder() =>
      FieldTaskCompleteRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is FieldTaskCompleteRequest &&
        notes == other.notes &&
        vehicleStatus == other.vehicleStatus &&
        completedAt == other.completedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, notes.hashCode);
    _$hash = $jc(_$hash, vehicleStatus.hashCode);
    _$hash = $jc(_$hash, completedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'FieldTaskCompleteRequest')
          ..add('notes', notes)
          ..add('vehicleStatus', vehicleStatus)
          ..add('completedAt', completedAt))
        .toString();
  }
}

class FieldTaskCompleteRequestBuilder
    implements
        Builder<FieldTaskCompleteRequest, FieldTaskCompleteRequestBuilder> {
  _$FieldTaskCompleteRequest? _$v;

  String? _notes;
  String? get notes => _$this._notes;
  set notes(String? notes) => _$this._notes = notes;

  ServiceVehicleStatus? _vehicleStatus;
  ServiceVehicleStatus? get vehicleStatus => _$this._vehicleStatus;
  set vehicleStatus(ServiceVehicleStatus? vehicleStatus) =>
      _$this._vehicleStatus = vehicleStatus;

  DateTime? _completedAt;
  DateTime? get completedAt => _$this._completedAt;
  set completedAt(DateTime? completedAt) => _$this._completedAt = completedAt;

  FieldTaskCompleteRequestBuilder() {
    FieldTaskCompleteRequest._defaults(this);
  }

  FieldTaskCompleteRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _notes = $v.notes;
      _vehicleStatus = $v.vehicleStatus;
      _completedAt = $v.completedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(FieldTaskCompleteRequest other) {
    _$v = other as _$FieldTaskCompleteRequest;
  }

  @override
  void update(void Function(FieldTaskCompleteRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  FieldTaskCompleteRequest build() => _build();

  _$FieldTaskCompleteRequest _build() {
    final _$result = _$v ??
        _$FieldTaskCompleteRequest._(
          notes: notes,
          vehicleStatus: vehicleStatus,
          completedAt: completedAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
