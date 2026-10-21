//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/dispute.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'dispute_page.g.dart';

/// DisputePage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class DisputePage implements Built<DisputePage, DisputePageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<Dispute> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  DisputePage._();

  factory DisputePage([void updates(DisputePageBuilder b)]) = _$DisputePage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DisputePageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DisputePage> get serializer => _$DisputePageSerializer();
}

class _$DisputePageSerializer implements PrimitiveSerializer<DisputePage> {
  @override
  final Iterable<Type> types = const [DisputePage, _$DisputePage];

  @override
  final String wireName = r'DisputePage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DisputePage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Dispute)]),
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
    DisputePage object, {
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
    required DisputePageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Dispute)]),
          ) as BuiltList<Dispute>;
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
  DisputePage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DisputePageBuilder();
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
