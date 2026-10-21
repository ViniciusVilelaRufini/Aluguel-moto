// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dispute_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DisputeCreate extends DisputeCreate {
  @override
  final String rentalId;
  @override
  final String? paymentId;
  @override
  final String reason;
  @override
  final String? description;

  factory _$DisputeCreate([void Function(DisputeCreateBuilder)? updates]) =>
      (DisputeCreateBuilder()..update(updates))._build();

  _$DisputeCreate._(
      {required this.rentalId,
      this.paymentId,
      required this.reason,
      this.description})
      : super._();
  @override
  DisputeCreate rebuild(void Function(DisputeCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DisputeCreateBuilder toBuilder() => DisputeCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DisputeCreate &&
        rentalId == other.rentalId &&
        paymentId == other.paymentId &&
        reason == other.reason &&
        description == other.description;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, paymentId.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DisputeCreate')
          ..add('rentalId', rentalId)
          ..add('paymentId', paymentId)
          ..add('reason', reason)
          ..add('description', description))
        .toString();
  }
}

class DisputeCreateBuilder
    implements Builder<DisputeCreate, DisputeCreateBuilder> {
  _$DisputeCreate? _$v;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _paymentId;
  String? get paymentId => _$this._paymentId;
  set paymentId(String? paymentId) => _$this._paymentId = paymentId;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  DisputeCreateBuilder() {
    DisputeCreate._defaults(this);
  }

  DisputeCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _rentalId = $v.rentalId;
      _paymentId = $v.paymentId;
      _reason = $v.reason;
      _description = $v.description;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DisputeCreate other) {
    _$v = other as _$DisputeCreate;
  }

  @override
  void update(void Function(DisputeCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DisputeCreate build() => _build();

  _$DisputeCreate _build() {
    final _$result = _$v ??
        _$DisputeCreate._(
          rentalId: BuiltValueNullFieldError.checkNotNull(
              rentalId, r'DisputeCreate', 'rentalId'),
          paymentId: paymentId,
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'DisputeCreate', 'reason'),
          description: description,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
