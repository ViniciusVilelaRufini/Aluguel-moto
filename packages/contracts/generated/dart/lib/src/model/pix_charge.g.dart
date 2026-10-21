// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pix_charge.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PixCharge extends PixCharge {
  @override
  final String chargeId;
  @override
  final String qrCodeBase64;
  @override
  final String copyPaste;
  @override
  final DateTime expiresAt;

  factory _$PixCharge([void Function(PixChargeBuilder)? updates]) =>
      (PixChargeBuilder()..update(updates))._build();

  _$PixCharge._(
      {required this.chargeId,
      required this.qrCodeBase64,
      required this.copyPaste,
      required this.expiresAt})
      : super._();
  @override
  PixCharge rebuild(void Function(PixChargeBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PixChargeBuilder toBuilder() => PixChargeBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PixCharge &&
        chargeId == other.chargeId &&
        qrCodeBase64 == other.qrCodeBase64 &&
        copyPaste == other.copyPaste &&
        expiresAt == other.expiresAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, chargeId.hashCode);
    _$hash = $jc(_$hash, qrCodeBase64.hashCode);
    _$hash = $jc(_$hash, copyPaste.hashCode);
    _$hash = $jc(_$hash, expiresAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PixCharge')
          ..add('chargeId', chargeId)
          ..add('qrCodeBase64', qrCodeBase64)
          ..add('copyPaste', copyPaste)
          ..add('expiresAt', expiresAt))
        .toString();
  }
}

class PixChargeBuilder implements Builder<PixCharge, PixChargeBuilder> {
  _$PixCharge? _$v;

  String? _chargeId;
  String? get chargeId => _$this._chargeId;
  set chargeId(String? chargeId) => _$this._chargeId = chargeId;

  String? _qrCodeBase64;
  String? get qrCodeBase64 => _$this._qrCodeBase64;
  set qrCodeBase64(String? qrCodeBase64) => _$this._qrCodeBase64 = qrCodeBase64;

  String? _copyPaste;
  String? get copyPaste => _$this._copyPaste;
  set copyPaste(String? copyPaste) => _$this._copyPaste = copyPaste;

  DateTime? _expiresAt;
  DateTime? get expiresAt => _$this._expiresAt;
  set expiresAt(DateTime? expiresAt) => _$this._expiresAt = expiresAt;

  PixChargeBuilder() {
    PixCharge._defaults(this);
  }

  PixChargeBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _chargeId = $v.chargeId;
      _qrCodeBase64 = $v.qrCodeBase64;
      _copyPaste = $v.copyPaste;
      _expiresAt = $v.expiresAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PixCharge other) {
    _$v = other as _$PixCharge;
  }

  @override
  void update(void Function(PixChargeBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PixCharge build() => _build();

  _$PixCharge _build() {
    final _$result = _$v ??
        _$PixCharge._(
          chargeId: BuiltValueNullFieldError.checkNotNull(
              chargeId, r'PixCharge', 'chargeId'),
          qrCodeBase64: BuiltValueNullFieldError.checkNotNull(
              qrCodeBase64, r'PixCharge', 'qrCodeBase64'),
          copyPaste: BuiltValueNullFieldError.checkNotNull(
              copyPaste, r'PixCharge', 'copyPaste'),
          expiresAt: BuiltValueNullFieldError.checkNotNull(
              expiresAt, r'PixCharge', 'expiresAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
