// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'battery_transfer_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$BatteryTransferRequest extends BatteryTransferRequest {
  @override
  final BuiltList<String> serials;
  @override
  final String? stationId;
  @override
  final int? chargePct;

  factory _$BatteryTransferRequest(
          [void Function(BatteryTransferRequestBuilder)? updates]) =>
      (BatteryTransferRequestBuilder()..update(updates))._build();

  _$BatteryTransferRequest._(
      {required this.serials, this.stationId, this.chargePct})
      : super._();
  @override
  BatteryTransferRequest rebuild(
          void Function(BatteryTransferRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  BatteryTransferRequestBuilder toBuilder() =>
      BatteryTransferRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is BatteryTransferRequest &&
        serials == other.serials &&
        stationId == other.stationId &&
        chargePct == other.chargePct;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, serials.hashCode);
    _$hash = $jc(_$hash, stationId.hashCode);
    _$hash = $jc(_$hash, chargePct.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'BatteryTransferRequest')
          ..add('serials', serials)
          ..add('stationId', stationId)
          ..add('chargePct', chargePct))
        .toString();
  }
}

class BatteryTransferRequestBuilder
    implements Builder<BatteryTransferRequest, BatteryTransferRequestBuilder> {
  _$BatteryTransferRequest? _$v;

  ListBuilder<String>? _serials;
  ListBuilder<String> get serials => _$this._serials ??= ListBuilder<String>();
  set serials(ListBuilder<String>? serials) => _$this._serials = serials;

  String? _stationId;
  String? get stationId => _$this._stationId;
  set stationId(String? stationId) => _$this._stationId = stationId;

  int? _chargePct;
  int? get chargePct => _$this._chargePct;
  set chargePct(int? chargePct) => _$this._chargePct = chargePct;

  BatteryTransferRequestBuilder() {
    BatteryTransferRequest._defaults(this);
  }

  BatteryTransferRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _serials = $v.serials.toBuilder();
      _stationId = $v.stationId;
      _chargePct = $v.chargePct;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(BatteryTransferRequest other) {
    _$v = other as _$BatteryTransferRequest;
  }

  @override
  void update(void Function(BatteryTransferRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  BatteryTransferRequest build() => _build();

  _$BatteryTransferRequest _build() {
    _$BatteryTransferRequest _$result;
    try {
      _$result = _$v ??
          _$BatteryTransferRequest._(
            serials: serials.build(),
            stationId: stationId,
            chargePct: chargePct,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'serials';
        serials.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'BatteryTransferRequest', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
