//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:volti_api/src/model/plan_code.dart';
import 'package:volti_api/src/model/track_point.dart';
import 'package:volti_api/src/model/payment_method.dart';
import 'package:built_collection/built_collection.dart';
import 'package:volti_api/src/model/insurance_coverage.dart';
import 'package:volti_api/src/model/price_breakdown.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'receipt.g.dart';

/// Receipt
///
/// Properties:
/// * [rentalId]
/// * [number] - Número do recibo.
/// * [issuedAt]
/// * [customerName]
/// * [vehicleCode]
/// * [planCode]
/// * [coverage]
/// * [startedAt]
/// * [endedAt]
/// * [durationSeconds]
/// * [breakdown]
/// * [paymentMethod]
/// * [cardLast4]
/// * [pdfUrl] - URL pré-assinada do PDF (expira em 15 min).
/// * [invoiceNumber] - Número da NFS-e, quando emitida.
/// * [track]
@BuiltValue()
abstract class Receipt implements Built<Receipt, ReceiptBuilder> {
  @BuiltValueField(wireName: r'rentalId')
  String get rentalId;

  /// Número do recibo.
  @BuiltValueField(wireName: r'number')
  String get number;

  @BuiltValueField(wireName: r'issuedAt')
  DateTime get issuedAt;

  @BuiltValueField(wireName: r'customerName')
  String? get customerName;

  @BuiltValueField(wireName: r'vehicleCode')
  String get vehicleCode;

  @BuiltValueField(wireName: r'planCode')
  PlanCode get planCode;
  // enum planCodeEnum {  minute,  hour,  day,  weekly,  monthly,  };

  @BuiltValueField(wireName: r'coverage')
  InsuranceCoverage get coverage;
  // enum coverageEnum {  basic,  full,  };

  @BuiltValueField(wireName: r'startedAt')
  DateTime get startedAt;

  @BuiltValueField(wireName: r'endedAt')
  DateTime get endedAt;

  @BuiltValueField(wireName: r'durationSeconds')
  int get durationSeconds;

  @BuiltValueField(wireName: r'breakdown')
  PriceBreakdown get breakdown;

  @BuiltValueField(wireName: r'paymentMethod')
  PaymentMethod? get paymentMethod;
  // enum paymentMethodEnum {  card,  pix,  wallet,  };

  @BuiltValueField(wireName: r'cardLast4')
  String? get cardLast4;

  /// URL pré-assinada do PDF (expira em 15 min).
  @BuiltValueField(wireName: r'pdfUrl')
  String? get pdfUrl;

  /// Número da NFS-e, quando emitida.
  @BuiltValueField(wireName: r'invoiceNumber')
  String? get invoiceNumber;

  @BuiltValueField(wireName: r'track')
  BuiltList<TrackPoint>? get track;

  Receipt._();

  factory Receipt([void updates(ReceiptBuilder b)]) = _$Receipt;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(ReceiptBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<Receipt> get serializer => _$ReceiptSerializer();
}

class _$ReceiptSerializer implements PrimitiveSerializer<Receipt> {
  @override
  final Iterable<Type> types = const [Receipt, _$Receipt];

  @override
  final String wireName = r'Receipt';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    Receipt object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'rentalId';
    yield serializers.serialize(
      object.rentalId,
      specifiedType: const FullType(String),
    );
    yield r'number';
    yield serializers.serialize(
      object.number,
      specifiedType: const FullType(String),
    );
    yield r'issuedAt';
    yield serializers.serialize(
      object.issuedAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.customerName != null) {
      yield r'customerName';
      yield serializers.serialize(
        object.customerName,
        specifiedType: const FullType(String),
      );
    }
    yield r'vehicleCode';
    yield serializers.serialize(
      object.vehicleCode,
      specifiedType: const FullType(String),
    );
    yield r'planCode';
    yield serializers.serialize(
      object.planCode,
      specifiedType: const FullType(PlanCode),
    );
    yield r'coverage';
    yield serializers.serialize(
      object.coverage,
      specifiedType: const FullType(InsuranceCoverage),
    );
    yield r'startedAt';
    yield serializers.serialize(
      object.startedAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'endedAt';
    yield serializers.serialize(
      object.endedAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'durationSeconds';
    yield serializers.serialize(
      object.durationSeconds,
      specifiedType: const FullType(int),
    );
    yield r'breakdown';
    yield serializers.serialize(
      object.breakdown,
      specifiedType: const FullType(PriceBreakdown),
    );
    if (object.paymentMethod != null) {
      yield r'paymentMethod';
      yield serializers.serialize(
        object.paymentMethod,
        specifiedType: const FullType(PaymentMethod),
      );
    }
    if (object.cardLast4 != null) {
      yield r'cardLast4';
      yield serializers.serialize(
        object.cardLast4,
        specifiedType: const FullType(String),
      );
    }
    if (object.pdfUrl != null) {
      yield r'pdfUrl';
      yield serializers.serialize(
        object.pdfUrl,
        specifiedType: const FullType(String),
      );
    }
    if (object.invoiceNumber != null) {
      yield r'invoiceNumber';
      yield serializers.serialize(
        object.invoiceNumber,
        specifiedType: const FullType(String),
      );
    }
    if (object.track != null) {
      yield r'track';
      yield serializers.serialize(
        object.track,
        specifiedType: const FullType(BuiltList, [FullType(TrackPoint)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    Receipt object, {
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
    required ReceiptBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'rentalId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.rentalId = valueDes;
          break;
        case r'number':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.number = valueDes;
          break;
        case r'issuedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.issuedAt = valueDes;
          break;
        case r'customerName':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.customerName = valueDes;
          break;
        case r'vehicleCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.vehicleCode = valueDes;
          break;
        case r'planCode':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PlanCode),
          ) as PlanCode;
          result.planCode = valueDes;
          break;
        case r'coverage':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(InsuranceCoverage),
          ) as InsuranceCoverage;
          result.coverage = valueDes;
          break;
        case r'startedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.startedAt = valueDes;
          break;
        case r'endedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.endedAt = valueDes;
          break;
        case r'durationSeconds':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.durationSeconds = valueDes;
          break;
        case r'breakdown':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PriceBreakdown),
          ) as PriceBreakdown;
          result.breakdown.replace(valueDes);
          break;
        case r'paymentMethod':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(PaymentMethod),
          ) as PaymentMethod?;
          if (valueDes == null) continue;
          result.paymentMethod = valueDes;
          break;
        case r'cardLast4':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.cardLast4 = valueDes;
          break;
        case r'pdfUrl':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.pdfUrl = valueDes;
          break;
        case r'invoiceNumber':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.invoiceNumber = valueDes;
          break;
        case r'track':
          final valueDes = serializers.deserialize(
            value,
            specifiedType:
                const FullType.nullable(BuiltList, [FullType(TrackPoint)]),
          ) as BuiltList<TrackPoint>?;
          if (valueDes == null) continue;
          result.track.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  Receipt deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = ReceiptBuilder();
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
