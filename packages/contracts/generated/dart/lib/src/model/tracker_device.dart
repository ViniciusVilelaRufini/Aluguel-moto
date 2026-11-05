//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/sim_card_summary.dart';
import 'package:volti_api/src/model/tracker_model.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'tracker_device.g.dart';

/// TrackerDevice
///
/// Properties:
/// * [id]
/// * [imei]
/// * [model]
/// * [installed]
/// * [vehicleId]
/// * [vehicleCode]
/// * [simCard]
/// * [online] - Último sinal há no máximo 180 s.
/// * [lastSeenAt]
/// * [createdAt]
@BuiltValue()
abstract class TrackerDevice
    implements Built<TrackerDevice, TrackerDeviceBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'imei')
  String get imei;

  @BuiltValueField(wireName: r'model')
  TrackerModel get model;
  // enum modelEnum {  J16,  };

  @BuiltValueField(wireName: r'installed')
  bool get installed;

  @BuiltValueField(wireName: r'vehicleId')
  String? get vehicleId;

  @BuiltValueField(wireName: r'vehicleCode')
  String? get vehicleCode;

  @BuiltValueField(wireName: r'simCard')
  SimCardSummary? get simCard;

  /// Último sinal há no máximo 180 s.
  @BuiltValueField(wireName: r'online')
  bool get online;

  @BuiltValueField(wireName: r'lastSeenAt')
  DateTime? get lastSeenAt;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  TrackerDevice._();

  factory TrackerDevice([void updates(TrackerDeviceBuilder b)]) =
      _$TrackerDevice;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(TrackerDeviceBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<TrackerDevice> get serializer =>
      _$TrackerDeviceSerializer();
}

class _$TrackerDeviceSerializer implements PrimitiveSerializer<TrackerDevice> {
  @override
  final Iterable<Type> types = const [TrackerDevice, _$TrackerDevice];

  @override
  final String wireName = r'TrackerDevice';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    TrackerDevice object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'imei';
    yield serializers.serialize(
      object.imei,
      specifiedType: const FullType(String),
    );
    yield r'model';
    yield serializers.serialize(
      object.model,
      specifiedType: const FullType(TrackerModel),
    );
    yield r'installed';
    yield serializers.serialize(
      object.installed,
      specifiedType: const FullType(bool),
    );
    yield r'vehicleId';
    yield object.vehicleId == null
        ? null
        : serializers.serialize(
            object.vehicleId,
            specifiedType: const FullType.nullable(String),
          );
    yield r'vehicleCode';
    yield object.vehicleCode == null
        ? null
        : serializers.serialize(
            object.vehicleCode,
            specifiedType: const FullType.nullable(String),
          );
    yield r'simCard';
    yield object.simCard == null
        ? null
        : serializers.serialize(
            object.simCard,
            specifiedType: const FullType.nullable(SimCardSummary),
          );
    yield r'online';
    yield serializers.serialize(
      object.online,
      specifiedType: const FullType(bool),
    );
    yield r'lastSeenAt';
    yield object.lastSeenAt == null
        ? null
        : serializers.serialize(
            object.lastSeenAt,
            specifiedType: const FullType.nullable(DateTime),
          );
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    TrackerDevice object, {
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
    required TrackerDeviceBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.id = valueDes;
          break;
        case r'imei':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.imei = valueDes;
          break;
        case r'model':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(TrackerModel),
          ) as TrackerModel;
          result.model = valueDes;
          break;
        case r'installed':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.installed = valueDes;
          break;
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleId = valueDes;
          break;
        case r'vehicleCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleCode = valueDes;
          break;
        case r'simCard':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(SimCardSummary),
          ) as SimCardSummary?;
          if (valueDes == null) continue;
          result.simCard.replace(valueDes);
          break;
        case r'online':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.online = valueDes;
          break;
        case r'lastSeenAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.lastSeenAt = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.createdAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  TrackerDevice deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = TrackerDeviceBuilder();
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
