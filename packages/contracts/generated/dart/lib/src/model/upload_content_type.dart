//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'upload_content_type.g.dart';

class UploadContentType extends EnumClass {
  @BuiltValueEnumConst(wireName: r'image/jpeg')
  static const UploadContentType imageSlashJpeg = _$imageSlashJpeg;
  @BuiltValueEnumConst(wireName: r'image/png')
  static const UploadContentType imageSlashPng = _$imageSlashPng;
  @BuiltValueEnumConst(wireName: r'image/heic')
  static const UploadContentType imageSlashHeic = _$imageSlashHeic;
  @BuiltValueEnumConst(wireName: r'application/pdf')
  static const UploadContentType applicationSlashPdf = _$applicationSlashPdf;
  @BuiltValueEnumConst(wireName: r'unknown_default_open_api', fallback: true)
  static const UploadContentType unknownDefaultOpenApi =
      _$unknownDefaultOpenApi;

  static Serializer<UploadContentType> get serializer =>
      _$uploadContentTypeSerializer;

  const UploadContentType._(String name) : super(name);

  static BuiltSet<UploadContentType> get values => _$values;
  static UploadContentType valueOf(String name) => _$valueOf(name);
}

/// Optionally, enum_class can generate a mixin to go with your enum for use
/// with Angular. It exposes your enum constants as getters. So, if you mix it
/// in to your Dart component class, the values become available to the
/// corresponding Angular template.
///
/// Trigger mixin generation by writing a line like this one next to your enum.
abstract class UploadContentTypeMixin = Object with _$UploadContentTypeMixin;
