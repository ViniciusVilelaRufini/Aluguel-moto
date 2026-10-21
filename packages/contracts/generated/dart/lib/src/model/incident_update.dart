//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/incident_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'incident_update.g.dart';

/// IncidentUpdate
///
/// Properties:
/// * [status]
/// * [resolutionNote]
@BuiltValue()
abstract class IncidentUpdate
    implements Built<IncidentUpdate, IncidentUpdateBuilder> {
  @BuiltValueField(wireName: r'status')
  IncidentStatus get status;
  // enum statusEnum {  open,  in_progress,  resolved,  closed,  };

  @BuiltValueField(wireName: r'resolutionNote')
  String? get resolutionNote;

  IncidentUpdate._();

  factory IncidentUpdate([void updates(IncidentUpdateBuilder b)]) =
      _$IncidentUpdate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(IncidentUpdateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<IncidentUpdate> get serializer =>
      _$IncidentUpdateSerializer();
}

class _$IncidentUpdateSerializer
    implements PrimitiveSerializer<IncidentUpdate> {
  @override
  final Iterable<Type> types = const [IncidentUpdate, _$IncidentUpdate];

  @override
  final String wireName = r'IncidentUpdate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    IncidentUpdate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(IncidentStatus),
    );
    if (object.resolutionNote != null) {
      yield r'resolutionNote';
      yield serializers.serialize(
        object.resolutionNote,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    IncidentUpdate object, {
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
    required IncidentUpdateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(IncidentStatus),
          ) as IncidentStatus;
          result.status = valueDes;
          break;
        case r'resolutionNote':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.resolutionNote = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  IncidentUpdate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = IncidentUpdateBuilder();
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
