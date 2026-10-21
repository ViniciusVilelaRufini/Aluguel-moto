// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Payment extends Payment {
  @override
  final String id;
  @override
  final String customerId;
  @override
  final String? rentalId;
  @override
  final String? depositId;
  @override
  final String? subscriptionId;
  @override
  final PaymentKind kind;
  @override
  final PaymentMethod method;
  @override
  final PaymentStatus status;
  @override
  final int amountCents;
  @override
  final int refundedCents;
  @override
  final String? cardLast4;
  @override
  final String? failureReason;
  @override
  final String? providerPaymentId;
  @override
  final String? receiptUrl;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  factory _$Payment([void Function(PaymentBuilder)? updates]) =>
      (PaymentBuilder()..update(updates))._build();

  _$Payment._(
      {required this.id,
      required this.customerId,
      this.rentalId,
      this.depositId,
      this.subscriptionId,
      required this.kind,
      required this.method,
      required this.status,
      required this.amountCents,
      required this.refundedCents,
      this.cardLast4,
      this.failureReason,
      this.providerPaymentId,
      this.receiptUrl,
      required this.createdAt,
      required this.updatedAt})
      : super._();
  @override
  Payment rebuild(void Function(PaymentBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PaymentBuilder toBuilder() => PaymentBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Payment &&
        id == other.id &&
        customerId == other.customerId &&
        rentalId == other.rentalId &&
        depositId == other.depositId &&
        subscriptionId == other.subscriptionId &&
        kind == other.kind &&
        method == other.method &&
        status == other.status &&
        amountCents == other.amountCents &&
        refundedCents == other.refundedCents &&
        cardLast4 == other.cardLast4 &&
        failureReason == other.failureReason &&
        providerPaymentId == other.providerPaymentId &&
        receiptUrl == other.receiptUrl &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, customerId.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, depositId.hashCode);
    _$hash = $jc(_$hash, subscriptionId.hashCode);
    _$hash = $jc(_$hash, kind.hashCode);
    _$hash = $jc(_$hash, method.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jc(_$hash, refundedCents.hashCode);
    _$hash = $jc(_$hash, cardLast4.hashCode);
    _$hash = $jc(_$hash, failureReason.hashCode);
    _$hash = $jc(_$hash, providerPaymentId.hashCode);
    _$hash = $jc(_$hash, receiptUrl.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Payment')
          ..add('id', id)
          ..add('customerId', customerId)
          ..add('rentalId', rentalId)
          ..add('depositId', depositId)
          ..add('subscriptionId', subscriptionId)
          ..add('kind', kind)
          ..add('method', method)
          ..add('status', status)
          ..add('amountCents', amountCents)
          ..add('refundedCents', refundedCents)
          ..add('cardLast4', cardLast4)
          ..add('failureReason', failureReason)
          ..add('providerPaymentId', providerPaymentId)
          ..add('receiptUrl', receiptUrl)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class PaymentBuilder implements Builder<Payment, PaymentBuilder> {
  _$Payment? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _customerId;
  String? get customerId => _$this._customerId;
  set customerId(String? customerId) => _$this._customerId = customerId;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _depositId;
  String? get depositId => _$this._depositId;
  set depositId(String? depositId) => _$this._depositId = depositId;

  String? _subscriptionId;
  String? get subscriptionId => _$this._subscriptionId;
  set subscriptionId(String? subscriptionId) =>
      _$this._subscriptionId = subscriptionId;

  PaymentKind? _kind;
  PaymentKind? get kind => _$this._kind;
  set kind(PaymentKind? kind) => _$this._kind = kind;

  PaymentMethod? _method;
  PaymentMethod? get method => _$this._method;
  set method(PaymentMethod? method) => _$this._method = method;

  PaymentStatus? _status;
  PaymentStatus? get status => _$this._status;
  set status(PaymentStatus? status) => _$this._status = status;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  int? _refundedCents;
  int? get refundedCents => _$this._refundedCents;
  set refundedCents(int? refundedCents) =>
      _$this._refundedCents = refundedCents;

  String? _cardLast4;
  String? get cardLast4 => _$this._cardLast4;
  set cardLast4(String? cardLast4) => _$this._cardLast4 = cardLast4;

  String? _failureReason;
  String? get failureReason => _$this._failureReason;
  set failureReason(String? failureReason) =>
      _$this._failureReason = failureReason;

  String? _providerPaymentId;
  String? get providerPaymentId => _$this._providerPaymentId;
  set providerPaymentId(String? providerPaymentId) =>
      _$this._providerPaymentId = providerPaymentId;

  String? _receiptUrl;
  String? get receiptUrl => _$this._receiptUrl;
  set receiptUrl(String? receiptUrl) => _$this._receiptUrl = receiptUrl;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  PaymentBuilder() {
    Payment._defaults(this);
  }

  PaymentBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _customerId = $v.customerId;
      _rentalId = $v.rentalId;
      _depositId = $v.depositId;
      _subscriptionId = $v.subscriptionId;
      _kind = $v.kind;
      _method = $v.method;
      _status = $v.status;
      _amountCents = $v.amountCents;
      _refundedCents = $v.refundedCents;
      _cardLast4 = $v.cardLast4;
      _failureReason = $v.failureReason;
      _providerPaymentId = $v.providerPaymentId;
      _receiptUrl = $v.receiptUrl;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Payment other) {
    _$v = other as _$Payment;
  }

  @override
  void update(void Function(PaymentBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Payment build() => _build();

  _$Payment _build() {
    final _$result = _$v ??
        _$Payment._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'Payment', 'id'),
          customerId: BuiltValueNullFieldError.checkNotNull(
              customerId, r'Payment', 'customerId'),
          rentalId: rentalId,
          depositId: depositId,
          subscriptionId: subscriptionId,
          kind: BuiltValueNullFieldError.checkNotNull(kind, r'Payment', 'kind'),
          method: BuiltValueNullFieldError.checkNotNull(
              method, r'Payment', 'method'),
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'Payment', 'status'),
          amountCents: BuiltValueNullFieldError.checkNotNull(
              amountCents, r'Payment', 'amountCents'),
          refundedCents: BuiltValueNullFieldError.checkNotNull(
              refundedCents, r'Payment', 'refundedCents'),
          cardLast4: cardLast4,
          failureReason: failureReason,
          providerPaymentId: providerPaymentId,
          receiptUrl: receiptUrl,
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'Payment', 'createdAt'),
          updatedAt: BuiltValueNullFieldError.checkNotNull(
              updatedAt, r'Payment', 'updatedAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
