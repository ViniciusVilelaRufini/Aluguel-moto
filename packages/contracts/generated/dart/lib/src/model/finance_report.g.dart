// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'finance_report.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$FinanceReport extends FinanceReport {
  @override
  final DateTime from;
  @override
  final DateTime to;
  @override
  final BuiltList<PlanRevenue> revenueByPlan;
  @override
  final int totalRevenueCents;
  @override
  final int depositsHeldCount;
  @override
  final int depositsHeldCents;
  @override
  final int delinquentCustomers;
  @override
  final int delinquentAmountCents;
  @override
  final int refundsCents;
  @override
  final int? walletTopUpsCents;
  @override
  final int insurancePremiumsCents;
  @override
  final int insurancePayoutsCents;

  factory _$FinanceReport([void Function(FinanceReportBuilder)? updates]) =>
      (FinanceReportBuilder()..update(updates))._build();

  _$FinanceReport._(
      {required this.from,
      required this.to,
      required this.revenueByPlan,
      required this.totalRevenueCents,
      required this.depositsHeldCount,
      required this.depositsHeldCents,
      required this.delinquentCustomers,
      required this.delinquentAmountCents,
      required this.refundsCents,
      this.walletTopUpsCents,
      required this.insurancePremiumsCents,
      required this.insurancePayoutsCents})
      : super._();
  @override
  FinanceReport rebuild(void Function(FinanceReportBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  FinanceReportBuilder toBuilder() => FinanceReportBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is FinanceReport &&
        from == other.from &&
        to == other.to &&
        revenueByPlan == other.revenueByPlan &&
        totalRevenueCents == other.totalRevenueCents &&
        depositsHeldCount == other.depositsHeldCount &&
        depositsHeldCents == other.depositsHeldCents &&
        delinquentCustomers == other.delinquentCustomers &&
        delinquentAmountCents == other.delinquentAmountCents &&
        refundsCents == other.refundsCents &&
        walletTopUpsCents == other.walletTopUpsCents &&
        insurancePremiumsCents == other.insurancePremiumsCents &&
        insurancePayoutsCents == other.insurancePayoutsCents;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, from.hashCode);
    _$hash = $jc(_$hash, to.hashCode);
    _$hash = $jc(_$hash, revenueByPlan.hashCode);
    _$hash = $jc(_$hash, totalRevenueCents.hashCode);
    _$hash = $jc(_$hash, depositsHeldCount.hashCode);
    _$hash = $jc(_$hash, depositsHeldCents.hashCode);
    _$hash = $jc(_$hash, delinquentCustomers.hashCode);
    _$hash = $jc(_$hash, delinquentAmountCents.hashCode);
    _$hash = $jc(_$hash, refundsCents.hashCode);
    _$hash = $jc(_$hash, walletTopUpsCents.hashCode);
    _$hash = $jc(_$hash, insurancePremiumsCents.hashCode);
    _$hash = $jc(_$hash, insurancePayoutsCents.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'FinanceReport')
          ..add('from', from)
          ..add('to', to)
          ..add('revenueByPlan', revenueByPlan)
          ..add('totalRevenueCents', totalRevenueCents)
          ..add('depositsHeldCount', depositsHeldCount)
          ..add('depositsHeldCents', depositsHeldCents)
          ..add('delinquentCustomers', delinquentCustomers)
          ..add('delinquentAmountCents', delinquentAmountCents)
          ..add('refundsCents', refundsCents)
          ..add('walletTopUpsCents', walletTopUpsCents)
          ..add('insurancePremiumsCents', insurancePremiumsCents)
          ..add('insurancePayoutsCents', insurancePayoutsCents))
        .toString();
  }
}

class FinanceReportBuilder
    implements Builder<FinanceReport, FinanceReportBuilder> {
  _$FinanceReport? _$v;

  DateTime? _from;
  DateTime? get from => _$this._from;
  set from(DateTime? from) => _$this._from = from;

  DateTime? _to;
  DateTime? get to => _$this._to;
  set to(DateTime? to) => _$this._to = to;

  ListBuilder<PlanRevenue>? _revenueByPlan;
  ListBuilder<PlanRevenue> get revenueByPlan =>
      _$this._revenueByPlan ??= ListBuilder<PlanRevenue>();
  set revenueByPlan(ListBuilder<PlanRevenue>? revenueByPlan) =>
      _$this._revenueByPlan = revenueByPlan;

  int? _totalRevenueCents;
  int? get totalRevenueCents => _$this._totalRevenueCents;
  set totalRevenueCents(int? totalRevenueCents) =>
      _$this._totalRevenueCents = totalRevenueCents;

  int? _depositsHeldCount;
  int? get depositsHeldCount => _$this._depositsHeldCount;
  set depositsHeldCount(int? depositsHeldCount) =>
      _$this._depositsHeldCount = depositsHeldCount;

  int? _depositsHeldCents;
  int? get depositsHeldCents => _$this._depositsHeldCents;
  set depositsHeldCents(int? depositsHeldCents) =>
      _$this._depositsHeldCents = depositsHeldCents;

  int? _delinquentCustomers;
  int? get delinquentCustomers => _$this._delinquentCustomers;
  set delinquentCustomers(int? delinquentCustomers) =>
      _$this._delinquentCustomers = delinquentCustomers;

  int? _delinquentAmountCents;
  int? get delinquentAmountCents => _$this._delinquentAmountCents;
  set delinquentAmountCents(int? delinquentAmountCents) =>
      _$this._delinquentAmountCents = delinquentAmountCents;

  int? _refundsCents;
  int? get refundsCents => _$this._refundsCents;
  set refundsCents(int? refundsCents) => _$this._refundsCents = refundsCents;

  int? _walletTopUpsCents;
  int? get walletTopUpsCents => _$this._walletTopUpsCents;
  set walletTopUpsCents(int? walletTopUpsCents) =>
      _$this._walletTopUpsCents = walletTopUpsCents;

  int? _insurancePremiumsCents;
  int? get insurancePremiumsCents => _$this._insurancePremiumsCents;
  set insurancePremiumsCents(int? insurancePremiumsCents) =>
      _$this._insurancePremiumsCents = insurancePremiumsCents;

  int? _insurancePayoutsCents;
  int? get insurancePayoutsCents => _$this._insurancePayoutsCents;
  set insurancePayoutsCents(int? insurancePayoutsCents) =>
      _$this._insurancePayoutsCents = insurancePayoutsCents;

  FinanceReportBuilder() {
    FinanceReport._defaults(this);
  }

  FinanceReportBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _from = $v.from;
      _to = $v.to;
      _revenueByPlan = $v.revenueByPlan.toBuilder();
      _totalRevenueCents = $v.totalRevenueCents;
      _depositsHeldCount = $v.depositsHeldCount;
      _depositsHeldCents = $v.depositsHeldCents;
      _delinquentCustomers = $v.delinquentCustomers;
      _delinquentAmountCents = $v.delinquentAmountCents;
      _refundsCents = $v.refundsCents;
      _walletTopUpsCents = $v.walletTopUpsCents;
      _insurancePremiumsCents = $v.insurancePremiumsCents;
      _insurancePayoutsCents = $v.insurancePayoutsCents;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(FinanceReport other) {
    _$v = other as _$FinanceReport;
  }

  @override
  void update(void Function(FinanceReportBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  FinanceReport build() => _build();

  _$FinanceReport _build() {
    _$FinanceReport _$result;
    try {
      _$result = _$v ??
          _$FinanceReport._(
            from: BuiltValueNullFieldError.checkNotNull(
                from, r'FinanceReport', 'from'),
            to: BuiltValueNullFieldError.checkNotNull(
                to, r'FinanceReport', 'to'),
            revenueByPlan: revenueByPlan.build(),
            totalRevenueCents: BuiltValueNullFieldError.checkNotNull(
                totalRevenueCents, r'FinanceReport', 'totalRevenueCents'),
            depositsHeldCount: BuiltValueNullFieldError.checkNotNull(
                depositsHeldCount, r'FinanceReport', 'depositsHeldCount'),
            depositsHeldCents: BuiltValueNullFieldError.checkNotNull(
                depositsHeldCents, r'FinanceReport', 'depositsHeldCents'),
            delinquentCustomers: BuiltValueNullFieldError.checkNotNull(
                delinquentCustomers, r'FinanceReport', 'delinquentCustomers'),
            delinquentAmountCents: BuiltValueNullFieldError.checkNotNull(
                delinquentAmountCents,
                r'FinanceReport',
                'delinquentAmountCents'),
            refundsCents: BuiltValueNullFieldError.checkNotNull(
                refundsCents, r'FinanceReport', 'refundsCents'),
            walletTopUpsCents: walletTopUpsCents,
            insurancePremiumsCents: BuiltValueNullFieldError.checkNotNull(
                insurancePremiumsCents,
                r'FinanceReport',
                'insurancePremiumsCents'),
            insurancePayoutsCents: BuiltValueNullFieldError.checkNotNull(
                insurancePayoutsCents,
                r'FinanceReport',
                'insurancePayoutsCents'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'revenueByPlan';
        revenueByPlan.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'FinanceReport', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
