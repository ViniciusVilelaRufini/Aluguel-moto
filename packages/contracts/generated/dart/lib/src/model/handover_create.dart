//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/handover_checklist_item.dart';
import 'package:volti_api/src/model/handover_type.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'handover_create.g.dart';

/// HandoverCreate
///
/// Properties:
/// * [type]
/// * [depotId] - Galpão onde a entrega acontece. Obrigatório em `return_depot` (`400`); em `pickup` precisa ser o da reserva, quando enviado.
/// * [pickupCode] - Só em `pickup` (obrigatório): conteúdo do QR da reserva.
/// * [rentalId] - Só em `return_depot` (obrigatório): aluguel que chega.
/// * [checklist]
/// * [photoKeys] - Chaves devolvidas por `POST /handovers/uploads` (prefixo `handovers/`).
/// * [batteryPct]
/// * [batterySerial]
@BuiltValue()
abstract class HandoverCreate
    implements Built<HandoverCreate, HandoverCreateBuilder> {
  @BuiltValueField(wireName: r'type')
  HandoverType get type;
  // enum typeEnum {  pickup,  return_depot,  };

  /// Galpão onde a entrega acontece. Obrigatório em `return_depot` (`400`); em `pickup` precisa ser o da reserva, quando enviado.
  @BuiltValueField(wireName: r'depotId')
  String? get depotId;

  /// Só em `pickup` (obrigatório): conteúdo do QR da reserva.
  @BuiltValueField(wireName: r'pickupCode')
  String? get pickupCode;

  /// Só em `return_depot` (obrigatório): aluguel que chega.
  @BuiltValueField(wireName: r'rentalId')
  String? get rentalId;

  @BuiltValueField(wireName: r'checklist')
  BuiltList<HandoverChecklistItem> get checklist;

  /// Chaves devolvidas por `POST /handovers/uploads` (prefixo `handovers/`).
  @BuiltValueField(wireName: r'photoKeys')
  BuiltList<String> get photoKeys;

  @BuiltValueField(wireName: r'batteryPct')
  int get batteryPct;

  @BuiltValueField(wireName: r'batterySerial')
  String? get batterySerial;

  HandoverCreate._();

  factory HandoverCreate([void updates(HandoverCreateBuilder b)]) =
      _$HandoverCreate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(HandoverCreateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<HandoverCreate> get serializer =>
      _$HandoverCreateSerializer();
}

class _$HandoverCreateSerializer
    implements PrimitiveSerializer<HandoverCreate> {
  @override
  final Iterable<Type> types = const [HandoverCreate, _$HandoverCreate];

  @override
  final String wireName = r'HandoverCreate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    HandoverCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(HandoverType),
    );
    if (object.depotId != null) {
      yield r'depotId';
      yield serializers.serialize(
        object.depotId,
        specifiedType: const FullType(String),
      );
    }
    if (object.pickupCode != null) {
      yield r'pickupCode';
      yield serializers.serialize(
        object.pickupCode,
        specifiedType: const FullType(String),
      );
    }
    if (object.rentalId != null) {
      yield r'rentalId';
      yield serializers.serialize(
        object.rentalId,
        specifiedType: const FullType(String),
      );
    }
    yield r'checklist';
    yield serializers.serialize(
      object.checklist,
      specifiedType:
          const FullType(BuiltList, [FullType(HandoverChecklistItem)]),
    );
    yield r'photoKeys';
    yield serializers.serialize(
      object.photoKeys,
      specifiedType: const FullType(BuiltList, [FullType(String)]),
    );
    yield r'batteryPct';
    yield serializers.serialize(
      object.batteryPct,
      specifiedType: const FullType(int),
    );
    if (object.batterySerial != null) {
      yield r'batterySerial';
      yield serializers.serialize(
        object.batterySerial,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    HandoverCreate object, {
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
    required HandoverCreateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(HandoverType),
          ) as HandoverType;
          result.type = valueDes;
          break;
        case r'depotId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.depotId = valueDes;
          break;
        case r'pickupCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.pickupCode = valueDes;
          break;
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.rentalId = valueDes;
          break;
        case r'checklist':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(HandoverChecklistItem)]),
          ) as BuiltList<HandoverChecklistItem>;
          result.checklist.replace(valueDes);
          break;
        case r'photoKeys':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.photoKeys.replace(valueDes);
          break;
        case r'batteryPct':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.batteryPct = valueDes;
          break;
        case r'batterySerial':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.batterySerial = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  HandoverCreate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = HandoverCreateBuilder();
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
