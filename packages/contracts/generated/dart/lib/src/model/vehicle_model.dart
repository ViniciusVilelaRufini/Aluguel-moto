//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_model.g.dart';

/// VehicleModel
///
/// Properties:
/// * [id]
/// * [name]
/// * [slug]
/// * [categoryLabel] - Rótulo da categoria (pt-BR).
/// * [description]
/// * [photoUrl] - Link assinado da foto (24 h). Ausente sem foto.
/// * [photoObjectKey] - staff. Chave do objeto no bucket de catálogo.
/// * [pricePerMinuteCents] - Preço por minuto do plano `minute` para este modelo.
/// * [unlockFeeCents] - Desbloqueio específico do modelo (ausente = o do plano).
/// * [serviceIntervalKm]
/// * [serviceIntervalHours]
/// * [active]
/// * [sortOrder]
/// * [createdAt]
/// * [updatedAt]
@BuiltValue()
abstract class VehicleModel
    implements Built<VehicleModel, VehicleModelBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'slug')
  String get slug;

  /// Rótulo da categoria (pt-BR).
  @BuiltValueField(wireName: r'categoryLabel')
  String get categoryLabel;

  @BuiltValueField(wireName: r'description')
  String? get description;

  /// Link assinado da foto (24 h). Ausente sem foto.
  @BuiltValueField(wireName: r'photoUrl')
  String? get photoUrl;

  /// staff. Chave do objeto no bucket de catálogo.
  @BuiltValueField(wireName: r'photoObjectKey')
  String? get photoObjectKey;

  /// Preço por minuto do plano `minute` para este modelo.
  @BuiltValueField(wireName: r'pricePerMinuteCents')
  int get pricePerMinuteCents;

  /// Desbloqueio específico do modelo (ausente = o do plano).
  @BuiltValueField(wireName: r'unlockFeeCents')
  int? get unlockFeeCents;

  @BuiltValueField(wireName: r'serviceIntervalKm')
  int get serviceIntervalKm;

  @BuiltValueField(wireName: r'serviceIntervalHours')
  int get serviceIntervalHours;

  @BuiltValueField(wireName: r'active')
  bool get active;

  @BuiltValueField(wireName: r'sortOrder')
  int get sortOrder;

  @BuiltValueField(wireName: r'createdAt')
  DateTime get createdAt;

  @BuiltValueField(wireName: r'updatedAt')
  DateTime get updatedAt;

  VehicleModel._();

  factory VehicleModel([void updates(VehicleModelBuilder b)]) = _$VehicleModel;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleModelBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleModel> get serializer => _$VehicleModelSerializer();
}

class _$VehicleModelSerializer implements PrimitiveSerializer<VehicleModel> {
  @override
  final Iterable<Type> types = const [VehicleModel, _$VehicleModel];

  @override
  final String wireName = r'VehicleModel';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleModel object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(
      object.id,
      specifiedType: const FullType(String),
    );
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
    if (object.photoUrl != null) {
      yield r'photoUrl';
      yield serializers.serialize(
        object.photoUrl,
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
    yield r'serviceIntervalKm';
    yield serializers.serialize(
      object.serviceIntervalKm,
      specifiedType: const FullType(int),
    );
    yield r'serviceIntervalHours';
    yield serializers.serialize(
      object.serviceIntervalHours,
      specifiedType: const FullType(int),
    );
    yield r'active';
    yield serializers.serialize(
      object.active,
      specifiedType: const FullType(bool),
    );
    yield r'sortOrder';
    yield serializers.serialize(
      object.sortOrder,
      specifiedType: const FullType(int),
    );
    yield r'createdAt';
    yield serializers.serialize(
      object.createdAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'updatedAt';
    yield serializers.serialize(
      object.updatedAt,
      specifiedType: const FullType(DateTime),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    VehicleModel object, {
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
    required VehicleModelBuilder result,
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
        case r'photoUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.photoUrl = valueDes;
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
            specifiedType: const FullType(int),
          ) as int;
          result.serviceIntervalKm = valueDes;
          break;
        case r'serviceIntervalHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.serviceIntervalHours = valueDes;
          break;
        case r'active':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.active = valueDes;
          break;
        case r'sortOrder':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.sortOrder = valueDes;
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
            specifiedType: const FullType(DateTime),
          ) as DateTime;
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
  VehicleModel deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleModelBuilder();
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
