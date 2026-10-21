// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'swap_vehicle_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SwapVehicleRequest extends SwapVehicleRequest {
  @override
  final String newVehicleId;
  @override
  final String reason;
  @override
  final String? incidentId;

  factory _$SwapVehicleRequest(
          [void Function(SwapVehicleRequestBuilder)? updates]) =>
      (SwapVehicleRequestBuilder()..update(updates))._build();

  _$SwapVehicleRequest._(
      {required this.newVehicleId, required this.reason, this.incidentId})
      : super._();
  @override
  SwapVehicleRequest rebuild(
          void Function(SwapVehicleRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SwapVehicleRequestBuilder toBuilder() =>
      SwapVehicleRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SwapVehicleRequest &&
        newVehicleId == other.newVehicleId &&
        reason == other.reason &&
        incidentId == other.incidentId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, newVehicleId.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, incidentId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SwapVehicleRequest')
          ..add('newVehicleId', newVehicleId)
          ..add('reason', reason)
          ..add('incidentId', incidentId))
        .toString();
  }
}

class SwapVehicleRequestBuilder
    implements Builder<SwapVehicleRequest, SwapVehicleRequestBuilder> {
  _$SwapVehicleRequest? _$v;

  String? _newVehicleId;
  String? get newVehicleId => _$this._newVehicleId;
  set newVehicleId(String? newVehicleId) => _$this._newVehicleId = newVehicleId;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  String? _incidentId;
  String? get incidentId => _$this._incidentId;
  set incidentId(String? incidentId) => _$this._incidentId = incidentId;

  SwapVehicleRequestBuilder() {
    SwapVehicleRequest._defaults(this);
  }

  SwapVehicleRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _newVehicleId = $v.newVehicleId;
      _reason = $v.reason;
      _incidentId = $v.incidentId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SwapVehicleRequest other) {
    _$v = other as _$SwapVehicleRequest;
  }

  @override
  void update(void Function(SwapVehicleRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SwapVehicleRequest build() => _build();

  _$SwapVehicleRequest _build() {
    final _$result = _$v ??
        _$SwapVehicleRequest._(
          newVehicleId: BuiltValueNullFieldError.checkNotNull(
              newVehicleId, r'SwapVehicleRequest', 'newVehicleId'),
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'SwapVehicleRequest', 'reason'),
          incidentId: incidentId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
