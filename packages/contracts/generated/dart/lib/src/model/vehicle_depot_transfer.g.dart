// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_depot_transfer.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleDepotTransfer extends VehicleDepotTransfer {
  @override
  final String depotId;
  @override
  final String reason;

  factory _$VehicleDepotTransfer(
          [void Function(VehicleDepotTransferBuilder)? updates]) =>
      (VehicleDepotTransferBuilder()..update(updates))._build();

  _$VehicleDepotTransfer._({required this.depotId, required this.reason})
      : super._();
  @override
  VehicleDepotTransfer rebuild(
          void Function(VehicleDepotTransferBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleDepotTransferBuilder toBuilder() =>
      VehicleDepotTransferBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleDepotTransfer &&
        depotId == other.depotId &&
        reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, depotId.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehicleDepotTransfer')
          ..add('depotId', depotId)
          ..add('reason', reason))
        .toString();
  }
}

class VehicleDepotTransferBuilder
    implements Builder<VehicleDepotTransfer, VehicleDepotTransferBuilder> {
  _$VehicleDepotTransfer? _$v;

  String? _depotId;
  String? get depotId => _$this._depotId;
  set depotId(String? depotId) => _$this._depotId = depotId;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  VehicleDepotTransferBuilder() {
    VehicleDepotTransfer._defaults(this);
  }

  VehicleDepotTransferBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _depotId = $v.depotId;
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleDepotTransfer other) {
    _$v = other as _$VehicleDepotTransfer;
  }

  @override
  void update(void Function(VehicleDepotTransferBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleDepotTransfer build() => _build();

  _$VehicleDepotTransfer _build() {
    final _$result = _$v ??
        _$VehicleDepotTransfer._(
          depotId: BuiltValueNullFieldError.checkNotNull(
              depotId, r'VehicleDepotTransfer', 'depotId'),
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'VehicleDepotTransfer', 'reason'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
