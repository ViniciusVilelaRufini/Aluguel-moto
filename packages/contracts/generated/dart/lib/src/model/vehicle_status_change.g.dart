// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_status_change.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleStatusChange extends VehicleStatusChange {
  @override
  final ServiceVehicleStatus status;
  @override
  final String reason;

  factory _$VehicleStatusChange(
          [void Function(VehicleStatusChangeBuilder)? updates]) =>
      (VehicleStatusChangeBuilder()..update(updates))._build();

  _$VehicleStatusChange._({required this.status, required this.reason})
      : super._();
  @override
  VehicleStatusChange rebuild(
          void Function(VehicleStatusChangeBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleStatusChangeBuilder toBuilder() =>
      VehicleStatusChangeBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleStatusChange &&
        status == other.status &&
        reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehicleStatusChange')
          ..add('status', status)
          ..add('reason', reason))
        .toString();
  }
}

class VehicleStatusChangeBuilder
    implements Builder<VehicleStatusChange, VehicleStatusChangeBuilder> {
  _$VehicleStatusChange? _$v;

  ServiceVehicleStatus? _status;
  ServiceVehicleStatus? get status => _$this._status;
  set status(ServiceVehicleStatus? status) => _$this._status = status;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  VehicleStatusChangeBuilder() {
    VehicleStatusChange._defaults(this);
  }

  VehicleStatusChangeBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _status = $v.status;
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleStatusChange other) {
    _$v = other as _$VehicleStatusChange;
  }

  @override
  void update(void Function(VehicleStatusChangeBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleStatusChange build() => _build();

  _$VehicleStatusChange _build() {
    final _$result = _$v ??
        _$VehicleStatusChange._(
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'VehicleStatusChange', 'status'),
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'VehicleStatusChange', 'reason'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
