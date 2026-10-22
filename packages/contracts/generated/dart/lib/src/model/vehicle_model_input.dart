//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_model_input.g.dart';

/// VehicleModelInput
///
/// Properties:
/// * [name]
/// * [slug]
/// * [categoryLabel]
/// * [description]
/// * [photoObjectKey]
/// * [pricePerMinuteCents]
/// * [unlockFeeCents]
/// * [serviceIntervalKm]
/// * [serviceIntervalHours]
/// * [active]
/// * [sortOrder]
@BuiltValue()
abstract class VehicleModelInput
    implements Built<VehicleModelInput, VehicleModelInputBuilder> {
  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'slug')
  String get slug;

  @BuiltValueField(wireName: r'categoryLabel')
  String get categoryLabel;

  @BuiltValueField(wireName: r'description')
  String? get description;

  @BuiltValueField(wireName: r'photoObjectKey')
  String? get photoObjectKey;

  @BuiltValueField(wireName: r'pricePerMinuteCents')
  int get pricePerMinuteCents;

  @BuiltValueField(wireName: r'unlockFeeCents')
  int? get unlockFeeCents;

  @BuiltValueField(wireName: r'serviceIntervalKm')
  int? get serviceIntervalKm;

  @BuiltValueField(wireName: r'serviceIntervalHours')
  int? get serviceIntervalHours;

  @BuiltValueField(wireName: r'active')
  bool? get active;

  @BuiltValueField(wireName: r'sortOrder')
  int? get sortOrder;

  VehicleModelInput._();

  factory VehicleModelInput([void updates(VehicleModelInputBuilder b)]) =
      _$VehicleModelInput;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleModelInputBuilder b) => b
    ..serviceIntervalKm = 1000
    ..serviceIntervalHours = 100
    ..active = true
    ..sortOrder = 0;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleModelInput> get serializer =>
      _$VehicleModelInputSerializer();
}

class _$VehicleModelInputSerializer
    implements PrimitiveSerializer<VehicleModelInput> {
  @override
  final Iterable<Type> types = const [VehicleModelInput, _$VehicleModelInput];

  @override
  final String wireName = r'VehicleModelInput';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleModelInput object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'slug';
    yield serializers.serialize(
      object.slug,
      specifiedType: const FullType(String),
    );
    yield r'categoryLabel';
    yield serializers.serialize(
      object.categoryLabel,
      specifiedType: const FullType(String),
    );
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
    yield r'pricePerMinuteCents';
    yield serializers.serialize(
      object.pricePerMinuteCents,
      specifiedType: const FullType(int),
    );
    if (object.unlockFeeCents != null) {
      yield r'unlockFeeCents';
      yield serializers.serialize(
        object.unlockFeeCents,
        specifiedType: const FullType(int),
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
    VehicleModelInput object, {
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
    required VehicleModelInputBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.name = valueDes;
          break;
        case r'slug':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.slug = valueDes;
          break;
        case r'categoryLabel':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
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
            specifiedType: const FullType(int),
          ) as int;
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
  VehicleModelInput deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleModelInputBuilder();
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
