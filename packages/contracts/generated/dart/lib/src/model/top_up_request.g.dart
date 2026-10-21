// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'top_up_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$TopUpRequest extends TopUpRequest {
  @override
  final int? amountCents;
  @override
  final String? packageId;
  @override
  final TopUpMethod method;
  @override
  final String? cardId;

  factory _$TopUpRequest([void Function(TopUpRequestBuilder)? updates]) =>
      (TopUpRequestBuilder()..update(updates))._build();

  _$TopUpRequest._(
      {this.amountCents, this.packageId, required this.method, this.cardId})
      : super._();
  @override
  TopUpRequest rebuild(void Function(TopUpRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  TopUpRequestBuilder toBuilder() => TopUpRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is TopUpRequest &&
        amountCents == other.amountCents &&
        packageId == other.packageId &&
        method == other.method &&
        cardId == other.cardId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jc(_$hash, packageId.hashCode);
    _$hash = $jc(_$hash, method.hashCode);
    _$hash = $jc(_$hash, cardId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'TopUpRequest')
          ..add('amountCents', amountCents)
          ..add('packageId', packageId)
          ..add('method', method)
          ..add('cardId', cardId))
        .toString();
  }
}

class TopUpRequestBuilder
    implements Builder<TopUpRequest, TopUpRequestBuilder> {
  _$TopUpRequest? _$v;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  String? _packageId;
  String? get packageId => _$this._packageId;
  set packageId(String? packageId) => _$this._packageId = packageId;

  TopUpMethod? _method;
  TopUpMethod? get method => _$this._method;
  set method(TopUpMethod? method) => _$this._method = method;

  String? _cardId;
  String? get cardId => _$this._cardId;
  set cardId(String? cardId) => _$this._cardId = cardId;

  TopUpRequestBuilder() {
    TopUpRequest._defaults(this);
  }

  TopUpRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _amountCents = $v.amountCents;
      _packageId = $v.packageId;
      _method = $v.method;
      _cardId = $v.cardId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(TopUpRequest other) {
    _$v = other as _$TopUpRequest;
  }

  @override
  void update(void Function(TopUpRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  TopUpRequest build() => _build();

  _$TopUpRequest _build() {
    final _$result = _$v ??
        _$TopUpRequest._(
          amountCents: amountCents,
          packageId: packageId,
          method: BuiltValueNullFieldError.checkNotNull(
              method, r'TopUpRequest', 'method'),
          cardId: cardId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
