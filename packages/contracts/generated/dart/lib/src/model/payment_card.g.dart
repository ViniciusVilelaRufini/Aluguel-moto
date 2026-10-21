// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_card.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PaymentCard extends PaymentCard {
  @override
  final String id;
  @override
  final String brand;
  @override
  final String last4;
  @override
  final int expMonth;
  @override
  final int expYear;
  @override
  final bool isDefault;
  @override
  final DateTime createdAt;

  factory _$PaymentCard([void Function(PaymentCardBuilder)? updates]) =>
      (PaymentCardBuilder()..update(updates))._build();

  _$PaymentCard._(
      {required this.id,
      required this.brand,
      required this.last4,
      required this.expMonth,
      required this.expYear,
      required this.isDefault,
      required this.createdAt})
      : super._();
  @override
  PaymentCard rebuild(void Function(PaymentCardBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PaymentCardBuilder toBuilder() => PaymentCardBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PaymentCard &&
        id == other.id &&
        brand == other.brand &&
        last4 == other.last4 &&
        expMonth == other.expMonth &&
        expYear == other.expYear &&
        isDefault == other.isDefault &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, brand.hashCode);
    _$hash = $jc(_$hash, last4.hashCode);
    _$hash = $jc(_$hash, expMonth.hashCode);
    _$hash = $jc(_$hash, expYear.hashCode);
    _$hash = $jc(_$hash, isDefault.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PaymentCard')
          ..add('id', id)
          ..add('brand', brand)
          ..add('last4', last4)
          ..add('expMonth', expMonth)
          ..add('expYear', expYear)
          ..add('isDefault', isDefault)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class PaymentCardBuilder implements Builder<PaymentCard, PaymentCardBuilder> {
  _$PaymentCard? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _brand;
  String? get brand => _$this._brand;
  set brand(String? brand) => _$this._brand = brand;

  String? _last4;
  String? get last4 => _$this._last4;
  set last4(String? last4) => _$this._last4 = last4;

  int? _expMonth;
  int? get expMonth => _$this._expMonth;
  set expMonth(int? expMonth) => _$this._expMonth = expMonth;

  int? _expYear;
  int? get expYear => _$this._expYear;
  set expYear(int? expYear) => _$this._expYear = expYear;

  bool? _isDefault;
  bool? get isDefault => _$this._isDefault;
  set isDefault(bool? isDefault) => _$this._isDefault = isDefault;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  PaymentCardBuilder() {
    PaymentCard._defaults(this);
  }

  PaymentCardBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _brand = $v.brand;
      _last4 = $v.last4;
      _expMonth = $v.expMonth;
      _expYear = $v.expYear;
      _isDefault = $v.isDefault;
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PaymentCard other) {
    _$v = other as _$PaymentCard;
  }

  @override
  void update(void Function(PaymentCardBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PaymentCard build() => _build();

  _$PaymentCard _build() {
    final _$result = _$v ??
        _$PaymentCard._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'PaymentCard', 'id'),
          brand: BuiltValueNullFieldError.checkNotNull(
              brand, r'PaymentCard', 'brand'),
          last4: BuiltValueNullFieldError.checkNotNull(
              last4, r'PaymentCard', 'last4'),
          expMonth: BuiltValueNullFieldError.checkNotNull(
              expMonth, r'PaymentCard', 'expMonth'),
          expYear: BuiltValueNullFieldError.checkNotNull(
              expYear, r'PaymentCard', 'expYear'),
          isDefault: BuiltValueNullFieldError.checkNotNull(
              isDefault, r'PaymentCard', 'isDefault'),
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'PaymentCard', 'createdAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
