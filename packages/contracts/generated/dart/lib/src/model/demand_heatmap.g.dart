// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'demand_heatmap.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DemandHeatmap extends DemandHeatmap {
  @override
  final DateTime from;
  @override
  final DateTime to;
  @override
  final BuiltList<HeatmapPoint> points;

  factory _$DemandHeatmap([void Function(DemandHeatmapBuilder)? updates]) =>
      (DemandHeatmapBuilder()..update(updates))._build();

  _$DemandHeatmap._(
      {required this.from, required this.to, required this.points})
      : super._();
  @override
  DemandHeatmap rebuild(void Function(DemandHeatmapBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DemandHeatmapBuilder toBuilder() => DemandHeatmapBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DemandHeatmap &&
        from == other.from &&
        to == other.to &&
        points == other.points;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, from.hashCode);
    _$hash = $jc(_$hash, to.hashCode);
    _$hash = $jc(_$hash, points.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DemandHeatmap')
          ..add('from', from)
          ..add('to', to)
          ..add('points', points))
        .toString();
  }
}

class DemandHeatmapBuilder
    implements Builder<DemandHeatmap, DemandHeatmapBuilder> {
  _$DemandHeatmap? _$v;

  DateTime? _from;
  DateTime? get from => _$this._from;
  set from(DateTime? from) => _$this._from = from;

  DateTime? _to;
  DateTime? get to => _$this._to;
  set to(DateTime? to) => _$this._to = to;

  ListBuilder<HeatmapPoint>? _points;
  ListBuilder<HeatmapPoint> get points =>
      _$this._points ??= ListBuilder<HeatmapPoint>();
  set points(ListBuilder<HeatmapPoint>? points) => _$this._points = points;

  DemandHeatmapBuilder() {
    DemandHeatmap._defaults(this);
  }

  DemandHeatmapBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _from = $v.from;
      _to = $v.to;
      _points = $v.points.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DemandHeatmap other) {
    _$v = other as _$DemandHeatmap;
  }

  @override
  void update(void Function(DemandHeatmapBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DemandHeatmap build() => _build();

  _$DemandHeatmap _build() {
    _$DemandHeatmap _$result;
    try {
      _$result = _$v ??
          _$DemandHeatmap._(
            from: BuiltValueNullFieldError.checkNotNull(
                from, r'DemandHeatmap', 'from'),
            to: BuiltValueNullFieldError.checkNotNull(
                to, r'DemandHeatmap', 'to'),
            points: points.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'points';
        points.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'DemandHeatmap', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
