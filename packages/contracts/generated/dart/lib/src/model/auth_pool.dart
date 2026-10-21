//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'auth_pool.g.dart';

class AuthPool extends EnumClass {
  @BuiltValueEnumConst(wireName: r'customer')
  static const AuthPool customer = _$customer;
  @BuiltValueEnumConst(wireName: r'staff')
  static const AuthPool staff = _$staff;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const AuthPool unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<AuthPool> get serializer => _$authPoolSerializer;

  const AuthPool._(String name) : super(name);

  static BuiltSet<AuthPool> get values => _$values;
  static AuthPool valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class AuthPoolMixin = Object with _$AuthPoolMixin;
