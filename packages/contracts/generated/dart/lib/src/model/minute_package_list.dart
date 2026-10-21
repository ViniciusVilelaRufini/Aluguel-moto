//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/minute_package.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'minute_package_list.g.dart';

/// MinutePackageList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class MinutePackageList
    implements Built<MinutePackageList, MinutePackageListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<MinutePackage> get items;

  MinutePackageList._();

  factory MinutePackageList([void updates(MinutePackageListBuilder b)]) =
      _$MinutePackageList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(MinutePackageListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<MinutePackageList> get serializer =>
      _$MinutePackageListSerializer();
}

class _$MinutePackageListSerializer
    implements PrimitiveSerializer<MinutePackageList> {
  @override
  final Iterable<Type> types = const [MinutePackageList, _$MinutePackageList];

  @override
  final String wireName = r'MinutePackageList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    MinutePackageList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(MinutePackage)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    MinutePackageList object, {
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
    required MinutePackageListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(MinutePackage)]),
          ) as BuiltList<MinutePackage>;
          result.items.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  MinutePackageList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = MinutePackageListBuilder();
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
