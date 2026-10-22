//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/battery.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'van_stock.g.dart';

/// VanStock
///
/// Properties:
/// * [operatorId]
/// * [total]
/// * [chargedCount] - `chargePct >= 90`.
/// * [depletedCount]
/// * [items]
@BuiltValue()
abstract class VanStock implements Built<VanStock, VanStockBuilder> {
  @BuiltValueField(wireName: r'operatorId')
  String get operatorId;

  @BuiltValueField(wireName: r'total')
  int get total;

  /// `chargePct >= 90`.
  @BuiltValueField(wireName: r'chargedCount')
  int get chargedCount;

  @BuiltValueField(wireName: r'depletedCount')
  int get depletedCount;

  @BuiltValueField(wireName: r'items')
  BuiltList<Battery> get items;

  VanStock._();

  factory VanStock([void updates(VanStockBuilder b)]) = _$VanStock;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VanStockBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VanStock> get serializer => _$VanStockSerializer();
}

class _$VanStockSerializer implements PrimitiveSerializer<VanStock> {
  @override
  final Iterable<Type> types = const [VanStock, _$VanStock];

  @override
  final String wireName = r'VanStock';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VanStock object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'operatorId';
    yield serializers.serialize(
      object.operatorId,
      specifiedType: const FullType(String),
    );
    yield r'total';
    yield serializers.serialize(
      object.total,
      specifiedType: const FullType(int),
    );
    yield r'chargedCount';
    yield serializers.serialize(
      object.chargedCount,
      specifiedType: const FullType(int),
    );
    yield r'depletedCount';
    yield serializers.serialize(
      object.depletedCount,
      specifiedType: const FullType(int),
    );
    yield r'items';
    yield serializers.serialize(
      object.items,
      specifiedType: const FullType(BuiltList, [FullType(Battery)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    VanStock object, {
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
    required VanStockBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'operatorId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.operatorId = valueDes;
          break;
        case r'total':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.total = valueDes;
          break;
        case r'chargedCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.chargedCount = valueDes;
          break;
        case r'depletedCount':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.depletedCount = valueDes;
          break;
        case r'items':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(Battery)]),
          ) as BuiltList<Battery>;
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
  VanStock deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VanStockBuilder();
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
