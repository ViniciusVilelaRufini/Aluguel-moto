// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_revenue_report.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleRevenueReport extends VehicleRevenueReport {
  @override
  final DateTime from;
  @override
  final DateTime to;
  @override
  final BuiltList<VehicleRevenueRow> rows;

  factory _$VehicleRevenueReport(
          [void Function(VehicleRevenueReportBuilder)? updates]) =>
      (VehicleRevenueReportBuilder()..update(updates))._build();

  _$VehicleRevenueReport._(
      {required this.from, required this.to, required this.rows})
      : super._();
  @override
  VehicleRevenueReport rebuild(
          void Function(VehicleRevenueReportBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleRevenueReportBuilder toBuilder() =>
      VehicleRevenueReportBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleRevenueReport &&
        from == other.from &&
        to == other.to &&
        rows == other.rows;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, from.hashCode);
    _$hash = $jc(_$hash, to.hashCode);
    _$hash = $jc(_$hash, rows.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehicleRevenueReport')
          ..add('from', from)
          ..add('to', to)
          ..add('rows', rows))
        .toString();
  }
}

class VehicleRevenueReportBuilder
    implements Builder<VehicleRevenueReport, VehicleRevenueReportBuilder> {
  _$VehicleRevenueReport? _$v;

  DateTime? _from;
  DateTime? get from => _$this._from;
  set from(DateTime? from) => _$this._from = from;

  DateTime? _to;
  DateTime? get to => _$this._to;
  set to(DateTime? to) => _$this._to = to;

  ListBuilder<VehicleRevenueRow>? _rows;
  ListBuilder<VehicleRevenueRow> get rows =>
      _$this._rows ??= ListBuilder<VehicleRevenueRow>();
  set rows(ListBuilder<VehicleRevenueRow>? rows) => _$this._rows = rows;

  VehicleRevenueReportBuilder() {
    VehicleRevenueReport._defaults(this);
  }

  VehicleRevenueReportBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _from = $v.from;
      _to = $v.to;
      _rows = $v.rows.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleRevenueReport other) {
    _$v = other as _$VehicleRevenueReport;
  }

  @override
  void update(void Function(VehicleRevenueReportBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleRevenueReport build() => _build();

  _$VehicleRevenueReport _build() {
    _$VehicleRevenueReport _$result;
    try {
      _$result = _$v ??
          _$VehicleRevenueReport._(
            from: BuiltValueNullFieldError.checkNotNull(
                from, r'VehicleRevenueReport', 'from'),
            to: BuiltValueNullFieldError.checkNotNull(
                to, r'VehicleRevenueReport', 'to'),
            rows: rows.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'rows';
        rows.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'VehicleRevenueReport', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
