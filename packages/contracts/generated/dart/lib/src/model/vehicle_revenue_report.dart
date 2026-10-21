//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/vehicle_revenue_row.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'vehicle_revenue_report.g.dart';

/// VehicleRevenueReport
///
/// Properties:
/// * [from]
/// * [to]
/// * [rows]
@BuiltValue()
abstract class VehicleRevenueReport
    implements Built<VehicleRevenueReport, VehicleRevenueReportBuilder> {
  @BuiltValueField(wireName: r'from')
  DateTime get from;

  @BuiltValueField(wireName: r'to')
  DateTime get to;

  @BuiltValueField(wireName: r'rows')
  BuiltList<VehicleRevenueRow> get rows;

  VehicleRevenueReport._();

  factory VehicleRevenueReport([void updates(VehicleRevenueReportBuilder b)]) =
      _$VehicleRevenueReport;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(VehicleRevenueReportBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<VehicleRevenueReport> get serializer =>
      _$VehicleRevenueReportSerializer();
}

class _$VehicleRevenueReportSerializer
    implements PrimitiveSerializer<VehicleRevenueReport> {
  @override
  final Iterable<Type> types = const [
    VehicleRevenueReport,
    _$VehicleRevenueReport
  ];

  @override
  final String wireName = r'VehicleRevenueReport';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    VehicleRevenueReport object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'from';
    yield serializers.serialize(
      object.from,
      specifiedType: const FullType(DateTime),
    );
    yield r'to';
    yield serializers.serialize(
      object.to,
      specifiedType: const FullType(DateTime),
    );
    yield r'rows';
    yield serializers.serialize(
      object.rows,
      specifiedType: const FullType(BuiltList, [FullType(VehicleRevenueRow)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    VehicleRevenueReport object, {
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
    required VehicleRevenueReportBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'from':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.from = valueDes;
          break;
        case r'to':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.to = valueDes;
          break;
        case r'rows':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType(BuiltList, [FullType(VehicleRevenueRow)]),
          ) as BuiltList<VehicleRevenueRow>;
          result.rows.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  VehicleRevenueReport deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = VehicleRevenueReportBuilder();
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
