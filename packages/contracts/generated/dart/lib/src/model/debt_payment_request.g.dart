// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'debt_payment_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const DebtPaymentRequestMethodEnum _$debtPaymentRequestMethodEnum_card =
    const DebtPaymentRequestMethodEnum._('card');
const DebtPaymentRequestMethodEnum _$debtPaymentRequestMethodEnum_pix =
    const DebtPaymentRequestMethodEnum._('pix');
const DebtPaymentRequestMethodEnum
    _$debtPaymentRequestMethodEnum_unknownDefaultOpenApi =
    const DebtPaymentRequestMethodEnum._('unknownDefaultOpenApi');

DebtPaymentRequestMethodEnum _$debtPaymentRequestMethodEnumValueOf(
    String name) {
  switch (name) {
    case 'card':
      return _$debtPaymentRequestMethodEnum_card;
    case 'pix':
      return _$debtPaymentRequestMethodEnum_pix;
    case 'unknownDefaultOpenApi':
      return _$debtPaymentRequestMethodEnum_unknownDefaultOpenApi;
    default:
      return _$debtPaymentRequestMethodEnum_unknownDefaultOpenApi;
  }
}

final BuiltSet<DebtPaymentRequestMethodEnum>
    _$debtPaymentRequestMethodEnumValues =
    BuiltSet<DebtPaymentRequestMethodEnum>(const <DebtPaymentRequestMethodEnum>[
  _$debtPaymentRequestMethodEnum_card,
  _$debtPaymentRequestMethodEnum_pix,
  _$debtPaymentRequestMethodEnum_unknownDefaultOpenApi,
]);

Serializer<DebtPaymentRequestMethodEnum>
    _$debtPaymentRequestMethodEnumSerializer =
    _$DebtPaymentRequestMethodEnumSerializer();

class _$DebtPaymentRequestMethodEnumSerializer
    implements PrimitiveSerializer<DebtPaymentRequestMethodEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'card': 'card',
    'pix': 'pix',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'card': 'card',
    'pix': 'pix',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[DebtPaymentRequestMethodEnum];
  @override
  final String wireName = 'DebtPaymentRequestMethodEnum';

  @override
  Object serialize(Serializers serializers, DebtPaymentRequestMethodEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  DebtPaymentRequestMethodEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      DebtPaymentRequestMethodEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$DebtPaymentRequest extends DebtPaymentRequest {
  @override
  final DebtPaymentRequestMethodEnum method;
  @override
  final String? cardId;

  factory _$DebtPaymentRequest(
          [void Function(DebtPaymentRequestBuilder)? updates]) =>
      (DebtPaymentRequestBuilder()..update(updates))._build();

  _$DebtPaymentRequest._({required this.method, this.cardId}) : super._();
  @override
  DebtPaymentRequest rebuild(
          void Function(DebtPaymentRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DebtPaymentRequestBuilder toBuilder() =>
      DebtPaymentRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DebtPaymentRequest &&
        method == other.method &&
        cardId == other.cardId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, method.hashCode);
    _$hash = $jc(_$hash, cardId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DebtPaymentRequest')
          ..add('method', method)
          ..add('cardId', cardId))
        .toString();
  }
}

class DebtPaymentRequestBuilder
    implements Builder<DebtPaymentRequest, DebtPaymentRequestBuilder> {
  _$DebtPaymentRequest? _$v;

  DebtPaymentRequestMethodEnum? _method;
  DebtPaymentRequestMethodEnum? get method => _$this._method;
  set method(DebtPaymentRequestMethodEnum? method) => _$this._method = method;

  String? _cardId;
  String? get cardId => _$this._cardId;
  set cardId(String? cardId) => _$this._cardId = cardId;

  DebtPaymentRequestBuilder() {
    DebtPaymentRequest._defaults(this);
  }

  DebtPaymentRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _method = $v.method;
      _cardId = $v.cardId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DebtPaymentRequest other) {
    _$v = other as _$DebtPaymentRequest;
  }

  @override
  void update(void Function(DebtPaymentRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DebtPaymentRequest build() => _build();

  _$DebtPaymentRequest _build() {
    final _$result = _$v ??
        _$DebtPaymentRequest._(
          method: BuiltValueNullFieldError.checkNotNull(
              method, r'DebtPaymentRequest', 'method'),
          cardId: cardId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
