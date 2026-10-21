//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/customer.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'customer_page.g.dart';

/// CustomerPage
///
/// Properties:
/// * [items]
/// * [nextCursor]
@BuiltValue()
abstract class CustomerPage
    implements Built<CustomerPage, CustomerPageBuilder> {
  @BuiltValueField(wireName: r'items')
  BuiltList<Customer> get items;

  @BuiltValueField(wireName: r'nextCursor')
  String? get nextCursor;

  CustomerPage._();

  factory CustomerPage([void updates(CustomerPageBuilder b)]) = _$CustomerPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CustomerPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CustomerPage> get serializer => _$CustomerPageSerializer();
}

class _$CustomerPageSerializer implements PrimitiveSerializer<CustomerPage> {
  @override
  final Iterable<Type> types = const [CustomerPage, _$CustomerPage];

  @override
  final String wireName = r'CustomerPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CustomerPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Customer)]),
    );
    if (object.nextCursor != null) {
      yield r'nextCursor';
      yield serializers.serialize(
        object.nextCursor,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    CustomerPage object, {
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
    required CustomerPageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Customer)]),
          ) as BuiltList<Customer>;
          result.items.replace(valueDes);
          break;
        case r'nextCursor':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.nextCursor = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CustomerPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CustomerPageBuilder();
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
