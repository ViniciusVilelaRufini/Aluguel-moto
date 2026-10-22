//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/battery.dart';
import 'package:volti_api/src/model/vehicle_service_info.dart';
import 'package:volti_api/src/model/vehicle_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle.g.dart';

/// Ficha da moto. Campos marcados \"staff\" só vêm para tokens de staff.
///
/// Properties:
/// * [id]
/// * [code]
/// * [qrCode] - Conteúdo do QR impresso.
/// * [model]
/// * [status]
/// * [lat]
/// * [lng]
/// * [batteryPct]
/// * [estimatedRangeKm]
/// * [speedLimitKmh] - Limite atual aplicado (zona ou comando).
/// * [thingName] - staff.
/// * [trackerId] - staff.
/// * [batterySerial] - staff. Bateria instalada.
/// * [online] - staff.
/// * [locked] - staff.
/// * [ignition] - staff.
/// * [speedKmh] - staff. Velocidade reportada.
/// * [signal] - staff.
/// * [stolenMode] - staff.
/// * [firmwareVersion] - staff.
/// * [lastSeenAt] - staff. Último sinal.
/// * [currentRentalId] - staff.
/// * [vehicleModelId]
/// * [categoryLabel]
/// * [pricePerMinuteCents]
/// * [address] - Endereço aproximado da posição atual (geocodificação reversa em cache).
/// * [addressUpdatedAt]
/// * [odometerKm] - staff.
/// * [usageHours] - staff. Horas com ignição ligada.
/// * [service]
/// * [battery]
/// * [assignedSubscriptionId] - staff. Moto fixa de uma assinatura semanal/mensal.
/// * [depotId] - Galpão de origem/atual. Disponível para retirada = `status: free` com `depotId`.
/// * [locationHidden] - Cliente consultando moto em uso por outra pessoa (alugada, pausada ou reservada por outro cliente): a posição é ocultada (LGPD) — `lat`/`lng` vêm `0` e `address` ausente. Nunca vem para staff.
/// * [createdAt]
/// * [updatedAt]
@BuiltValue()
abstract class Vehicle implements Built<Vehicle, VehicleBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'code')
  String get code;

  /// Conteúdo do QR impresso.
  @BuiltValueField(wireName: r'qrCode')
  String? get qrCode;

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

  @BuiltValueField(wireName: r'estimatedRangeKm')
  double get estimatedRangeKm;

  /// Limite atual aplicado (zona ou comando).
  @BuiltValueField(wireName: r'speedLimitKmh')
  int get speedLimitKmh;

  /// staff.
  @BuiltValueField(wireName: r'thingName')
  String? get thingName;

  /// staff.
  @BuiltValueField(wireName: r'trackerId')
  String? get trackerId;

  /// staff. Bateria instalada.
  @BuiltValueField(wireName: r'batterySerial')
  String? get batterySerial;

  /// staff.
  @BuiltValueField(wireName: r'online')
  bool? get online;

  /// staff.
  @BuiltValueField(wireName: r'locked')
  bool? get locked;

  /// staff.
  @BuiltValueField(wireName: r'ignition')
  bool? get ignition;

  /// staff. Velocidade reportada.
  @BuiltValueField(wireName: r'speedKmh')
  double? get speedKmh;

  /// staff.
  @BuiltValueField(wireName: r'signal')
  int? get signal;

  /// staff.
  @BuiltValueField(wireName: r'stolenMode')
  bool? get stolenMode;

  /// staff.
  @BuiltValueField(wireName: r'firmwareVersion')
  String? get firmwareVersion;

  /// staff. Último sinal.
  @BuiltValueField(wireName: r'lastSeenAt')
  DateTime? get lastSeenAt;

  /// staff.
  @BuiltValueField(wireName: r'currentRentalId')
  String? get currentRentalId;

  @BuiltValueField(wireName: r'vehicleModelId')
  String? get vehicleModelId;

  @BuiltValueField(wireName: r'categoryLabel')
  String? get categoryLabel;

  @BuiltValueField(wireName: r'pricePerMinuteCents')
  int? get pricePerMinuteCents;

  /// Endereço aproximado da posição atual (geocodificação reversa em cache).
  @BuiltValueField(wireName: r'address')
  String? get address;

  @BuiltValueField(wireName: r'addressUpdatedAt')
  DateTime? get addressUpdatedAt;

  /// staff.
  @BuiltValueField(wireName: r'odometerKm')
  double? get odometerKm;

  /// staff. Horas com ignição ligada.
  @BuiltValueField(wireName: r'usageHours')
  double? get usageHours;

  @BuiltValueField(wireName: r'service')
  VehicleServiceInfo? get service;

  @BuiltValueField(wireName: r'battery')
  Battery? get battery;

  /// staff. Moto fixa de uma assinatura semanal/mensal.
  @BuiltValueField(wireName: r'assignedSubscriptionId')
  String? get assignedSubscriptionId;

  /// Galpão de origem/atual. Disponível para retirada = `status: free` com `depotId`.
  @BuiltValueField(wireName: r'depotId')
  String? get depotId;

  /// Cliente consultando moto em uso por outra pessoa (alugada, pausada ou reservada por outro cliente): a posição é ocultada (LGPD) — `lat`/`lng` vêm `0` e `address` ausente. Nunca vem para staff.
  @BuiltValueField(wireName: r'locationHidden')
  bool? get locationHidden;

  @BuiltValueField(wireName: r'createdAt')
  DateTime? get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime? get updatedAt;

  Vehicle._();

  factory Vehicle([void updates(VehicleBuilder b)]) = _$Vehicle;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Vehicle> get serializer => _$VehicleSerializer();
}

class _$VehicleSerializer implements PrimitiveSerializer<Vehicle> {
  @override
  final Iterable<Type> types = const [Vehicle, _$Vehicle];

  @override
  final String wireName = r'Vehicle';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Vehicle object, {
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
    if (object.qrCode != null) {
      yield r'qrCode';
      yield serializers.serialize(
        object.qrCode,
        specifiedType: const FullType(String),
      );
    }
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
    yield r'speedLimitKmh';
    yield serializers.serialize(
      object.speedLimitKmh,
      specifiedType: const FullType(int),
    );
    if (object.thingName != null) {
      yield r'thingName';
      yield serializers.serialize(
        object.thingName,
        specifiedType: const FullType(String),
      );
    }
    if (object.trackerId != null) {
      yield r'trackerId';
      yield serializers.serialize(
        object.trackerId,
        specifiedType: const FullType(String),
      );
    }
    if (object.batterySerial != null) {
      yield r'batterySerial';
      yield serializers.serialize(
        object.batterySerial,
        specifiedType: const FullType(String),
      );
    }
    if (object.online != null) {
      yield r'online';
      yield serializers.serialize(
        object.online,
        specifiedType: const FullType(bool),
      );
    }
    if (object.locked != null) {
      yield r'locked';
      yield serializers.serialize(
        object.locked,
        specifiedType: const FullType(bool),
      );
    }
    if (object.ignition != null) {
      yield r'ignition';
      yield serializers.serialize(
        object.ignition,
        specifiedType: const FullType(bool),
      );
    }
    if (object.speedKmh != null) {
      yield r'speedKmh';
      yield serializers.serialize(
        object.speedKmh,
        specifiedType: const FullType(double),
      );
    }
    if (object.signal != null) {
      yield r'signal';
      yield serializers.serialize(
        object.signal,
        specifiedType: const FullType(int),
      );
    }
    if (object.stolenMode != null) {
      yield r'stolenMode';
      yield serializers.serialize(
        object.stolenMode,
        specifiedType: const FullType(bool),
      );
    }
    if (object.firmwareVersion != null) {
      yield r'firmwareVersion';
      yield serializers.serialize(
        object.firmwareVersion,
        specifiedType: const FullType(String),
      );
    }
    if (object.lastSeenAt != null) {
      yield r'lastSeenAt';
      yield serializers.serialize(
        object.lastSeenAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.currentRentalId != null) {
      yield r'currentRentalId';
      yield serializers.serialize(
        object.currentRentalId,
        specifiedType: const FullType(String),
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
    if (object.address != null) {
      yield r'address';
      yield serializers.serialize(
        object.address,
        specifiedType: const FullType(String),
      );
    }
    if (object.addressUpdatedAt != null) {
      yield r'addressUpdatedAt';
      yield serializers.serialize(
        object.addressUpdatedAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.odometerKm != null) {
      yield r'odometerKm';
      yield serializers.serialize(
        object.odometerKm,
        specifiedType: const FullType(double),
      );
    }
    if (object.usageHours != null) {
      yield r'usageHours';
      yield serializers.serialize(
        object.usageHours,
        specifiedType: const FullType(double),
      );
    }
    if (object.service != null) {
      yield r'service';
      yield serializers.serialize(
        object.service,
        specifiedType: const FullType(VehicleServiceInfo),
      );
    }
    if (object.battery != null) {
      yield r'battery';
      yield serializers.serialize(
        object.battery,
        specifiedType: const FullType(Battery),
      );
    }
    if (object.assignedSubscriptionId != null) {
      yield r'assignedSubscriptionId';
      yield serializers.serialize(
        object.assignedSubscriptionId,
        specifiedType: const FullType(String),
      );
    }
    if (object.depotId != null) {
      yield r'depotId';
      yield serializers.serialize(
        object.depotId,
        specifiedType: const FullType(String),
      );
    }
    if (object.locationHidden != null) {
      yield r'locationHidden';
      yield serializers.serialize(
        object.locationHidden,
        specifiedType: const FullType(bool),
      );
    }
    if (object.createdAt != null) {
      yield r'createdAt';
      yield serializers.serialize(
        object.createdAt,
        specifiedType: const FullType(DateTime),
      );
    }
    if (object.updatedAt != null) {
      yield r'updatedAt';
      yield serializers.serialize(
        object.updatedAt,
        specifiedType: const FullType(DateTime),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    Vehicle object, {
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
    required VehicleBuilder result,
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
        case r'qrCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.qrCode = valueDes;
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
        case r'speedLimitKmh':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.speedLimitKmh = valueDes;
          break;
        case r'thingName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.thingName = valueDes;
          break;
        case r'trackerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.trackerId = valueDes;
          break;
        case r'batterySerial':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.batterySerial = valueDes;
          break;
        case r'online':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.online = valueDes;
          break;
        case r'locked':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.locked = valueDes;
          break;
        case r'ignition':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.ignition = valueDes;
          break;
        case r'speedKmh':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.speedKmh = valueDes;
          break;
        case r'signal':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.signal = valueDes;
          break;
        case r'stolenMode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.stolenMode = valueDes;
          break;
        case r'firmwareVersion':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.firmwareVersion = valueDes;
          break;
        case r'lastSeenAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.lastSeenAt = valueDes;
          break;
        case r'currentRentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.currentRentalId = valueDes;
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
        case r'address':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.address = valueDes;
          break;
        case r'addressUpdatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.addressUpdatedAt = valueDes;
          break;
        case r'odometerKm':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.odometerKm = valueDes;
          break;
        case r'usageHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(double),
          ) as double?;
          if (valueDes == null) continue;
          result.usageHours = valueDes;
          break;
        case r'service':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(VehicleServiceInfo),
          ) as VehicleServiceInfo?;
          if (valueDes == null) continue;
          result.service.replace(valueDes);
          break;
        case r'battery':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(Battery),
          ) as Battery?;
          if (valueDes == null) continue;
          result.battery.replace(valueDes);
          break;
        case r'assignedSubscriptionId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.assignedSubscriptionId = valueDes;
          break;
        case r'depotId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.depotId = valueDes;
          break;
        case r'locationHidden':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.locationHidden = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.createdAt = valueDes;
          break;
        case r'updatedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.updatedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Vehicle deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleBuilder();
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
