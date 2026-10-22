//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'handover_checklist_item.g.dart';

/// HandoverChecklistItem
///
/// Properties:
/// * [code] - Item do checklist (ex.: `freios`, `pneus`, `luzes`, `carenagem`).
/// * [ok]
/// * [note]
@BuiltValue()
abstract class HandoverChecklistItem
    implements Built<HandoverChecklistItem, HandoverChecklistItemBuilder> {
  /// Item do checklist (ex.: `freios`, `pneus`, `luzes`, `carenagem`).
  @BuiltValueField(wireName: r'code')
  String get code;

  @BuiltValueField(wireName: r'ok')
  bool get ok;

  @BuiltValueField(wireName: r'note')
  String? get note;

  HandoverChecklistItem._();

  factory HandoverChecklistItem(
      [void updates(HandoverChecklistItemBuilder b)]) = _$HandoverChecklistItem;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(HandoverChecklistItemBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<HandoverChecklistItem> get serializer =>
      _$HandoverChecklistItemSerializer();
}

class _$HandoverChecklistItemSerializer
    implements PrimitiveSerializer<HandoverChecklistItem> {
  @override
  final Iterable<Type> types = const [
    HandoverChecklistItem,
    _$HandoverChecklistItem
  ];

  @override
  final String wireName = r'HandoverChecklistItem';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    HandoverChecklistItem object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'code';
    yield serializers.serialize(
      object.code,
      specifiedType: const FullType(String),
    );
    yield r'ok';
    yield serializers.serialize(
      object.ok,
      specifiedType: const FullType(bool),
    );
    if (object.note != null) {
      yield r'note';
      yield serializers.serialize(
        object.note,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    HandoverChecklistItem object, {
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
    required HandoverChecklistItemBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'code':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.code = valueDes;
          break;
        case r'ok':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.ok = valueDes;
          break;
        case r'note':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.note = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  HandoverChecklistItem deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = HandoverChecklistItemBuilder();
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
