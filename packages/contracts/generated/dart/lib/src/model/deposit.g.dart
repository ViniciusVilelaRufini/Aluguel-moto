// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'deposit.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Deposit extends Deposit {
  @override
  final String id;
  @override
  final String? rentalId;
  @override
  final String customerId;
  @override
  final DepositMethod method;
  @override
  final DepositStatus status;
  @override
  final int amountCents;
  @override
  final int? capturedCents;
  @override
  final PixCharge? pix;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  factory _$Deposit([void Function(DepositBuilder)? updates]) =>
      (DepositBuilder()..update(updates))._build();

  _$Deposit._(
      {required this.id,
      this.rentalId,
      required this.customerId,
      required this.method,
      required this.status,
      required this.amountCents,
      this.capturedCents,
      this.pix,
      required this.createdAt,
      required this.updatedAt})
      : super._();
  @override
  Deposit rebuild(void Function(DepositBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DepositBuilder toBuilder() => DepositBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Deposit &&
        id == other.id &&
        rentalId == other.rentalId &&
        customerId == other.customerId &&
        method == other.method &&
        status == other.status &&
        amountCents == other.amountCents &&
        capturedCents == other.capturedCents &&
        pix == other.pix &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, customerId.hashCode);
    _$hash = $jc(_$hash, method.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jc(_$hash, capturedCents.hashCode);
    _$hash = $jc(_$hash, pix.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Deposit')
          ..add('id', id)
          ..add('rentalId', rentalId)
          ..add('customerId', customerId)
          ..add('method', method)
          ..add('status', status)
          ..add('amountCents', amountCents)
          ..add('capturedCents', capturedCents)
          ..add('pix', pix)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class DepositBuilder implements Builder<Deposit, DepositBuilder> {
  _$Deposit? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _customerId;
  String? get customerId => _$this._customerId;
  set customerId(String? customerId) => _$this._customerId = customerId;

  DepositMethod? _method;
  DepositMethod? get method => _$this._method;
  set method(DepositMethod? method) => _$this._method = method;

  DepositStatus? _status;
  DepositStatus? get status => _$this._status;
  set status(DepositStatus? status) => _$this._status = status;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  int? _capturedCents;
  int? get capturedCents => _$this._capturedCents;
  set capturedCents(int? capturedCents) =>
      _$this._capturedCents = capturedCents;

  PixChargeBuilder? _pix;
  PixChargeBuilder get pix => _$this._pix ??= PixChargeBuilder();
  set pix(PixChargeBuilder? pix) => _$this._pix = pix;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  DepositBuilder() {
    Deposit._defaults(this);
  }

  DepositBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _rentalId = $v.rentalId;
      _customerId = $v.customerId;
      _method = $v.method;
      _status = $v.status;
      _amountCents = $v.amountCents;
      _capturedCents = $v.capturedCents;
      _pix = $v.pix?.toBuilder();
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Deposit other) {
    _$v = other as _$Deposit;
  }

  @override
  void update(void Function(DepositBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Deposit build() => _build();

  _$Deposit _build() {
    _$Deposit _$result;
    try {
      _$result = _$v ??
          _$Deposit._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'Deposit', 'id'),
            rentalId: rentalId,
            customerId: BuiltValueNullFieldError.checkNotNull(
                customerId, r'Deposit', 'customerId'),
            method: BuiltValueNullFieldError.checkNotNull(
                method, r'Deposit', 'method'),
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'Deposit', 'status'),
            amountCents: BuiltValueNullFieldError.checkNotNull(
                amountCents, r'Deposit', 'amountCents'),
            capturedCents: capturedCents,
            pix: _pix?.build(),
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'Deposit', 'createdAt'),
            updatedAt: BuiltValueNullFieldError.checkNotNull(
                updatedAt, r'Deposit', 'updatedAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'pix';
        _pix?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'Deposit', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
