//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/incident.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'incident_page.g.dart';

/// IncidentPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class IncidentPage
    implements Built<IncidentPage, IncidentPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<Incident> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  IncidentPage._();

  factory IncidentPage([void updates(IncidentPageBuilder b)]) = _$IncidentPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(IncidentPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<IncidentPage> get serializer => _$IncidentPageSerializer();
}

class _$IncidentPageSerializer implements PrimitiveSerializer<IncidentPage> {
  @override
  final Iterable<Type> types = const [IncidentPage, _$IncidentPage];

  @override
  final String wireName = r'IncidentPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    IncidentPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Incident)]),
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
    IncidentPage object, {
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
    required IncidentPageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Incident)]),
          ) as BuiltList<Incident>;
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
  IncidentPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = IncidentPageBuilder();
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
