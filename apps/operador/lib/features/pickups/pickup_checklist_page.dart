import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/depot_state.dart';
import 'package:volti_operador/data/device.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/handover_models.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/features/battery/battery_swap_page.dart' show SerialScannerPage;
import 'package:volti_operador/features/pickups/handover_status_page.dart';
import 'package:volti_operador/features/pickups/handover_ui.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

enum _SubmitError { offline, invalidCode, other }

/// Checklist de saida: freios, luzes, pneus, buzina, painel, carenagem,
/// bateria (% e serie), fotos de frente, tras e lados (minimo 4). Envia a
/// entrega (`POST /handovers`, `pickup`) e abre o estado ao vivo. Sem rede o
/// rascunho fica guardado: o cliente precisa aceitar com o servidor.
class PickupChecklistPage extends ConsumerStatefulWidget {
  const PickupChecklistPage({super.key, required this.pickupCode, this.reservation, this.scanSerial});

  final String pickupCode;

  /// Reserva da agenda (primeiro nome e moto), quando conhecida.
  final Reservation? reservation;

  /// Leitor do numero de serie (padrao: camera). Injetavel nos testes.
  final Future<String?> Function(BuildContext context)? scanSerial;

  @override
  ConsumerState<PickupChecklistPage> createState() => _PickupChecklistPageState();
}

class _PickupChecklistPageState extends ConsumerState<PickupChecklistPage> {
  late final TextEditingController _battery;
  late final TextEditingController _serial;
  bool _sending = false;
  _SubmitError? _error;
  String? _errorMessage;

  PickupDraftsController get _drafts => ref.read(pickupDraftsProvider.notifier);
  PickupDraft get _draft => _drafts.of(widget.pickupCode);

  @override
  void initState() {
    super.initState();
    final d = _draft;
    _battery = TextEditingController(text: d.batteryPct?.toString() ?? '');
    _serial = TextEditingController(text: d.batterySerial);
  }

  @override
  void dispose() {
    _battery.dispose();
    _serial.dispose();
    super.dispose();
  }

  void _put(PickupDraft d) {
    _drafts.put(d);
    if (_error != null) setState(() => _error = null);
  }

  Future<void> _takeAngle(PhotoAngle a) async {
    final path = await ref.read(photoPickerProvider).take();
    if (path == null || !mounted) return;
    _put(_draft.copyWith(photos: {..._draft.photos, a: path}));
  }

  Future<void> _takeExtra() async {
    final path = await ref.read(photoPickerProvider).take();
    if (path == null || !mounted) return;
    _put(_draft.copyWith(extraPhotos: [..._draft.extraPhotos, path]));
  }

  void _removePhoto(int index) {
    final d = _draft;
    final path = d.photoPaths[index];
    final angle = d.photos.entries.where((e) => e.value == path).map((e) => e.key).firstOrNull;
    if (angle != null) {
      _put(d.copyWith(photos: {...d.photos}..remove(angle)));
    } else {
      _put(d.copyWith(extraPhotos: [...d.extraPhotos]..remove(path)));
    }
  }

  Future<void> _scanSerial() async {
    final value = await (widget.scanSerial ?? SerialScannerPage.open)(context);
    if (value == null || !mounted) return;
    _serial.text = value.trim();
    _put(_draft.copyWith(batterySerial: value.trim()));
  }

  Future<void> _submit() async {
    final online = ref.read(onlineProvider).value ?? true;
    if (!online) return setState(() => _error = _SubmitError.offline);
    setState(() {
      _sending = true;
      _error = null;
    });
    final repo = ref.read(fieldRepositoryProvider);
    var d = _draft;
    try {
      final uploaded = Map<String, String>.of(d.uploadedKeys);
      final keys = <String>[];
      for (final path in d.photoPaths) {
        final key = uploaded[path] ?? await repo.uploadHandoverPhoto(path);
        uploaded[path] = key;
        keys.add(key);
        // Guarda o progresso: nova tentativa nao reenvia o que ja subiu.
        d = d.copyWith(uploadedKeys: Map.of(uploaded));
        _drafts.put(d);
      }
      final handover = await repo.createPickupHandover(d, photoKeys: keys);
      if (!mounted) return;
      _drafts.clear(widget.pickupCode);
      VoltiHaptics.success();
      await Navigator.of(context).pushReplacement(MaterialPageRoute<void>(
          builder: (_) => HandoverStatusPage(handoverId: handover.id, initial: handover)));
    } on RepositoryException catch (e) {
      if (!mounted) return;
      // Resposta perdida: a entrega ja existe. Recarrega a agenda e abre o estado.
      if (e.status == 409 && e.slug == 'reservation-in-handover') {
        final handoverId = await _existingHandover();
        if (!mounted) return;
        if (handoverId != null) {
          _drafts.clear(widget.pickupCode);
          await Navigator.of(context).pushReplacement(MaterialPageRoute<void>(
              builder: (_) => HandoverStatusPage(handoverId: handoverId)));
          return;
        }
      }
      setState(() {
        _sending = false;
        if (e.kind == FailureKind.network) {
          _error = _SubmitError.offline;
        } else if (e.status == 404) {
          _error = _SubmitError.invalidCode;
        } else {
          _error = _SubmitError.other;
          _errorMessage = e.message;
        }
      });
    } on Exception {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = _SubmitError.other;
        _errorMessage = null;
      });
    }
  }

  /// `handoverId` da reserva na agenda recarregada, se houver.
  Future<String?> _existingHandover() async {
    final reservationId =
        widget.reservation?.id ?? PickupCode.parse(widget.pickupCode)?.reservationId;
    if (reservationId == null) return null;
    try {
      final depots = await ref.read(depotsProvider.future);
      final depotId = widget.reservation?.depotId ??
          effectiveDepotId(depots.depots, ref.read(selectedDepotProvider));
      if (depotId == null) return null;
      ref.invalidate(pickupsProvider(depotId));
      final agenda = await ref.read(pickupsProvider(depotId).future);
      for (final r in agenda) {
        if (r.id.toLowerCase() == reservationId.toLowerCase()) return r.handoverId;
      }
    } on Exception {
      return null;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final d = ref.watch(pickupDraftsProvider)[widget.pickupCode] ??
        PickupDraft(pickupCode: widget.pickupCode);
    final r = widget.reservation;
    final missing = [
      if (!d.allAnswered) t.missingChecklist,
      if (!d.batteryValid) t.missingBattery,
      if (!d.photosComplete) t.missingPhotos,
    ];
    final notice = switch (_error) {
      _SubmitError.offline => Notice(
          key: const Key('pickup-offline'),
          tone: NoticeTone.warning,
          icon: LucideIcons.wifiOff,
          title: t.pickupOffline,
          body: t.pickupOfflineBody,
        ),
      _SubmitError.invalidCode => Notice(
          key: const Key('pickup-error'),
          tone: NoticeTone.danger,
          icon: LucideIcons.circleAlert,
          title: t.pickupCodeInvalid,
          body: t.pickupCodeInvalidBody,
        ),
      _SubmitError.other => Notice(
          key: const Key('pickup-error'),
          tone: NoticeTone.danger,
          icon: LucideIcons.circleAlert,
          title: t.jobFailed(_errorMessage ?? t.errorGeneric),
        ),
      null => null,
    };

    return Scaffold(
      body: Column(
        children: [
          OperatorTopBar(
            title: t.pickupChecklistTitle,
            trailing: Text(
              t.itemsCounter(d.answered, pickupChecklistCodes.length),
              style: const TextStyle(
                fontFamily: VoltiTypography.fontMono,
                fontWeight: FontWeight.w700,
                fontSize: 13,
                color: VoltiColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
              children: [
                const ConnectivityBanner(padding: EdgeInsets.only(bottom: VoltiSpacing.s10)),
                if (r != null) ...[
                  SectionCard(
                    child: Row(
                      children: [
                        const Icon(LucideIcons.userRound, color: VoltiColors.ink500),
                        const SizedBox(width: VoltiSpacing.s10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(firstNameOf(r.customerFirstName, t.customerFallback),
                                  style: VoltiTypography.bodyStrong),
                              if (r.vehicle != null)
                                Text(r.vehicle!.code,
                                    style: VoltiTypography.body.copyWith(
                                        fontFamily: VoltiTypography.fontMono,
                                        color: VoltiColors.textSecondary)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: VoltiSpacing.s12),
                ],
                for (final code in pickupChecklistCodes)
                  HandoverItemRow(
                    keyPrefix: 'ho',
                    code: code,
                    value: d.items[code],
                    note: d.notes[code],
                    onChanged: (v) => _put(_draft.copyWith(items: {..._draft.items, code: v})),
                    onNote: (v) => _put(_draft.copyWith(notes: {..._draft.notes, code: v})),
                  ),
                SectionLabel(t.batteryPctLabel),
                SectionCard(
                  child: Column(
                    children: [
                      BatteryPctField(
                        fieldKey: const Key('battery-pct'),
                        controller: _battery,
                        onChanged: (v) => _put(_draft.copyWith(batteryPct: v)),
                      ),
                      const SizedBox(height: VoltiSpacing.s12),
                      TextField(
                        key: const Key('battery-serial'),
                        controller: _serial,
                        maxLength: 64,
                        textCapitalization: TextCapitalization.characters,
                        style:
                            VoltiTypography.body.copyWith(fontFamily: VoltiTypography.fontMono),
                        decoration: InputDecoration(
                          labelText: t.batterySerialLabel,
                          counterText: '',
                          suffixIcon: IconButton(
                            key: const Key('battery-serial-scan'),
                            tooltip: t.scanAction,
                            constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                            icon: const Icon(LucideIcons.scanBarcode),
                            onPressed: _scanSerial,
                          ),
                        ),
                        onChanged: (v) => _put(_draft.copyWith(batterySerial: v)),
                      ),
                    ],
                  ),
                ),
                SectionLabel(t.pickupPhotosTitle, hint: t.pickupPhotosHint),
                SectionCard(
                  padding: 4,
                  child: Column(
                    children: [
                      for (final a in PhotoAngle.values)
                        KeyedSubtree(
                          key: Key('photo-${a.name}'),
                          child: PhotoSlotRow(
                            label: photoAngleLabel(t, a),
                            done: d.photos.containsKey(a),
                            onTap: () => _takeAngle(a),
                          ),
                        ),
                      if (d.photoCount < maxHandoverPhotos)
                        KeyedSubtree(
                          key: const Key('photo-extra'),
                          child: ListRow(
                            icon: LucideIcons.imagePlus,
                            title: t.photoExtraAdd,
                            trailing: ListRowTrailing.none,
                            onTap: _takeExtra,
                          ),
                        ),
                    ],
                  ),
                ),
                if (d.photoPaths.isNotEmpty) ...[
                  const SizedBox(height: VoltiSpacing.s10),
                  PhotoThumbnails(paths: d.photoPaths, onRemove: _removePhoto),
                ],
              ],
            ),
          ),
          SubmitBar(
            hint: missing.isEmpty ? null : missingHint(t, missing),
            notice: notice,
            button: VoltiButton(
              key: const Key('submit-pickup'),
              label: t.pickupSubmit,
              icon: LucideIcons.send,
              fullWidth: true,
              size: VoltiButtonSize.lg,
              loading: _sending,
              onPressed: d.canSubmit && !_sending ? _submit : null,
            ),
          ),
        ],
      ),
    );
  }
}
