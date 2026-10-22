//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/depot_opening_hours.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'depot_update.g.dart';

/// Campos ausentes não mudam; `openingHours` substitui a lista inteira.
///
/// Properties:
/// * [name]
/// * [address]
/// * [district]
/// * [lat]
/// * [lng]
/// * [timezone]
/// * [openingHours]
/// * [pickupNowWindowMinutes]
/// * [maxScheduleDays]
/// * [scheduledGraceMinutes]
/// * [swapStationId]
/// * [active]
@BuiltValue()
abstract class DepotUpdate implements Built<DepotUpdate, DepotUpdateBuilder> {
  @BuiltValueField(wireName: r'name')
  String? get name;

  @BuiltValueField(wireName: r'address')
  String? get address;

  @BuiltValueField(wireName: r'district')
  String? get district;

  @BuiltValueField(wireName: r'lat')
  double? get lat;

  @BuiltValueField(wireName: r'lng')
  double? get lng;

  @BuiltValueField(wireName: r'timezone')
  String? get timezone;

  @BuiltValueField(wireName: r'openingHours')
  BuiltList<DepotOpeningHours>? get openingHours;

  @BuiltValueField(wireName: r'pickupNowWindowMinutes')
  int? get pickupNowWindowMinutes;

  @BuiltValueField(wireName: r'maxScheduleDays')
  int? get maxScheduleDays;

  @BuiltValueField(wireName: r'scheduledGraceMinutes')
  int? get scheduledGraceMinutes;

  @BuiltValueField(wireName: r'swapStationId')
  String? get swapStationId;

  @BuiltValueField(wireName: r'active')
  bool? get active;

  DepotUpdate._();

  factory DepotUpdate([void updates(DepotUpdateBuilder b)]) = _$DepotUpdate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DepotUpdateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DepotUpdate> get serializer => _$DepotUpdateSerializer();
}

class _$DepotUpdateSerializer implements PrimitiveSerializer<DepotUpdate> {
  @override
  final Iterable<Type> types = const [DepotUpdate, _$DepotUpdate];

  @override
  final String wireName = r'DepotUpdate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DepotUpdate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.name != null) {
      yield r'name';
      yield serializers.serialize(
        object.name,
        specifiedType: const FullType(String),
      );
    }
    if (object.address != null) {
      yield r'address';
      yield serializers.serialize(
        object.address,
        specifiedType: const FullType(String),
      );
    }
    if (object.district != null) {
      yield r'district';
      yield serializers.serialize(
        object.district,
        specifiedType: const FullType(String),
      );
    }
    if (object.lat != null) {
      yield r'lat';
      yield serializers.serialize(
        object.lat,
        specifiedType: const FullType(double),
      );
    }
    if (object.lng != null) {
      yield r'lng';
      yield serializers.serialize(
        object.lng,
        specifiedType: const FullType(double),
      );
    }
    if (object.timezone != null) {
      yield r'timezone';
      yield serializers.serialize(
        object.timezone,
        specifiedType: const FullType(String),
      );
    }
    if (object.openingHours != null) {
      yield r'openingHours';
      yield serializers.serialize(
        object.openingHours,
        specifiedType: const FullType(BuiltList, [FullType(DepotOpeningHours)]),
      );
    }
    if (object.pickupNowWindowMinutes != null) {
      yield r'pickupNowWindowMinutes';
      yield serializers.serialize(
        object.pickupNowWindowMinutes,
        specifiedType: const FullType(int),
      );
    }
    if (object.maxScheduleDays != null) {
      yield r'maxScheduleDays';
      yield serializers.serialize(
        object.maxScheduleDays,
        specifiedType: const FullType(int),
      );
    }
    if (object.scheduledGraceMinutes != null) {
      yield r'scheduledGraceMinutes';
      yield serializers.serialize(
        object.scheduledGraceMinutes,
        specifiedType: const FullType(int),
      );
    }
    if (object.swapStationId != null) {
      yield r'swapStationId';
      yield serializers.serialize(
        object.swapStationId,
        specifiedType: const FullType(String),
      );
    }
    if (object.active != null) {
      yield r'active';
      yield serializers.serialize(
        object.active,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    DepotUpdate object, {
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
    required DepotUpdateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.name = valueDes;
          break;
        case r'address':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.address = valueDes;
          break;
        case r'district':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.district = valueDes;
          break;
        case r'lat':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.lat = valueDes;
          break;
        case r'lng':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.lng = valueDes;
          break;
        case r'timezone':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.timezone = valueDes;
          break;
        case r'openingHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(
                BuiltList, [FullType(DepotOpeningHours)]),
          ) as BuiltList<DepotOpeningHours>?;
          if (valueDes == null) continue;
          result.openingHours.replace(valueDes);
          break;
        case r'pickupNowWindowMinutes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.pickupNowWindowMinutes = valueDes;
          break;
        case r'maxScheduleDays':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.maxScheduleDays = valueDes;
          break;
        case r'scheduledGraceMinutes':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.scheduledGraceMinutes = valueDes;
          break;
        case r'swapStationId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.swapStationId = valueDes;
          break;
        case r'active':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.active = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DepotUpdate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DepotUpdateBuilder();
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
