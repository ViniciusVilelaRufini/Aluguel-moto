// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'van_stock.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VanStock extends VanStock {
  @override
  final String operatorId;
  @override
  final int total;
  @override
  final int chargedCount;
  @override
  final int depletedCount;
  @override
  final BuiltList<Battery> items;

  factory _$VanStock([void Function(VanStockBuilder)? updates]) =>
      (VanStockBuilder()..update(updates))._build();

  _$VanStock._(
      {required this.operatorId,
      required this.total,
      required this.chargedCount,
      required this.depletedCount,
      required this.items})
      : super._();
  @override
  VanStock rebuild(void Function(VanStockBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VanStockBuilder toBuilder() => VanStockBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VanStock &&
        operatorId == other.operatorId &&
        total == other.total &&
        chargedCount == other.chargedCount &&
        depletedCount == other.depletedCount &&
        items == other.items;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, operatorId.hashCode);
    _$hash = $jc(_$hash, total.hashCode);
    _$hash = $jc(_$hash, chargedCount.hashCode);
    _$hash = $jc(_$hash, depletedCount.hashCode);
    _$hash = $jc(_$hash, items.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VanStock')
          ..add('operatorId', operatorId)
          ..add('total', total)
          ..add('chargedCount', chargedCount)
          ..add('depletedCount', depletedCount)
          ..add('items', items))
        .toString();
  }
}

class VanStockBuilder implements Builder<VanStock, VanStockBuilder> {
  _$VanStock? _$v;

  String? _operatorId;
  String? get operatorId => _$this._operatorId;
  set operatorId(String? operatorId) => _$this._operatorId = operatorId;

  int? _total;
  int? get total => _$this._total;
  set total(int? total) => _$this._total = total;

  int? _chargedCount;
  int? get chargedCount => _$this._chargedCount;
  set chargedCount(int? chargedCount) => _$this._chargedCount = chargedCount;

  int? _depletedCount;
  int? get depletedCount => _$this._depletedCount;
  set depletedCount(int? depletedCount) =>
      _$this._depletedCount = depletedCount;

  ListBuilder<Battery>? _items;
  ListBuilder<Battery> get items => _$this._items ??= ListBuilder<Battery>();
  set items(ListBuilder<Battery>? items) => _$this._items = items;

  VanStockBuilder() {
    VanStock._defaults(this);
  }

  VanStockBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _operatorId = $v.operatorId;
      _total = $v.total;
      _chargedCount = $v.chargedCount;
      _depletedCount = $v.depletedCount;
      _items = $v.items.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VanStock other) {
    _$v = other as _$VanStock;
  }

  @override
  void update(void Function(VanStockBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VanStock build() => _build();

  _$VanStock _build() {
    _$VanStock _$result;
    try {
      _$result = _$v ??
          _$VanStock._(
            operatorId: BuiltValueNullFieldError.checkNotNull(
                operatorId, r'VanStock', 'operatorId'),
            total: BuiltValueNullFieldError.checkNotNull(
                total, r'VanStock', 'total'),
            chargedCount: BuiltValueNullFieldError.checkNotNull(
                chargedCount, r'VanStock', 'chargedCount'),
            depletedCount: BuiltValueNullFieldError.checkNotNull(
                depletedCount, r'VanStock', 'depletedCount'),
            items: items.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'items';
        items.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'VanStock', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
