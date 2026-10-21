// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dev_token_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const DevTokenResponseTokenTypeEnum _$devTokenResponseTokenTypeEnum_bearer =
    const DevTokenResponseTokenTypeEnum._('bearer');
const DevTokenResponseTokenTypeEnum
    _$devTokenResponseTokenTypeEnum_unknownDefaultOpenApi =
    const DevTokenResponseTokenTypeEnum._('unknownDefaultOpenApi');

DevTokenResponseTokenTypeEnum _$devTokenResponseTokenTypeEnumValueOf(
    String name) {
  switch (name) {
    case 'bearer':
      return _$devTokenResponseTokenTypeEnum_bearer;
    case 'unknownDefaultOpenApi':
      return _$devTokenResponseTokenTypeEnum_unknownDefaultOpenApi;
    default:
      return _$devTokenResponseTokenTypeEnum_unknownDefaultOpenApi;
  }
}

final BuiltSet<DevTokenResponseTokenTypeEnum>
    _$devTokenResponseTokenTypeEnumValues = BuiltSet<
        DevTokenResponseTokenTypeEnum>(const <DevTokenResponseTokenTypeEnum>[
  _$devTokenResponseTokenTypeEnum_bearer,
  _$devTokenResponseTokenTypeEnum_unknownDefaultOpenApi,
]);

Serializer<DevTokenResponseTokenTypeEnum>
    _$devTokenResponseTokenTypeEnumSerializer =
    _$DevTokenResponseTokenTypeEnumSerializer();

class _$DevTokenResponseTokenTypeEnumSerializer
    implements PrimitiveSerializer<DevTokenResponseTokenTypeEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'bearer': 'Bearer',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'Bearer': 'bearer',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[DevTokenResponseTokenTypeEnum];
  @override
  final String wireName = 'DevTokenResponseTokenTypeEnum';

  @override
  Object serialize(
          Serializers serializers, DevTokenResponseTokenTypeEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  DevTokenResponseTokenTypeEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      DevTokenResponseTokenTypeEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$DevTokenResponse extends DevTokenResponse {
  @override
  final String accessToken;
  @override
  final DevTokenResponseTokenTypeEnum tokenType;
  @override
  final int expiresIn;

  factory _$DevTokenResponse(
          [void Function(DevTokenResponseBuilder)? updates]) =>
      (DevTokenResponseBuilder()..update(updates))._build();

  _$DevTokenResponse._(
      {required this.accessToken,
      required this.tokenType,
      required this.expiresIn})
      : super._();
  @override
  DevTokenResponse rebuild(void Function(DevTokenResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DevTokenResponseBuilder toBuilder() =>
      DevTokenResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DevTokenResponse &&
        accessToken == other.accessToken &&
        tokenType == other.tokenType &&
        expiresIn == other.expiresIn;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, accessToken.hashCode);
    _$hash = $jc(_$hash, tokenType.hashCode);
    _$hash = $jc(_$hash, expiresIn.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DevTokenResponse')
          ..add('accessToken', accessToken)
          ..add('tokenType', tokenType)
          ..add('expiresIn', expiresIn))
        .toString();
  }
}

class DevTokenResponseBuilder
    implements Builder<DevTokenResponse, DevTokenResponseBuilder> {
  _$DevTokenResponse? _$v;

  String? _accessToken;
  String? get accessToken => _$this._accessToken;
  set accessToken(String? accessToken) => _$this._accessToken = accessToken;

  DevTokenResponseTokenTypeEnum? _tokenType;
  DevTokenResponseTokenTypeEnum? get tokenType => _$this._tokenType;
  set tokenType(DevTokenResponseTokenTypeEnum? tokenType) =>
      _$this._tokenType = tokenType;

  int? _expiresIn;
  int? get expiresIn => _$this._expiresIn;
  set expiresIn(int? expiresIn) => _$this._expiresIn = expiresIn;

  DevTokenResponseBuilder() {
    DevTokenResponse._defaults(this);
  }

  DevTokenResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _accessToken = $v.accessToken;
      _tokenType = $v.tokenType;
      _expiresIn = $v.expiresIn;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DevTokenResponse other) {
    _$v = other as _$DevTokenResponse;
  }

  @override
  void update(void Function(DevTokenResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DevTokenResponse build() => _build();

  _$DevTokenResponse _build() {
    final _$result = _$v ??
        _$DevTokenResponse._(
          accessToken: BuiltValueNullFieldError.checkNotNull(
              accessToken, r'DevTokenResponse', 'accessToken'),
          tokenType: BuiltValueNullFieldError.checkNotNull(
              tokenType, r'DevTokenResponse', 'tokenType'),
          expiresIn: BuiltValueNullFieldError.checkNotNull(
              expiresIn, r'DevTokenResponse', 'expiresIn'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
