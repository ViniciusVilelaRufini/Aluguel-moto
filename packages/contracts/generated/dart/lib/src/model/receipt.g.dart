// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'receipt.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Receipt extends Receipt {
  @override
  final String rentalId;
  @override
  final String number;
  @override
  final DateTime issuedAt;
  @override
  final String? customerName;
  @override
  final String vehicleCode;
  @override
  final PlanCode planCode;
  @override
  final InsuranceCoverage coverage;
  @override
  final DateTime startedAt;
  @override
  final DateTime endedAt;
  @override
  final int durationSeconds;
  @override
  final PriceBreakdown breakdown;
  @override
  final PaymentMethod? paymentMethod;
  @override
  final String? cardLast4;
  @override
  final String? pdfUrl;
  @override
  final String? invoiceNumber;
  @override
  final BuiltList<TrackPoint>? track;

  factory _$Receipt([void Function(ReceiptBuilder)? updates]) =>
      (ReceiptBuilder()..update(updates))._build();

  _$Receipt._(
      {required this.rentalId,
      required this.number,
      required this.issuedAt,
      this.customerName,
      required this.vehicleCode,
      required this.planCode,
      required this.coverage,
      required this.startedAt,
      required this.endedAt,
      required this.durationSeconds,
      required this.breakdown,
      this.paymentMethod,
      this.cardLast4,
      this.pdfUrl,
      this.invoiceNumber,
      this.track})
      : super._();
  @override
  Receipt rebuild(void Function(ReceiptBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ReceiptBuilder toBuilder() => ReceiptBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Receipt &&
        rentalId == other.rentalId &&
        number == other.number &&
        issuedAt == other.issuedAt &&
        customerName == other.customerName &&
        vehicleCode == other.vehicleCode &&
        planCode == other.planCode &&
        coverage == other.coverage &&
        startedAt == other.startedAt &&
        endedAt == other.endedAt &&
        durationSeconds == other.durationSeconds &&
        breakdown == other.breakdown &&
        paymentMethod == other.paymentMethod &&
        cardLast4 == other.cardLast4 &&
        pdfUrl == other.pdfUrl &&
        invoiceNumber == other.invoiceNumber &&
        track == other.track;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, number.hashCode);
    _$hash = $jc(_$hash, issuedAt.hashCode);
    _$hash = $jc(_$hash, customerName.hashCode);
    _$hash = $jc(_$hash, vehicleCode.hashCode);
    _$hash = $jc(_$hash, planCode.hashCode);
    _$hash = $jc(_$hash, coverage.hashCode);
    _$hash = $jc(_$hash, startedAt.hashCode);
    _$hash = $jc(_$hash, endedAt.hashCode);
    _$hash = $jc(_$hash, durationSeconds.hashCode);
    _$hash = $jc(_$hash, breakdown.hashCode);
    _$hash = $jc(_$hash, paymentMethod.hashCode);
    _$hash = $jc(_$hash, cardLast4.hashCode);
    _$hash = $jc(_$hash, pdfUrl.hashCode);
    _$hash = $jc(_$hash, invoiceNumber.hashCode);
    _$hash = $jc(_$hash, track.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Receipt')
          ..add('rentalId', rentalId)
          ..add('number', number)
          ..add('issuedAt', issuedAt)
          ..add('customerName', customerName)
          ..add('vehicleCode', vehicleCode)
          ..add('planCode', planCode)
          ..add('coverage', coverage)
          ..add('startedAt', startedAt)
          ..add('endedAt', endedAt)
          ..add('durationSeconds', durationSeconds)
          ..add('breakdown', breakdown)
          ..add('paymentMethod', paymentMethod)
          ..add('cardLast4', cardLast4)
          ..add('pdfUrl', pdfUrl)
          ..add('invoiceNumber', invoiceNumber)
          ..add('track', track))
        .toString();
  }
}

class ReceiptBuilder implements Builder<Receipt, ReceiptBuilder> {
  _$Receipt? _$v;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _number;
  String? get number => _$this._number;
  set number(String? number) => _$this._number = number;

  DateTime? _issuedAt;
  DateTime? get issuedAt => _$this._issuedAt;
  set issuedAt(DateTime? issuedAt) => _$this._issuedAt = issuedAt;

  String? _customerName;
  String? get customerName => _$this._customerName;
  set customerName(String? customerName) => _$this._customerName = customerName;

  String? _vehicleCode;
  String? get vehicleCode => _$this._vehicleCode;
  set vehicleCode(String? vehicleCode) => _$this._vehicleCode = vehicleCode;

  PlanCode? _planCode;
  PlanCode? get planCode => _$this._planCode;
  set planCode(PlanCode? planCode) => _$this._planCode = planCode;

  InsuranceCoverage? _coverage;
  InsuranceCoverage? get coverage => _$this._coverage;
  set coverage(InsuranceCoverage? coverage) => _$this._coverage = coverage;

  DateTime? _startedAt;
  DateTime? get startedAt => _$this._startedAt;
  set startedAt(DateTime? startedAt) => _$this._startedAt = startedAt;

  DateTime? _endedAt;
  DateTime? get endedAt => _$this._endedAt;
  set endedAt(DateTime? endedAt) => _$this._endedAt = endedAt;

  int? _durationSeconds;
  int? get durationSeconds => _$this._durationSeconds;
  set durationSeconds(int? durationSeconds) =>
      _$this._durationSeconds = durationSeconds;

  PriceBreakdownBuilder? _breakdown;
  PriceBreakdownBuilder get breakdown =>
      _$this._breakdown ??= PriceBreakdownBuilder();
  set breakdown(PriceBreakdownBuilder? breakdown) =>
      _$this._breakdown = breakdown;

  PaymentMethod? _paymentMethod;
  PaymentMethod? get paymentMethod => _$this._paymentMethod;
  set paymentMethod(PaymentMethod? paymentMethod) =>
      _$this._paymentMethod = paymentMethod;

  String? _cardLast4;
  String? get cardLast4 => _$this._cardLast4;
  set cardLast4(String? cardLast4) => _$this._cardLast4 = cardLast4;

  String? _pdfUrl;
  String? get pdfUrl => _$this._pdfUrl;
  set pdfUrl(String? pdfUrl) => _$this._pdfUrl = pdfUrl;

  String? _invoiceNumber;
  String? get invoiceNumber => _$this._invoiceNumber;
  set invoiceNumber(String? invoiceNumber) =>
      _$this._invoiceNumber = invoiceNumber;

  ListBuilder<TrackPoint>? _track;
  ListBuilder<TrackPoint> get track =>
      _$this._track ??= ListBuilder<TrackPoint>();
  set track(ListBuilder<TrackPoint>? track) => _$this._track = track;

  ReceiptBuilder() {
    Receipt._defaults(this);
  }

  ReceiptBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _rentalId = $v.rentalId;
      _number = $v.number;
      _issuedAt = $v.issuedAt;
      _customerName = $v.customerName;
      _vehicleCode = $v.vehicleCode;
      _planCode = $v.planCode;
      _coverage = $v.coverage;
      _startedAt = $v.startedAt;
      _endedAt = $v.endedAt;
      _durationSeconds = $v.durationSeconds;
      _breakdown = $v.breakdown.toBuilder();
      _paymentMethod = $v.paymentMethod;
      _cardLast4 = $v.cardLast4;
      _pdfUrl = $v.pdfUrl;
      _invoiceNumber = $v.invoiceNumber;
      _track = $v.track?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Receipt other) {
    _$v = other as _$Receipt;
  }

  @override
  void update(void Function(ReceiptBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Receipt build() => _build();

  _$Receipt _build() {
    _$Receipt _$result;
    try {
      _$result = _$v ??
          _$Receipt._(
            rentalId: BuiltValueNullFieldError.checkNotNull(
                rentalId, r'Receipt', 'rentalId'),
            number: BuiltValueNullFieldError.checkNotNull(
                number, r'Receipt', 'number'),
            issuedAt: BuiltValueNullFieldError.checkNotNull(
                issuedAt, r'Receipt', 'issuedAt'),
            customerName: customerName,
            vehicleCode: BuiltValueNullFieldError.checkNotNull(
                vehicleCode, r'Receipt', 'vehicleCode'),
            planCode: BuiltValueNullFieldError.checkNotNull(
                planCode, r'Receipt', 'planCode'),
            coverage: BuiltValueNullFieldError.checkNotNull(
                coverage, r'Receipt', 'coverage'),
            startedAt: BuiltValueNullFieldError.checkNotNull(
                startedAt, r'Receipt', 'startedAt'),
            endedAt: BuiltValueNullFieldError.checkNotNull(
                endedAt, r'Receipt', 'endedAt'),
            durationSeconds: BuiltValueNullFieldError.checkNotNull(
                durationSeconds, r'Receipt', 'durationSeconds'),
            breakdown: breakdown.build(),
            paymentMethod: paymentMethod,
            cardLast4: cardLast4,
            pdfUrl: pdfUrl,
            invoiceNumber: invoiceNumber,
            track: _track?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'breakdown';
        breakdown.build();

        _$failedField = 'track';
        _track?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'Receipt', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
