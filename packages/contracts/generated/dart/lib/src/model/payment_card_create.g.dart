// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_card_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PaymentCardCreate extends PaymentCardCreate {
  @override
  final String cardToken;
  @override
  final bool? setDefault;

  factory _$PaymentCardCreate(
          [void Function(PaymentCardCreateBuilder)? updates]) =>
      (PaymentCardCreateBuilder()..update(updates))._build();

  _$PaymentCardCreate._({required this.cardToken, this.setDefault}) : super._();
  @override
  PaymentCardCreate rebuild(void Function(PaymentCardCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PaymentCardCreateBuilder toBuilder() =>
      PaymentCardCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PaymentCardCreate &&
        cardToken == other.cardToken &&
        setDefault == other.setDefault;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, cardToken.hashCode);
    _$hash = $jc(_$hash, setDefault.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PaymentCardCreate')
          ..add('cardToken', cardToken)
          ..add('setDefault', setDefault))
        .toString();
  }
}

class PaymentCardCreateBuilder
    implements Builder<PaymentCardCreate, PaymentCardCreateBuilder> {
  _$PaymentCardCreate? _$v;

  String? _cardToken;
  String? get cardToken => _$this._cardToken;
  set cardToken(String? cardToken) => _$this._cardToken = cardToken;

  bool? _setDefault;
  bool? get setDefault => _$this._setDefault;
  set setDefault(bool? setDefault) => _$this._setDefault = setDefault;

  PaymentCardCreateBuilder() {
    PaymentCardCreate._defaults(this);
  }

  PaymentCardCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _cardToken = $v.cardToken;
      _setDefault = $v.setDefault;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PaymentCardCreate other) {
    _$v = other as _$PaymentCardCreate;
  }

  @override
  void update(void Function(PaymentCardCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PaymentCardCreate build() => _build();

  _$PaymentCardCreate _build() {
    final _$result = _$v ??
        _$PaymentCardCreate._(
          cardToken: BuiltValueNullFieldError.checkNotNull(
              cardToken, r'PaymentCardCreate', 'cardToken'),
          setDefault: setDefault,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
