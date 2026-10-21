// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'occupancy_report.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$OccupancyReport extends OccupancyReport {
  @override
  final DateTime from;
  @override
  final DateTime to;
  @override
  final ReportGroupBy groupBy;
  @override
  final BuiltList<OccupancyRow> rows;

  factory _$OccupancyReport([void Function(OccupancyReportBuilder)? updates]) =>
      (OccupancyReportBuilder()..update(updates))._build();

  _$OccupancyReport._(
      {required this.from,
      required this.to,
      required this.groupBy,
      required this.rows})
      : super._();
  @override
  OccupancyReport rebuild(void Function(OccupancyReportBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  OccupancyReportBuilder toBuilder() => OccupancyReportBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is OccupancyReport &&
        from == other.from &&
        to == other.to &&
        groupBy == other.groupBy &&
        rows == other.rows;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, from.hashCode);
    _$hash = $jc(_$hash, to.hashCode);
    _$hash = $jc(_$hash, groupBy.hashCode);
    _$hash = $jc(_$hash, rows.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'OccupancyReport')
          ..add('from', from)
          ..add('to', to)
          ..add('groupBy', groupBy)
          ..add('rows', rows))
        .toString();
  }
}

class OccupancyReportBuilder
    implements Builder<OccupancyReport, OccupancyReportBuilder> {
  _$OccupancyReport? _$v;

  DateTime? _from;
  DateTime? get from => _$this._from;
  set from(DateTime? from) => _$this._from = from;

  DateTime? _to;
  DateTime? get to => _$this._to;
  set to(DateTime? to) => _$this._to = to;

  ReportGroupBy? _groupBy;
  ReportGroupBy? get groupBy => _$this._groupBy;
  set groupBy(ReportGroupBy? groupBy) => _$this._groupBy = groupBy;

  ListBuilder<OccupancyRow>? _rows;
  ListBuilder<OccupancyRow> get rows =>
      _$this._rows ??= ListBuilder<OccupancyRow>();
  set rows(ListBuilder<OccupancyRow>? rows) => _$this._rows = rows;

  OccupancyReportBuilder() {
    OccupancyReport._defaults(this);
  }

  OccupancyReportBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _from = $v.from;
      _to = $v.to;
      _groupBy = $v.groupBy;
      _rows = $v.rows.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(OccupancyReport other) {
    _$v = other as _$OccupancyReport;
  }

  @override
  void update(void Function(OccupancyReportBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  OccupancyReport build() => _build();

  _$OccupancyReport _build() {
    _$OccupancyReport _$result;
    try {
      _$result = _$v ??
          _$OccupancyReport._(
            from: BuiltValueNullFieldError.checkNotNull(
                from, r'OccupancyReport', 'from'),
            to: BuiltValueNullFieldError.checkNotNull(
                to, r'OccupancyReport', 'to'),
            groupBy: BuiltValueNullFieldError.checkNotNull(
                groupBy, r'OccupancyReport', 'groupBy'),
            rows: rows.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'rows';
        rows.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'OccupancyReport', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
