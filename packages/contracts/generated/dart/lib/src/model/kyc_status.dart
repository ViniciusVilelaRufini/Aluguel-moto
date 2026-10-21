//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'kyc_status.g.dart';

class KycStatus extends EnumClass {
  @BuiltValueEnumConst(wireName: r'not_started')
  static const KycStatus notStarted = _$notStarted;
  @BuiltValueEnumConst(wireName: r'pending')
  static const KycStatus pending = _$pending;
  @BuiltValueEnumConst(wireName: r'approved')
  static const KycStatus approved = _$approved;
  @BuiltValueEnumConst(wireName: r'rejected')
  static const KycStatus rejected = _$rejected;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const KycStatus unknownDefaultOpenApi = _$unknownDefaultOpenApi;

  static Serializer<KycStatus> get serializer => _$kycStatusSerializer;

  const KycStatus._(String name) : super(name);

  static BuiltSet<KycStatus> get values => _$values;
  static KycStatus valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class KycStatusMixin = Object with _$KycStatusMixin;
