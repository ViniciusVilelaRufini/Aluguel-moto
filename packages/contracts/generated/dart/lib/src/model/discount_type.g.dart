// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'discount_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const DiscountType _$percent = const DiscountType._('percent');
const DiscountType _$fixed = const DiscountType._('fixed');
const DiscountType _$unknownDefaultOpenApi =
    const DiscountType._('unknownDefaultOpenApi');

DiscountType _$valueOf(String name) {
  switch (name) {
    case 'percent':
      return _$percent;
    case 'fixed':
      return _$fixed;
    case 'unknownDefaultOpenApi':
      return _$unknownDefaultOpenApi;
    default:
      return _$unknownDefaultOpenApi;
  }
}

final BuiltSet<DiscountType> _$values =
    BuiltSet<DiscountType>(const <DiscountType>[
  _$percent,
  _$fixed,
  _$unknownDefaultOpenApi,
]);

class _$DiscountTypeMeta {
  const _$DiscountTypeMeta();
  DiscountType get percent => _$percent;
  DiscountType get fixed => _$fixed;
  DiscountType get unknownDefaultOpenApi => _$unknownDefaultOpenApi;
  DiscountType valueOf(String name) => _$valueOf(name);
  BuiltSet<DiscountType> get values => _$values;
}

abstract class _$DiscountTypeMixin {
  // ignore: non_constant_identifier_names
  _$DiscountTypeMeta get DiscountType => const _$DiscountTypeMeta();
}

Serializer<DiscountType> _$discountTypeSerializer = _$DiscountTypeSerializer();

class _$DiscountTypeSerializer implements PrimitiveSerializer<DiscountType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'percent': 'percent',
    'fixed': 'fixed',
    'unknownDefaultOpenApi': 'unknown_default_open_api',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'percent': 'percent',
    'fixed': 'fixed',
    'unknown_default_open_api': 'unknownDefaultOpenApi',
  };

  @override
  final Iterable<Type> types = const <Type>[DiscountType];
  @override
  final String wireName = 'DiscountType';

  @override
  Object serialize(Serializers serializers, DiscountType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  DiscountType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      DiscountType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
