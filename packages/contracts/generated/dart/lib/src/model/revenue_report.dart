//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/revenue_row.dart';
import 'package:volti_api/src/model/report_group_by.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'revenue_report.g.dart';

/// RevenueReport
///
/// Properties:
/// * [from]
/// * [to]
/// * [groupBy]
/// * [rows]
/// * [totalNetCents]
@BuiltValue()
abstract class RevenueReport
    implements Built<RevenueReport, RevenueReportBuilder> {
  @BuiltValueField(wireName: r'from')
  DateTime get from;

  @BuiltValueField(wireName: r'to')
  DateTime get to;

  @BuiltValueField(wireName: r'groupBy')
  ReportGroupBy get groupBy;
  // enum groupByEnum {  hour,  day,  week,  month,  };

  @BuiltValueField(wireName: r'rows')
  BuiltList<RevenueRow> get rows;

  @BuiltValueField(wireName: r'totalNetCents')
  int get totalNetCents;

  RevenueReport._();

  factory RevenueReport([void updates(RevenueReportBuilder b)]) =
      _$RevenueReport;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(RevenueReportBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<RevenueReport> get serializer =>
      _$RevenueReportSerializer();
}

class _$RevenueReportSerializer implements PrimitiveSerializer<RevenueReport> {
  @override
  final Iterable<Type> types = const [RevenueReport, _$RevenueReport];

  @override
  final String wireName = r'RevenueReport';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    RevenueReport object, {
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
    yield r'groupBy';
    yield serializers.serialize(
      object.groupBy,
      specifiedType: const FullType(ReportGroupBy),
    );
    yield r'rows';
    yield serializers.serialize(
      object.rows,
      specifiedType: const FullType(BuiltList, [FullType(RevenueRow)]),
    );
    yield r'totalNetCents';
    yield serializers.serialize(
      object.totalNetCents,
      specifiedType: const FullType(int),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    RevenueReport object, {
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
    required RevenueReportBuilder result,
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
        case r'groupBy':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(ReportGroupBy),
          ) as ReportGroupBy;
          result.groupBy = valueDes;
          break;
        case r'rows':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(RevenueRow)]),
          ) as BuiltList<RevenueRow>;
          result.rows.replace(valueDes);
          break;
        case r'totalNetCents':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.totalNetCents = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  RevenueReport deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = RevenueReportBuilder();
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
