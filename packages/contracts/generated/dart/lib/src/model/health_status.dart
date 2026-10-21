//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/health_state.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'health_status.g.dart';

/// HealthStatus
///
/// Properties:
/// * [status]
/// * [version]
/// * [time]
/// * [checks] - Estado por dependência (`database`, `redis`, `mqtt`, `storage`).
@BuiltValue()
abstract class HealthStatus
    implements Built<HealthStatus, HealthStatusBuilder> {
  @BuiltValueField(wireName: r'status')
  HealthState get status;
  // enum statusEnum {  ok,  degraded,  down,  };

  @BuiltValueField(wireName: r'version')
  String get version;

  @BuiltValueField(wireName: r'time')
  DateTime get time;

  /// Estado por dependência (`database`, `redis`, `mqtt`, `storage`).
  @BuiltValueField(wireName: r'checks')
  BuiltMap<String, HealthState>? get checks;

  HealthStatus._();

  factory HealthStatus([void updates(HealthStatusBuilder b)]) = _$HealthStatus;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(HealthStatusBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<HealthStatus> get serializer => _$HealthStatusSerializer();
}

class _$HealthStatusSerializer implements PrimitiveSerializer<HealthStatus> {
  @override
  final Iterable<Type> types = const [HealthStatus, _$HealthStatus];

  @override
  final String wireName = r'HealthStatus';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    HealthStatus object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(HealthState),
    );
    yield r'version';
    yield serializers.serialize(
      object.version,
      specifiedType: const FullType(String),
    );
    yield r'time';
    yield serializers.serialize(
      object.time,
      specifiedType: const FullType(DateTime),
    );
    if (object.checks != null) {
      yield r'checks';
      yield serializers.serialize(
        object.checks,
        specifiedType:
            const FullType(BuiltMap, [FullType(String), FullType(HealthState)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    HealthStatus object, {
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
    required HealthStatusBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(HealthState),
          ) as HealthState;
          result.status = valueDes;
          break;
        case r'version':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.version = valueDes;
          break;
        case r'time':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.time = valueDes;
          break;
        case r'checks':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(
                BuiltMap, [FullType(String), FullType(HealthState)]),
          ) as BuiltMap<String, HealthState>?;
          if (valueDes == null) continue;
          result.checks.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  HealthStatus deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = HealthStatusBuilder();
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
