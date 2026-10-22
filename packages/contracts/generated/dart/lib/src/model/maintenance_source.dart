//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'maintenance_source.g.dart';

/// Quem abriu a manutenção (painel, cliente do plano semanal/mensal ou regra automática).
class MaintenanceSource extends EnumClass {
  @BuiltValueEnumConst(wireName: r'staff')
  static const MaintenanceSource staff = _$staff;
  @BuiltValueEnumConst(wireName: r'customer')
  static const MaintenanceSource customer = _$customer;
  @BuiltValueEnumConst(wireName: r'system')
  static const MaintenanceSource system = _$system;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const MaintenanceSource unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<MaintenanceSource> get serializer =>
      _$maintenanceSourceSerializer;

  const MaintenanceSource._(String name) : super(name);

  static BuiltSet<MaintenanceSource> get values => _$values;
  static MaintenanceSource valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class MaintenanceSourceMixin = Object with _$MaintenanceSourceMixin;
