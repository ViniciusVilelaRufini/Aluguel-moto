//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/customer_maintenance_request.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'customer_maintenance_request_list.g.dart';

/// CustomerMaintenanceRequestList
///
/// Properties:
/// * [items]
@BuiltValue()
abstract class CustomerMaintenanceRequestList
    implements
        Built<CustomerMaintenanceRequestList,
            CustomerMaintenanceRequestListBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<CustomerMaintenanceRequest> get items;

  CustomerMaintenanceRequestList._();

  factory CustomerMaintenanceRequestList(
          [void updates(CustomerMaintenanceRequestListBuilder b)]) =
      _$CustomerMaintenanceRequestList;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CustomerMaintenanceRequestListBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CustomerMaintenanceRequestList> get serializer =>
      _$CustomerMaintenanceRequestListSerializer();
}

class _$CustomerMaintenanceRequestListSerializer
    implements PrimitiveSerializer<CustomerMaintenanceRequestList> {
  @override
  final Iterable<Type> types = const [
    CustomerMaintenanceRequestList,
    _$CustomerMaintenanceRequestList
  ];

  @override
  final String wireName = r'CustomerMaintenanceRequestList';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CustomerMaintenanceRequestList object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType:
          const FullType(BuiltList, [FullType(CustomerMaintenanceRequest)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CustomerMaintenanceRequestList object, {
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
    required CustomerMaintenanceRequestListBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(
                BuiltList, [FullType(CustomerMaintenanceRequest)]),
          ) as BuiltList<CustomerMaintenanceRequest>;
          result.items.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CustomerMaintenanceRequestList deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CustomerMaintenanceRequestListBuilder();
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
