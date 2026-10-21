// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'wallet_adjustment_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$WalletAdjustmentRequest extends WalletAdjustmentRequest {
  @override
  final int amountCents;
  @override
  final String reason;

  factory _$WalletAdjustmentRequest(
          [void Function(WalletAdjustmentRequestBuilder)? updates]) =>
      (WalletAdjustmentRequestBuilder()..update(updates))._build();

  _$WalletAdjustmentRequest._({required this.amountCents, required this.reason})
      : super._();
  @override
  WalletAdjustmentRequest rebuild(
          void Function(WalletAdjustmentRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  WalletAdjustmentRequestBuilder toBuilder() =>
      WalletAdjustmentRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is WalletAdjustmentRequest &&
        amountCents == other.amountCents &&
        reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'WalletAdjustmentRequest')
          ..add('amountCents', amountCents)
          ..add('reason', reason))
        .toString();
  }
}

class WalletAdjustmentRequestBuilder
    implements
        Builder<WalletAdjustmentRequest, WalletAdjustmentRequestBuilder> {
  _$WalletAdjustmentRequest? _$v;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  WalletAdjustmentRequestBuilder() {
    WalletAdjustmentRequest._defaults(this);
  }

  WalletAdjustmentRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _amountCents = $v.amountCents;
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(WalletAdjustmentRequest other) {
    _$v = other as _$WalletAdjustmentRequest;
  }

  @override
  void update(void Function(WalletAdjustmentRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  WalletAdjustmentRequest build() => _build();

  _$WalletAdjustmentRequest _build() {
    final _$result = _$v ??
        _$WalletAdjustmentRequest._(
          amountCents: BuiltValueNullFieldError.checkNotNull(
              amountCents, r'WalletAdjustmentRequest', 'amountCents'),
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'WalletAdjustmentRequest', 'reason'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
