// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'price_breakdown.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PriceBreakdown extends PriceBreakdown {
  @override
  final BuiltList<PriceLine> lines;
  @override
  final int subtotalCents;
  @override
  final int discountCents;
  @override
  final int insuranceCents;
  @override
  final int feesCents;
  @override
  final int? walletAppliedCents;
  @override
  final int totalCents;

  factory _$PriceBreakdown([void Function(PriceBreakdownBuilder)? updates]) =>
      (PriceBreakdownBuilder()..update(updates))._build();

  _$PriceBreakdown._(
      {required this.lines,
      required this.subtotalCents,
      required this.discountCents,
      required this.insuranceCents,
      required this.feesCents,
      this.walletAppliedCents,
      required this.totalCents})
      : super._();
  @override
  PriceBreakdown rebuild(void Function(PriceBreakdownBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PriceBreakdownBuilder toBuilder() => PriceBreakdownBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PriceBreakdown &&
        lines == other.lines &&
        subtotalCents == other.subtotalCents &&
        discountCents == other.discountCents &&
        insuranceCents == other.insuranceCents &&
        feesCents == other.feesCents &&
        walletAppliedCents == other.walletAppliedCents &&
        totalCents == other.totalCents;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, lines.hashCode);
    _$hash = $jc(_$hash, subtotalCents.hashCode);
    _$hash = $jc(_$hash, discountCents.hashCode);
    _$hash = $jc(_$hash, insuranceCents.hashCode);
    _$hash = $jc(_$hash, feesCents.hashCode);
    _$hash = $jc(_$hash, walletAppliedCents.hashCode);
    _$hash = $jc(_$hash, totalCents.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PriceBreakdown')
          ..add('lines', lines)
          ..add('subtotalCents', subtotalCents)
          ..add('discountCents', discountCents)
          ..add('insuranceCents', insuranceCents)
          ..add('feesCents', feesCents)
          ..add('walletAppliedCents', walletAppliedCents)
          ..add('totalCents', totalCents))
        .toString();
  }
}

class PriceBreakdownBuilder
    implements Builder<PriceBreakdown, PriceBreakdownBuilder> {
  _$PriceBreakdown? _$v;

  ListBuilder<PriceLine>? _lines;
  ListBuilder<PriceLine> get lines =>
      _$this._lines ??= ListBuilder<PriceLine>();
  set lines(ListBuilder<PriceLine>? lines) => _$this._lines = lines;

  int? _subtotalCents;
  int? get subtotalCents => _$this._subtotalCents;
  set subtotalCents(int? subtotalCents) =>
      _$this._subtotalCents = subtotalCents;

  int? _discountCents;
  int? get discountCents => _$this._discountCents;
  set discountCents(int? discountCents) =>
      _$this._discountCents = discountCents;

  int? _insuranceCents;
  int? get insuranceCents => _$this._insuranceCents;
  set insuranceCents(int? insuranceCents) =>
      _$this._insuranceCents = insuranceCents;

  int? _feesCents;
  int? get feesCents => _$this._feesCents;
  set feesCents(int? feesCents) => _$this._feesCents = feesCents;

  int? _walletAppliedCents;
  int? get walletAppliedCents => _$this._walletAppliedCents;
  set walletAppliedCents(int? walletAppliedCents) =>
      _$this._walletAppliedCents = walletAppliedCents;

  int? _totalCents;
  int? get totalCents => _$this._totalCents;
  set totalCents(int? totalCents) => _$this._totalCents = totalCents;

  PriceBreakdownBuilder() {
    PriceBreakdown._defaults(this);
  }

  PriceBreakdownBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _lines = $v.lines.toBuilder();
      _subtotalCents = $v.subtotalCents;
      _discountCents = $v.discountCents;
      _insuranceCents = $v.insuranceCents;
      _feesCents = $v.feesCents;
      _walletAppliedCents = $v.walletAppliedCents;
      _totalCents = $v.totalCents;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PriceBreakdown other) {
    _$v = other as _$PriceBreakdown;
  }

  @override
  void update(void Function(PriceBreakdownBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PriceBreakdown build() => _build();

  _$PriceBreakdown _build() {
    _$PriceBreakdown _$result;
    try {
      _$result = _$v ??
          _$PriceBreakdown._(
            lines: lines.build(),
            subtotalCents: BuiltValueNullFieldError.checkNotNull(
                subtotalCents, r'PriceBreakdown', 'subtotalCents'),
            discountCents: BuiltValueNullFieldError.checkNotNull(
                discountCents, r'PriceBreakdown', 'discountCents'),
            insuranceCents: BuiltValueNullFieldError.checkNotNull(
                insuranceCents, r'PriceBreakdown', 'insuranceCents'),
            feesCents: BuiltValueNullFieldError.checkNotNull(
                feesCents, r'PriceBreakdown', 'feesCents'),
            walletAppliedCents: walletAppliedCents,
            totalCents: BuiltValueNullFieldError.checkNotNull(
                totalCents, r'PriceBreakdown', 'totalCents'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'lines';
        lines.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'PriceBreakdown', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
