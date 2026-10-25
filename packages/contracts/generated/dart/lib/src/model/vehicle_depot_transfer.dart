//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_depot_transfer.g.dart';

/// VehicleDepotTransfer
///
/// Properties:
/// * [depotId] - Galpão de destino (existente e ativo).
/// * [reason] - Motivo (vai para o AuditLog).
@BuiltValue()
abstract class VehicleDepotTransfer
    implements Built<VehicleDepotTransfer, VehicleDepotTransferBuilder> {
  /// Galpão de destino (existente e ativo).
  @BuiltValueField(wireName: r'depotId')
  String get depotId;

  /// Motivo (vai para o AuditLog).
  @BuiltValueField(wireName: r'reason')
  String get reason;

  VehicleDepotTransfer._();

  factory VehicleDepotTransfer([void updates(VehicleDepotTransferBuilder b)]) =
      _$VehicleDepotTransfer;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleDepotTransferBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleDepotTransfer> get serializer =>
      _$VehicleDepotTransferSerializer();
}

class _$VehicleDepotTransferSerializer
    implements PrimitiveSerializer<VehicleDepotTransfer> {
  @override
  final Iterable<Type> types = const [
    VehicleDepotTransfer,
    _$VehicleDepotTransfer
  ];

  @override
  final String wireName = r'VehicleDepotTransfer';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleDepotTransfer object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'depotId';
    yield serializers.serialize(
      object.depotId,
      specifiedType: const FullType(String),
    );
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    VehicleDepotTransfer object, {
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
    required VehicleDepotTransferBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'depotId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.depotId = valueDes;
          break;
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reason = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  VehicleDepotTransfer deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleDepotTransferBuilder();
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
