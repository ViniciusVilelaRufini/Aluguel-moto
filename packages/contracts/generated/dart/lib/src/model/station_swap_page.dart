//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/station_swap.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'station_swap_page.g.dart';

/// StationSwapPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class StationSwapPage
    implements Built<StationSwapPage, StationSwapPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<StationSwap> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  StationSwapPage._();

  factory StationSwapPage([void updates(StationSwapPageBuilder b)]) =
      _$StationSwapPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(StationSwapPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<StationSwapPage> get serializer =>
      _$StationSwapPageSerializer();
}

class _$StationSwapPageSerializer
    implements PrimitiveSerializer<StationSwapPage> {
  @override
  final Iterable<Type> types = const [StationSwapPage, _$StationSwapPage];

  @override
  final String wireName = r'StationSwapPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    StationSwapPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(StationSwap)]),
    );
    if (object.nextCursor != null) {
      yield r'nextCursor';
      yield serializers.serialize(
        object.nextCursor,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    StationSwapPage object, {
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
    required StationSwapPageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(StationSwap)]),
          ) as BuiltList<StationSwap>;
          result.items.replace(valueDes);
          break;
        case r'nextCursor':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.nextCursor = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  StationSwapPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = StationSwapPageBuilder();
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
