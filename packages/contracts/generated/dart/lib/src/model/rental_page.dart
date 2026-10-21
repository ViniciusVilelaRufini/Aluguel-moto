//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/rental.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'rental_page.g.dart';

/// RentalPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class RentalPage implements Built<RentalPage, RentalPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<Rental> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  RentalPage._();

  factory RentalPage([void updates(RentalPageBuilder b)]) = _$RentalPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RentalPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RentalPage> get serializer => _$RentalPageSerializer();
}

class _$RentalPageSerializer implements PrimitiveSerializer<RentalPage> {
  @override
  final Iterable<Type> types = const [RentalPage, _$RentalPage];

  @override
  final String wireName = r'RentalPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RentalPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Rental)]),
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
    RentalPage object, {
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
    required RentalPageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Rental)]),
          ) as BuiltList<Rental>;
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
  RentalPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RentalPageBuilder();
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
