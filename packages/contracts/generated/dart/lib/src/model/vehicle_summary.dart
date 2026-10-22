//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/vehicle_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_summary.g.dart';

/// Moto no mapa do cliente. Sem dados do rastreador.
///
/// Properties:
/// * [id]
/// * [code]
/// * [model]
/// * [status]
/// * [lat]
/// * [lng]
/// * [batteryPct]
/// * [estimatedRangeKm] - Autonomia estimada com a carga atual.
/// * [distanceM] - Distância até o ponto da busca (só em `nearby`).
/// * [vehicleModelId] - Modelo no catálogo (`GET /vehicle-models`, com a foto).
/// * [categoryLabel]
/// * [pricePerMinuteCents] - Preço por minuto do modelo no plano `minute`.
@BuiltValue()
abstract class VehicleSummary
    implements Built<VehicleSummary, VehicleSummaryBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'code')
  String get code;

  @BuiltValueField(wireName: r'model')
  String get model;

  @BuiltValueField(wireName: r'status')
  VehicleStatus get status;
  // enum statusEnum {  free,  rented,  reserved,  paused,  blocked,  maintenance,  offline,  awaiting_pickup,  };

  @BuiltValueField(wireName: r'lat')
  double get lat;

  @BuiltValueField(wireName: r'lng')
  double get lng;

  @BuiltValueField(wireName: r'batteryPct')
  int get batteryPct;

  /// Autonomia estimada com a carga atual.
  @BuiltValueField(wireName: r'estimatedRangeKm')
  double get estimatedRangeKm;

  /// Distância até o ponto da busca (só em `nearby`).
  @BuiltValueField(wireName: r'distanceM')
  int? get distanceM;

  /// Modelo no catálogo (`GET /vehicle-models`, com a foto).
  @BuiltValueField(wireName: r'vehicleModelId')
  String? get vehicleModelId;

  @BuiltValueField(wireName: r'categoryLabel')
  String? get categoryLabel;

  /// Preço por minuto do modelo no plano `minute`.
  @BuiltValueField(wireName: r'pricePerMinuteCents')
  int? get pricePerMinuteCents;

  VehicleSummary._();

  factory VehicleSummary([void updates(VehicleSummaryBuilder b)]) =
      _$VehicleSummary;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleSummaryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleSummary> get serializer =>
      _$VehicleSummarySerializer();
}

class _$VehicleSummarySerializer
    implements PrimitiveSerializer<VehicleSummary> {
  @override
  final Iterable<Type> types = const [VehicleSummary, _$VehicleSummary];

  @override
  final String wireName = r'VehicleSummary';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleSummary object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(String),
    );
    yield r'model';
    yield serializers.serialize(
      object.model,
      specifiedType: const FullType(String),
    );
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(VehicleStatus),
    );
    yield r'lat';
    yield serializers.serialize(
      object.lat,
      specifiedType: const FullType(double),
    );
    yield r'lng';
    yield serializers.serialize(
      object.lng,
      specifiedType: const FullType(double),
    );
    yield r'batteryPct';
    yield serializers.serialize(
      object.batteryPct,
      specifiedType: const FullType(int),
    );
    yield r'estimatedRangeKm';
    yield serializers.serialize(
      object.estimatedRangeKm,
      specifiedType: const FullType(double),
    );
    if (object.distanceM != null) {
      yield r'distanceM';
      yield serializers.serialize(
        object.distanceM,
        specifiedType: const FullType(int),
      );
    }
    if (object.vehicleModelId != null) {
      yield r'vehicleModelId';
      yield serializers.serialize(
        object.vehicleModelId,
        specifiedType: const FullType(String),
      );
    }
    if (object.categoryLabel != null) {
      yield r'categoryLabel';
      yield serializers.serialize(
        object.categoryLabel,
        specifiedType: const FullType(String),
      );
    }
    if (object.pricePerMinuteCents != null) {
      yield r'pricePerMinuteCents';
      yield serializers.serialize(
        object.pricePerMinuteCents,
        specifiedType: const FullType(int),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    VehicleSummary object, {
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
    required VehicleSummaryBuilder result,
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
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.code = valueDes;
          break;
        case r'model':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.model = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(VehicleStatus),
          ) as VehicleStatus;
          result.status = valueDes;
          break;
        case r'lat':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.lat = valueDes;
          break;
        case r'lng':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.lng = valueDes;
          break;
        case r'batteryPct':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.batteryPct = valueDes;
          break;
        case r'estimatedRangeKm':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(double),
          ) as double;
          result.estimatedRangeKm = valueDes;
          break;
        case r'distanceM':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.distanceM = valueDes;
          break;
        case r'vehicleModelId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleModelId = valueDes;
          break;
        case r'categoryLabel':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.categoryLabel = valueDes;
          break;
        case r'pricePerMinuteCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.pricePerMinuteCents = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  VehicleSummary deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleSummaryBuilder();
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
