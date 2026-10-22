//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_model_update.g.dart';

/// VehicleModelUpdate
///
/// Properties:
/// * [name]
/// * [categoryLabel]
/// * [description]
/// * [photoObjectKey] - Chave devolvida por `POST /vehicle-models/uploads` (prefixo `catalog/`).
/// * [pricePerMinuteCents]
/// * [unlockFeeCents]
/// * [inheritPlanUnlockFee] - `true` remove o desbloqueio próprio do modelo (volta ao do plano). A API também aceita `unlockFeeCents: null`.
/// * [serviceIntervalKm]
/// * [serviceIntervalHours]
/// * [active]
/// * [sortOrder]
@BuiltValue()
abstract class VehicleModelUpdate
    implements Built<VehicleModelUpdate, VehicleModelUpdateBuilder> {
  @BuiltValueField(wireName: r'name')
  String? get name;

  @BuiltValueField(wireName: r'categoryLabel')
  String? get categoryLabel;

  @BuiltValueField(wireName: r'description')
  String? get description;

  /// Chave devolvida por `POST /vehicle-models/uploads` (prefixo `catalog/`).
  @BuiltValueField(wireName: r'photoObjectKey')
  String? get photoObjectKey;

  @BuiltValueField(wireName: r'pricePerMinuteCents')
  int? get pricePerMinuteCents;

  @BuiltValueField(wireName: r'unlockFeeCents')
  int? get unlockFeeCents;

  /// `true` remove o desbloqueio próprio do modelo (volta ao do plano). A API também aceita `unlockFeeCents: null`.
  @BuiltValueField(wireName: r'inheritPlanUnlockFee')
  bool? get inheritPlanUnlockFee;

  @BuiltValueField(wireName: r'serviceIntervalKm')
  int? get serviceIntervalKm;

  @BuiltValueField(wireName: r'serviceIntervalHours')
  int? get serviceIntervalHours;

  @BuiltValueField(wireName: r'active')
  bool? get active;

  @BuiltValueField(wireName: r'sortOrder')
  int? get sortOrder;

  VehicleModelUpdate._();

  factory VehicleModelUpdate([void updates(VehicleModelUpdateBuilder b)]) =
      _$VehicleModelUpdate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleModelUpdateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleModelUpdate> get serializer =>
      _$VehicleModelUpdateSerializer();
}

class _$VehicleModelUpdateSerializer
    implements PrimitiveSerializer<VehicleModelUpdate> {
  @override
  final Iterable<Type> types = const [VehicleModelUpdate, _$VehicleModelUpdate];

  @override
  final String wireName = r'VehicleModelUpdate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleModelUpdate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.name != null) {
      yield r'name';
      yield serializers.serialize(
        object.name,
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
    if (object.description != null) {
      yield r'description';
      yield serializers.serialize(
        object.description,
        specifiedType: const FullType(String),
      );
    }
    if (object.photoObjectKey != null) {
      yield r'photoObjectKey';
      yield serializers.serialize(
        object.photoObjectKey,
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
    if (object.unlockFeeCents != null) {
      yield r'unlockFeeCents';
      yield serializers.serialize(
        object.unlockFeeCents,
        specifiedType: const FullType(int),
      );
    }
    if (object.inheritPlanUnlockFee != null) {
      yield r'inheritPlanUnlockFee';
      yield serializers.serialize(
        object.inheritPlanUnlockFee,
        specifiedType: const FullType(bool),
      );
    }
    if (object.serviceIntervalKm != null) {
      yield r'serviceIntervalKm';
      yield serializers.serialize(
        object.serviceIntervalKm,
        specifiedType: const FullType(int),
      );
    }
    if (object.serviceIntervalHours != null) {
      yield r'serviceIntervalHours';
      yield serializers.serialize(
        object.serviceIntervalHours,
        specifiedType: const FullType(int),
      );
    }
    if (object.active != null) {
      yield r'active';
      yield serializers.serialize(
        object.active,
        specifiedType: const FullType(bool),
      );
    }
    if (object.sortOrder != null) {
      yield r'sortOrder';
      yield serializers.serialize(
        object.sortOrder,
        specifiedType: const FullType(int),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    VehicleModelUpdate object, {
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
    required VehicleModelUpdateBuilder result,
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
        case r'categoryLabel':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.categoryLabel = valueDes;
          break;
        case r'description':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.description = valueDes;
          break;
        case r'photoObjectKey':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.photoObjectKey = valueDes;
          break;
        case r'pricePerMinuteCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.pricePerMinuteCents = valueDes;
          break;
        case r'unlockFeeCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.unlockFeeCents = valueDes;
          break;
        case r'inheritPlanUnlockFee':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.inheritPlanUnlockFee = valueDes;
          break;
        case r'serviceIntervalKm':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.serviceIntervalKm = valueDes;
          break;
        case r'serviceIntervalHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.serviceIntervalHours = valueDes;
          break;
        case r'active':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(bool),
          ) as bool?;
          if (valueDes == null) continue;
          result.active = valueDes;
          break;
        case r'sortOrder':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(int),
          ) as int?;
          if (valueDes == null) continue;
          result.sortOrder = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  VehicleModelUpdate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleModelUpdateBuilder();
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
