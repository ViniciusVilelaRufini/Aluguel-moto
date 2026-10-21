//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'minute_package.g.dart';

/// MinutePackage
///
/// Properties:
/// * [id]
/// * [name]
/// * [minutes]
/// * [priceCents]
/// * [active]
@BuiltValue()
abstract class MinutePackage
    implements Built<MinutePackage, MinutePackageBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'minutes')
  int get minutes;

  @BuiltValueField(wireName: r'priceCents')
  int get priceCents;

  @BuiltValueField(wireName: r'active')
  bool get active;

  MinutePackage._();

  factory MinutePackage([void updates(MinutePackageBuilder b)]) =
      _$MinutePackage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(MinutePackageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<MinutePackage> get serializer =>
      _$MinutePackageSerializer();
}

class _$MinutePackageSerializer implements PrimitiveSerializer<MinutePackage> {
  @override
  final Iterable<Type> types = const [MinutePackage, _$MinutePackage];

  @override
  final String wireName = r'MinutePackage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    MinutePackage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'minutes';
    yield serializers.serialize(
      object.minutes,
      specifiedType: const FullType(int),
    );
    yield r'priceCents';
    yield serializers.serialize(
      object.priceCents,
      specifiedType: const FullType(int),
    );
    yield r'active';
    yield serializers.serialize(
      object.active,
      specifiedType: const FullType(bool),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    MinutePackage object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object,
            specifiedType: specifiedType)
        .toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required MinutePackageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.name = valueDes;
          break;
        case r'minutes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.minutes = valueDes;
          break;
        case r'priceCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.priceCents = valueDes;
          break;
        case r'active':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.active = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  MinutePackage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = MinutePackageBuilder();
    final serializedList = (serialized as Iterable<Object?>).toList();
    final unhandled = <Object?>[];
    _deserializeProperties(
      serializers,
      serialized,
      specifiedType: specifiedType,
      serializedList: serializedList,
      unhandled: unhandled,
      result: result,
    );
    return result.build();
  }
}
