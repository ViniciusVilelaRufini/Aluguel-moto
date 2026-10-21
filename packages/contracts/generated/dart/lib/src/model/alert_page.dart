//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/alert.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'alert_page.g.dart';

/// AlertPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class AlertPage implements Built<AlertPage, AlertPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<Alert> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  AlertPage._();

  factory AlertPage([void updates(AlertPageBuilder b)]) = _$AlertPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AlertPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AlertPage> get serializer => _$AlertPageSerializer();
}

class _$AlertPageSerializer implements PrimitiveSerializer<AlertPage> {
  @override
  final Iterable<Type> types = const [AlertPage, _$AlertPage];

  @override
  final String wireName = r'AlertPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AlertPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Alert)]),
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
    AlertPage object, {
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
    required AlertPageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Alert)]),
          ) as BuiltList<Alert>;
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
  AlertPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AlertPageBuilder();
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
