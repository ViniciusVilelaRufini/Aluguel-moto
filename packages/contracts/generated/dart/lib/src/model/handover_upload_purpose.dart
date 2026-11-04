//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'handover_upload_purpose.g.dart';

/// `photo`: foto da vistoria (`handovers/`); `contract`: foto do contrato assinado no balcão (`contracts/`).
class HandoverUploadPurpose extends EnumClass {
  @BuiltValueEnumConst(wireName: r'photo')
  static const HandoverUploadPurpose photo = _$photo;
  @BuiltValueEnumConst(wireName: r'contract')
  static const HandoverUploadPurpose contract = _$contract;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const HandoverUploadPurpose unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<HandoverUploadPurpose> get serializer =>
      _$handoverUploadPurposeSerializer;

  const HandoverUploadPurpose._(String name) : super(name);

  static BuiltSet<HandoverUploadPurpose> get values => _$values;
  static HandoverUploadPurpose valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class HandoverUploadPurposeMixin = Object
    with _$HandoverUploadPurposeMixin;
