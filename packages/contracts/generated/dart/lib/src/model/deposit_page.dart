//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/deposit.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'deposit_page.g.dart';

/// DepositPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class DepositPage implements Built<DepositPage, DepositPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<Deposit> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  DepositPage._();

  factory DepositPage([void updates(DepositPageBuilder b)]) = _$DepositPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DepositPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DepositPage> get serializer => _$DepositPageSerializer();
}

class _$DepositPageSerializer implements PrimitiveSerializer<DepositPage> {
  @override
  final Iterable<Type> types = const [DepositPage, _$DepositPage];

  @override
  final String wireName = r'DepositPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DepositPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Deposit)]),
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
    DepositPage object, {
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
    required DepositPageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Deposit)]),
          ) as BuiltList<Deposit>;
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
  DepositPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DepositPageBuilder();
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
