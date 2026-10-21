// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'top_up.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$TopUp extends TopUp {
  @override
  final String id;
  @override
  final TopUpStatus status;
  @override
  final TopUpMethod method;
  @override
  final int amountCents;
  @override
  final String? packageId;
  @override
  final int? minutes;
  @override
  final PixCharge? pix;
  @override
  final String? paymentId;
  @override
  final DateTime createdAt;

  factory _$TopUp([void Function(TopUpBuilder)? updates]) =>
      (TopUpBuilder()..update(updates))._build();

  _$TopUp._(
      {required this.id,
      required this.status,
      required this.method,
      required this.amountCents,
      this.packageId,
      this.minutes,
      this.pix,
      this.paymentId,
      required this.createdAt})
      : super._();
  @override
  TopUp rebuild(void Function(TopUpBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  TopUpBuilder toBuilder() => TopUpBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is TopUp &&
        id == other.id &&
        status == other.status &&
        method == other.method &&
        amountCents == other.amountCents &&
        packageId == other.packageId &&
        minutes == other.minutes &&
        pix == other.pix &&
        paymentId == other.paymentId &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, method.hashCode);
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jc(_$hash, packageId.hashCode);
    _$hash = $jc(_$hash, minutes.hashCode);
    _$hash = $jc(_$hash, pix.hashCode);
    _$hash = $jc(_$hash, paymentId.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'TopUp')
          ..add('id', id)
          ..add('status', status)
          ..add('method', method)
          ..add('amountCents', amountCents)
          ..add('packageId', packageId)
          ..add('minutes', minutes)
          ..add('pix', pix)
          ..add('paymentId', paymentId)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class TopUpBuilder implements Builder<TopUp, TopUpBuilder> {
  _$TopUp? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  TopUpStatus? _status;
  TopUpStatus? get status => _$this._status;
  set status(TopUpStatus? status) => _$this._status = status;

  TopUpMethod? _method;
  TopUpMethod? get method => _$this._method;
  set method(TopUpMethod? method) => _$this._method = method;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  String? _packageId;
  String? get packageId => _$this._packageId;
  set packageId(String? packageId) => _$this._packageId = packageId;

  int? _minutes;
  int? get minutes => _$this._minutes;
  set minutes(int? minutes) => _$this._minutes = minutes;

  PixChargeBuilder? _pix;
  PixChargeBuilder get pix => _$this._pix ??= PixChargeBuilder();
  set pix(PixChargeBuilder? pix) => _$this._pix = pix;

  String? _paymentId;
  String? get paymentId => _$this._paymentId;
  set paymentId(String? paymentId) => _$this._paymentId = paymentId;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  TopUpBuilder() {
    TopUp._defaults(this);
  }

  TopUpBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _status = $v.status;
      _method = $v.method;
      _amountCents = $v.amountCents;
      _packageId = $v.packageId;
      _minutes = $v.minutes;
      _pix = $v.pix?.toBuilder();
      _paymentId = $v.paymentId;
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(TopUp other) {
    _$v = other as _$TopUp;
  }

  @override
  void update(void Function(TopUpBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  TopUp build() => _build();

  _$TopUp _build() {
    _$TopUp _$result;
    try {
      _$result = _$v ??
          _$TopUp._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'TopUp', 'id'),
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'TopUp', 'status'),
            method: BuiltValueNullFieldError.checkNotNull(
                method, r'TopUp', 'method'),
            amountCents: BuiltValueNullFieldError.checkNotNull(
                amountCents, r'TopUp', 'amountCents'),
            packageId: packageId,
            minutes: minutes,
            pix: _pix?.build(),
            paymentId: paymentId,
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'TopUp', 'createdAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'pix';
        _pix?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(r'TopUp', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
