//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/station_swap_end_reason.dart';
import 'package:volti_api/src/model/station_swap_status.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'station_swap.g.dart';

/// StationSwap
///
/// Properties:
/// * [id]
/// * [stationId]
/// * [rentalId]
/// * [vehicleId]
/// * [status]
/// * [endReason]
/// * [slotNumber] - Vaga aberta (a partir de `awaiting_return`).
/// * [feeCents] - Taxa da troca (0 nos planos diário/semanal/mensal); cobrada no fechamento do aluguel.
/// * [expiresAt] - Prazo da etapa atual (3 min por etapa).
/// * [returnedSerial] - Nº de série da bateria devolvida.
/// * [returnedPct] - Carga da bateria devolvida.
/// * [releasedSerial] - Nº de série da bateria liberada (instalada na moto).
/// * [distanceM] - Só staff: distância do celular à estação na validação.
/// * [customerId] - Só staff.
/// * [completedAt]
/// * [createdAt]
/// * [updatedAt]
@BuiltValue()
abstract class StationSwap implements Built<StationSwap, StationSwapBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'stationId')
  String get stationId;

  @BuiltValueField(wireName: r'rentalId')
  String get rentalId;

  @BuiltValueField(wireName: r'vehicleId')
  String? get vehicleId;

  @BuiltValueField(wireName: r'status')
  StationSwapStatus get status;
  // enum statusEnum {  opening_slot,  awaiting_return,  returned,  releasing,  completed,  canceled,  failed,  };

  @BuiltValueField(wireName: r'endReason')
  StationSwapEndReason? get endReason;
  // enum endReasonEnum {  canceled_by_customer,  slot_closed_without_return,  station_timeout,  return_timeout,  release_timeout,  no_battery_after_return,  serial_mismatch,  };

  /// Vaga aberta (a partir de `awaiting_return`).
  @BuiltValueField(wireName: r'slotNumber')
  int? get slotNumber;

  /// Taxa da troca (0 nos planos diário/semanal/mensal); cobrada no fechamento do aluguel.
  @BuiltValueField(wireName: r'feeCents')
  int get feeCents;

  /// Prazo da etapa atual (3 min por etapa).
  @BuiltValueField(wireName: r'expiresAt')
  DateTime get expiresAt;

  /// Nº de série da bateria devolvida.
  @BuiltValueField(wireName: r'returnedSerial')
  String? get returnedSerial;

  /// Carga da bateria devolvida.
  @BuiltValueField(wireName: r'returnedPct')
  int? get returnedPct;

  /// Nº de série da bateria liberada (instalada na moto).
  @BuiltValueField(wireName: r'releasedSerial')
  String? get releasedSerial;

  /// Só staff: distância do celular à estação na validação.
  @BuiltValueField(wireName: r'distanceM')
  int? get distanceM;

  /// Só staff.
  @BuiltValueField(wireName: r'customerId')
  String? get customerId;

  @BuiltValueField(wireName: r'completedAt')
  DateTime? get completedAt;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime? get updatedAt;

  StationSwap._();

  factory StationSwap([void updates(StationSwapBuilder b)]) = _$StationSwap;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(StationSwapBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<StationSwap> get serializer => _$StationSwapSerializer();
}

class _$StationSwapSerializer implements PrimitiveSerializer<StationSwap> {
  @override
  final Iterable<Type> types = const [StationSwap, _$StationSwap];

  @override
  final String wireName = r'StationSwap';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    StationSwap object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
    yield r'stationId';
    yield serializers.serialize(
      object.stationId,
      specifiedType: const FullType(String),
    );
    yield r'rentalId';
    yield serializers.serialize(
      object.rentalId,
      specifiedType: const FullType(String),
    );
    if (object.vehicleId != null) {
      yield r'vehicleId';
      yield serializers.serialize(
        object.vehicleId,
        specifiedType: const FullType(String),
      );
    }
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(StationSwapStatus),
    );
    if (object.endReason != null) {
      yield r'endReason';
      yield serializers.serialize(
        object.endReason,
        specifiedType: const FullType(StationSwapEndReason),
      );
    }
    if (object.slotNumber != null) {
      yield r'slotNumber';
      yield serializers.serialize(
        object.slotNumber,
        specifiedType: const FullType(int),
      );
    }
    yield r'feeCents';
    yield serializers.serialize(
      object.feeCents,
      specifiedType: const FullType(int),
    );
    yield r'expiresAt';
    yield serializers.serialize(
      object.expiresAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.returnedSerial != null) {
      yield r'returnedSerial';
      yield serializers.serialize(
        object.returnedSerial,
        specifiedType: const FullType(String),
      );
    }
    if (object.returnedPct != null) {
      yield r'returnedPct';
      yield serializers.serialize(
        object.returnedPct,
        specifiedType: const FullType(int),
      );
    }
    if (object.releasedSerial != null) {
      yield r'releasedSerial';
      yield serializers.serialize(
        object.releasedSerial,
        specifiedType: const FullType(String),
      );
    }
    if (object.distanceM != null) {
      yield r'distanceM';
      yield serializers.serialize(
        object.distanceM,
        specifiedType: const FullType(int),
      );
    }
    if (object.customerId != null) {
      yield r'customerId';
      yield serializers.serialize(
        object.customerId,
        specifiedType: const FullType(String),
      );
    }
    if (object.completedAt != null) {
      yield r'completedAt';
      yield serializers.serialize(
        object.completedAt,
        specifiedType: const FullType(DateTime),
      );
    }
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
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
    StationSwap object, {
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
    required StationSwapBuilder result,
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
        case r'stationId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.stationId = valueDes;
          break;
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.rentalId = valueDes;
          break;
        case r'vehicleId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.vehicleId = valueDes;
          break;
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(StationSwapStatus),
          ) as StationSwapStatus;
          result.status = valueDes;
          break;
        case r'endReason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(StationSwapEndReason),
          ) as StationSwapEndReason?;
          if (valueDes == null) continue;
          result.endReason = valueDes;
          break;
        case r'slotNumber':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.slotNumber = valueDes;
          break;
        case r'feeCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.feeCents = valueDes;
          break;
        case r'expiresAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.expiresAt = valueDes;
          break;
        case r'returnedSerial':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.returnedSerial = valueDes;
          break;
        case r'returnedPct':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.returnedPct = valueDes;
          break;
        case r'releasedSerial':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.releasedSerial = valueDes;
          break;
        case r'distanceM':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.distanceM = valueDes;
          break;
        case r'customerId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.customerId = valueDes;
          break;
        case r'completedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(DateTime),
          ) as DateTime?;
          if (valueDes == null) continue;
          result.completedAt = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
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
  StationSwap deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = StationSwapBuilder();
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
