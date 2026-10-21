// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'price_line.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PriceLine extends PriceLine {
  @override
  final String code;
  @override
  final String description;
  @override
  final int? quantity;
  @override
  final int? unitCents;
  @override
  final int amountCents;

  factory _$PriceLine([void Function(PriceLineBuilder)? updates]) =>
      (PriceLineBuilder()..update(updates))._build();

  _$PriceLine._(
      {required this.code,
      required this.description,
      this.quantity,
      this.unitCents,
      required this.amountCents})
      : super._();
  @override
  PriceLine rebuild(void Function(PriceLineBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PriceLineBuilder toBuilder() => PriceLineBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PriceLine &&
        code == other.code &&
        description == other.description &&
        quantity == other.quantity &&
        unitCents == other.unitCents &&
        amountCents == other.amountCents;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, quantity.hashCode);
    _$hash = $jc(_$hash, unitCents.hashCode);
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PriceLine')
          ..add('code', code)
          ..add('description', description)
          ..add('quantity', quantity)
          ..add('unitCents', unitCents)
          ..add('amountCents', amountCents))
        .toString();
  }
}

class PriceLineBuilder implements Builder<PriceLine, PriceLineBuilder> {
  _$PriceLine? _$v;

  String? _code;
  String? get code => _$this._code;
  set code(String? code) => _$this._code = code;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  int? _quantity;
  int? get quantity => _$this._quantity;
  set quantity(int? quantity) => _$this._quantity = quantity;

  int? _unitCents;
  int? get unitCents => _$this._unitCents;
  set unitCents(int? unitCents) => _$this._unitCents = unitCents;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  PriceLineBuilder() {
    PriceLine._defaults(this);
  }

  PriceLineBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _code = $v.code;
      _description = $v.description;
      _quantity = $v.quantity;
      _unitCents = $v.unitCents;
      _amountCents = $v.amountCents;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PriceLine other) {
    _$v = other as _$PriceLine;
  }

  @override
  void update(void Function(PriceLineBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PriceLine build() => _build();

  _$PriceLine _build() {
    final _$result = _$v ??
        _$PriceLine._(
          code:
              BuiltValueNullFieldError.checkNotNull(code, r'PriceLine', 'code'),
          description: BuiltValueNullFieldError.checkNotNull(
              description, r'PriceLine', 'description'),
          quantity: quantity,
          unitCents: unitCents,
          amountCents: BuiltValueNullFieldError.checkNotNull(
              amountCents, r'PriceLine', 'amountCents'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
