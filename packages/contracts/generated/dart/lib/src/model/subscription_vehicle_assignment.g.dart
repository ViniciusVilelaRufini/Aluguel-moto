// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'subscription_vehicle_assignment.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SubscriptionVehicleAssignment extends SubscriptionVehicleAssignment {
  @override
  final String vehicleId;

  factory _$SubscriptionVehicleAssignment(
          [void Function(SubscriptionVehicleAssignmentBuilder)? updates]) =>
      (SubscriptionVehicleAssignmentBuilder()..update(updates))._build();

  _$SubscriptionVehicleAssignment._({required this.vehicleId}) : super._();
  @override
  SubscriptionVehicleAssignment rebuild(
          void Function(SubscriptionVehicleAssignmentBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SubscriptionVehicleAssignmentBuilder toBuilder() =>
      SubscriptionVehicleAssignmentBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SubscriptionVehicleAssignment &&
        vehicleId == other.vehicleId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SubscriptionVehicleAssignment')
          ..add('vehicleId', vehicleId))
        .toString();
  }
}

class SubscriptionVehicleAssignmentBuilder
    implements
        Builder<SubscriptionVehicleAssignment,
            SubscriptionVehicleAssignmentBuilder> {
  _$SubscriptionVehicleAssignment? _$v;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  SubscriptionVehicleAssignmentBuilder() {
    SubscriptionVehicleAssignment._defaults(this);
  }

  SubscriptionVehicleAssignmentBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _vehicleId = $v.vehicleId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SubscriptionVehicleAssignment other) {
    _$v = other as _$SubscriptionVehicleAssignment;
  }

  @override
  void update(void Function(SubscriptionVehicleAssignmentBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SubscriptionVehicleAssignment build() => _build();

  _$SubscriptionVehicleAssignment _build() {
    final _$result = _$v ??
        _$SubscriptionVehicleAssignment._(
          vehicleId: BuiltValueNullFieldError.checkNotNull(
              vehicleId, r'SubscriptionVehicleAssignment', 'vehicleId'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
