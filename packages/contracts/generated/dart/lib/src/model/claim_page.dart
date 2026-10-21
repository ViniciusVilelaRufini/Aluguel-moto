//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/claim.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'claim_page.g.dart';

/// ClaimPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class ClaimPage implements Built<ClaimPage, ClaimPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<Claim> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  ClaimPage._();

  factory ClaimPage([void updates(ClaimPageBuilder b)]) = _$ClaimPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ClaimPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<ClaimPage> get serializer => _$ClaimPageSerializer();
}

class _$ClaimPageSerializer implements PrimitiveSerializer<ClaimPage> {
  @override
  final Iterable<Type> types = const [ClaimPage, _$ClaimPage];

  @override
  final String wireName = r'ClaimPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    ClaimPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Claim)]),
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
    ClaimPage object, {
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
    required ClaimPageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Claim)]),
          ) as BuiltList<Claim>;
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
  ClaimPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ClaimPageBuilder();
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
