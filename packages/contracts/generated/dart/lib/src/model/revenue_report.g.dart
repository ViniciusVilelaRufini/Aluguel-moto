// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'revenue_report.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$RevenueReport extends RevenueReport {
  @override
  final DateTime from;
  @override
  final DateTime to;
  @override
  final ReportGroupBy groupBy;
  @override
  final BuiltList<RevenueRow> rows;
  @override
  final int totalNetCents;

  factory _$RevenueReport([void Function(RevenueReportBuilder)? updates]) =>
      (RevenueReportBuilder()..update(updates))._build();

  _$RevenueReport._(
      {required this.from,
      required this.to,
      required this.groupBy,
      required this.rows,
      required this.totalNetCents})
      : super._();
  @override
  RevenueReport rebuild(void Function(RevenueReportBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RevenueReportBuilder toBuilder() => RevenueReportBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is RevenueReport &&
        from == other.from &&
        to == other.to &&
        groupBy == other.groupBy &&
        rows == other.rows &&
        totalNetCents == other.totalNetCents;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, from.hashCode);
    _$hash = $jc(_$hash, to.hashCode);
    _$hash = $jc(_$hash, groupBy.hashCode);
    _$hash = $jc(_$hash, rows.hashCode);
    _$hash = $jc(_$hash, totalNetCents.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'RevenueReport')
          ..add('from', from)
          ..add('to', to)
          ..add('groupBy', groupBy)
          ..add('rows', rows)
          ..add('totalNetCents', totalNetCents))
        .toString();
  }
}

class RevenueReportBuilder
    implements Builder<RevenueReport, RevenueReportBuilder> {
  _$RevenueReport? _$v;

  DateTime? _from;
  DateTime? get from => _$this._from;
  set from(DateTime? from) => _$this._from = from;

  DateTime? _to;
  DateTime? get to => _$this._to;
  set to(DateTime? to) => _$this._to = to;

  ReportGroupBy? _groupBy;
  ReportGroupBy? get groupBy => _$this._groupBy;
  set groupBy(ReportGroupBy? groupBy) => _$this._groupBy = groupBy;

  ListBuilder<RevenueRow>? _rows;
  ListBuilder<RevenueRow> get rows =>
      _$this._rows ??= ListBuilder<RevenueRow>();
  set rows(ListBuilder<RevenueRow>? rows) => _$this._rows = rows;

  int? _totalNetCents;
  int? get totalNetCents => _$this._totalNetCents;
  set totalNetCents(int? totalNetCents) =>
      _$this._totalNetCents = totalNetCents;

  RevenueReportBuilder() {
    RevenueReport._defaults(this);
  }

  RevenueReportBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _from = $v.from;
      _to = $v.to;
      _groupBy = $v.groupBy;
      _rows = $v.rows.toBuilder();
      _totalNetCents = $v.totalNetCents;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(RevenueReport other) {
    _$v = other as _$RevenueReport;
  }

  @override
  void update(void Function(RevenueReportBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  RevenueReport build() => _build();

  _$RevenueReport _build() {
    _$RevenueReport _$result;
    try {
      _$result = _$v ??
          _$RevenueReport._(
            from: BuiltValueNullFieldError.checkNotNull(
                from, r'RevenueReport', 'from'),
            to: BuiltValueNullFieldError.checkNotNull(
                to, r'RevenueReport', 'to'),
            groupBy: BuiltValueNullFieldError.checkNotNull(
                groupBy, r'RevenueReport', 'groupBy'),
            rows: rows.build(),
            totalNetCents: BuiltValueNullFieldError.checkNotNull(
                totalNetCents, r'RevenueReport', 'totalNetCents'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'rows';
        rows.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'RevenueReport', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
