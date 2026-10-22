//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'customer_maintenance_request_create.g.dart';

/// CustomerMaintenanceRequestCreate
///
/// Properties:
/// * [slotStartsAt] - `startsAt` de uma janela livre.
/// * [description]
@BuiltValue()
abstract class CustomerMaintenanceRequestCreate
    implements
        Built<CustomerMaintenanceRequestCreate,
            CustomerMaintenanceRequestCreateBuilder> {
  /// `startsAt` de uma janela livre.
  @BuiltValueField(wireName: r'slotStartsAt')
  DateTime get slotStartsAt;

  @BuiltValueField(wireName: r'description')
  String get description;

  CustomerMaintenanceRequestCreate._();

  factory CustomerMaintenanceRequestCreate(
          [void updates(CustomerMaintenanceRequestCreateBuilder b)]) =
      _$CustomerMaintenanceRequestCreate;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CustomerMaintenanceRequestCreateBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CustomerMaintenanceRequestCreate> get serializer =>
      _$CustomerMaintenanceRequestCreateSerializer();
}

class _$CustomerMaintenanceRequestCreateSerializer
    implements PrimitiveSerializer<CustomerMaintenanceRequestCreate> {
  @override
  final Iterable<Type> types = const [
    CustomerMaintenanceRequestCreate,
    _$CustomerMaintenanceRequestCreate
  ];

  @override
  final String wireName = r'CustomerMaintenanceRequestCreate';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CustomerMaintenanceRequestCreate object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'slotStartsAt';
    yield serializers.serialize(
      object.slotStartsAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'description';
    yield serializers.serialize(
      object.description,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CustomerMaintenanceRequestCreate object, {
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
    required CustomerMaintenanceRequestCreateBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'slotStartsAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.slotStartsAt = valueDes;
          break;
        case r'description':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.description = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CustomerMaintenanceRequestCreate deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CustomerMaintenanceRequestCreateBuilder();
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
