import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/depot_state.dart';
import 'package:volti_operador/data/device.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/handover_models.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/features/battery/battery_swap_page.dart' show SerialScannerPage;
import 'package:volti_operador/features/pickups/handover_ui.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

enum _Lookup { found, noRental, notFound, offline }

/// Chegada no galpao com checklist curto (freios, pneus, luzes, carenagem) e
/// bateria. Dois usos:
/// - devolucao de aluguel ([collectTask] nulo): confere a moto pelo codigo,
///   exige uma foto e envia `return_depot` pela fila offline;
/// - recolhimento da rua ([collectTask]): devolve a conclusao da tarefa
///   `collect` com o galpao e `maintenance` se algum item tiver problema.
class ArrivalChecklistPage extends ConsumerStatefulWidget {
  const ArrivalChecklistPage({super.key, this.collectTask, this.onCollectDone, this.scan});

  final FieldTask? collectTask;

  /// Recolhimento: recebe a conclusao (padrao: `Navigator.pop` com ela).
  final void Function(CompletionDraft draft)? onCollectDone;

  /// Leitor do QR da moto (padrao: camera). Injetavel nos testes.
  final Future<String?> Function(BuildContext context)? scan;

  @override
  ConsumerState<ArrivalChecklistPage> createState() => _ArrivalChecklistPageState();
}

class _ArrivalChecklistPageState extends ConsumerState<ArrivalChecklistPage> {
  final _vehicle = TextEditingController();
  final _battery = TextEditingController();
  ArrivalDraft _draft = const ArrivalDraft();
  _Lookup? _lookup;
  Vehicle? _found;
  bool _looking = false;
  bool _submitting = false;
  SubmitOutcome? _outcome;
  String? _error;

  bool get _collect => widget.collectTask != null;

  @override
  void dispose() {
    _vehicle.dispose();
    _battery.dispose();
    super.dispose();
  }

  void _set(ArrivalDraft d) => setState(() => _draft = d);

  Future<void> _scanVehicle() async {
    final t = AppLocalizations.of(context);
    final scan = widget.scan ??
        (c) => SerialScannerPage.open(c,
            title: t.arrivalScanVehicle, manualLabel: t.arrivalVehicleLabel);
    final raw = await scan(context);
    if (raw == null || !mounted) return;
    _vehicle.text = raw.trim();
    await _find();
  }

  Future<void> _find() async {
    final code = _vehicle.text.trim();
    if (code.isEmpty) return;
    setState(() {
      _looking = true;
      _lookup = null;
      _found = null;
    });
    _Lookup result;
    Vehicle? found;
    try {
      found = await ref.read(fieldRepositoryProvider).vehicleByCode(code);
      result = found.currentRentalId == null ? _Lookup.noRental : _Lookup.found;
    } on RepositoryException catch (e) {
      result = e.kind == FailureKind.network ? _Lookup.offline : _Lookup.notFound;
    }
    if (!mounted) return;
    setState(() {
      _looking = false;
      _lookup = result;
      _found = found;
    });
  }

  Future<void> _takePhoto() async {
    final path = await ref.read(photoPickerProvider).take();
    if (path == null || !mounted) return;
    _set(_draft.copyWith(photoPaths: [..._draft.photoPaths, path]));
  }

  Future<void> _submit(ArrivalDraft draft) async {
    final t = AppLocalizations.of(context);
    if (_collect) {
      final completion = CompletionDraft(
        notes: draft.summary((c) => checklistLabel(t, c), t.batteryPctLabel),
        vehicleStatus: draft.hasProblem ? 'maintenance' : 'free',
        depotId: draft.depotId,
      );
      if (widget.onCollectDone != null) {
        widget.onCollectDone!(completion);
      } else {
        Navigator.of(context).pop(completion);
      }
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    final outcome = await ref.read(syncControllerProvider.notifier).submitReturnHandover(
          ReturnArrival(
            vehicleCode: _found?.code ?? _vehicle.text.trim(),
            depotId: draft.depotId!,
            rentalId: _found?.currentRentalId,
            draft: draft,
          ),
        );
    if (!mounted) return;
    setState(() {
      _submitting = false;
      if (outcome.job.status == JobStatus.failed) {
        _error = outcome.job.error;
      } else {
        _outcome = outcome;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final o = _outcome;
    return Scaffold(
      body: Column(
        children: [
          OperatorTopBar(title: _collect ? t.arrivalCollectTitle : t.arrivalTitle),
          Expanded(child: o != null ? _result(t, o) : _form(t)),
        ],
      ),
    );
  }

  Widget _result(AppLocalizations t, SubmitOutcome o) {
    return ListView(
      padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
      children: [
        if (o.synced)
          Notice(
            key: const Key('arrival-sent'),
            tone: NoticeTone.success,
            icon: LucideIcons.circleCheck,
            title: _draft.hasProblem ? t.arrivalSentMaintenance : t.arrivalSent,
          )
        else
          Notice(
            key: const Key('arrival-queued'),
            tone: NoticeTone.info,
            icon: LucideIcons.cloudOff,
            title: t.awaitingSync,
            body: t.arrivalQueued,
          ),
        const SizedBox(height: VoltiSpacing.s20),
        VoltiButton(
          label: t.close,
          fullWidth: true,
          size: VoltiButtonSize.lg,
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ],
    );
  }

  Widget _form(AppLocalizations t) {
    final depotsAsync = ref.watch(depotsProvider);
    final depots = depotsAsync.value?.depots ?? const <Depot>[];
    final depotId = _draft.depotId ?? effectiveDepotId(depots, ref.watch(selectedDepotProvider));
    final draft = _draft.copyWith(depotId: depotId);
    final vehicleOk = _collect || _lookup == _Lookup.found || _lookup == _Lookup.offline;
    final canSubmit = vehicleOk && draft.canSubmit(requirePhoto: !_collect) && !_submitting;
    final missing = [
      if (!vehicleOk) t.missingVehicle,
      if (depotId == null) t.missingDepot,
      if (!draft.allAnswered) t.missingChecklist,
      if (!draft.batteryValid) t.missingBattery,
      if (!_collect && draft.photoPaths.isEmpty) t.missingPhoto,
    ];
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            children: [
              const ConnectivityBanner(padding: EdgeInsets.only(bottom: VoltiSpacing.s10)),
              if (_collect)
                SectionCard(
                  child: Row(
                    children: [
                      const Icon(LucideIcons.truck, color: VoltiColors.ink500),
                      const SizedBox(width: VoltiSpacing.s10),
                      Expanded(
                        child: Text(widget.collectTask!.vehicleCode,
                            style: VoltiTypography.bodyStrong
                                .copyWith(fontFamily: VoltiTypography.fontMono)),
                      ),
                    ],
                  ),
                )
              else
                _vehicleCard(t),
              SectionLabel(t.arrivalDepot),
              if (depotsAsync.isLoading && !depotsAsync.hasValue)
                const LinearProgressIndicator()
              else if (depots.isEmpty)
                Notice(
                  tone: NoticeTone.danger,
                  icon: LucideIcons.cloudOff,
                  title: depotsAsync.hasError ? t.depotsError : t.depotsEmpty,
                )
              else
                DepotPicker(
                  depots: depots,
                  selected: depotId,
                  onSelect: (id) {
                    ref.read(selectedDepotProvider.notifier).select(id);
                    _set(_draft.copyWith(depotId: id));
                  },
                ),
              SectionLabel(t.inspectionTitle),
              for (final code in arrivalChecklistCodes)
                HandoverItemRow(
                  keyPrefix: 'arr',
                  code: code,
                  value: _draft.items[code],
                  note: _draft.notes[code],
                  onChanged: (v) => _set(_draft.copyWith(items: {..._draft.items, code: v})),
                  onNote: (v) => _draft = _draft.copyWith(notes: {..._draft.notes, code: v}),
                ),
              if (_draft.hasProblem)
                Notice(
                  key: const Key('arrival-problem'),
                  tone: NoticeTone.warning,
                  icon: LucideIcons.wrench,
                  title: t.arrivalProblem,
                  body: t.arrivalProblemBody,
                ),
              SectionLabel(t.batteryPctLabel),
              SectionCard(
                child: BatteryPctField(
                  fieldKey: const Key('arrival-battery'),
                  controller: _battery,
                  onChanged: (v) => _set(_draft.copyWith(batteryPct: v)),
                ),
              ),
              if (!_collect) ...[
                SectionLabel(t.arrivalPhotosTitle, hint: t.arrivalPhotosHint),
                SectionCard(
                  padding: 4,
                  child: KeyedSubtree(
                    key: const Key('arrival-photo'),
                    child: ListRow(
                      icon: _draft.photoPaths.isEmpty ? LucideIcons.camera : LucideIcons.imagePlus,
                      iconTone:
                          _draft.photoPaths.isEmpty ? ListRowTone.neutral : ListRowTone.brand,
                      title: _draft.photoPaths.isEmpty ? t.photoSlotEmpty : t.photoAddMore,
                      subtitle: _draft.photoPaths.isEmpty
                          ? null
                          : t.photoCount(_draft.photoPaths.length),
                      trailing: ListRowTrailing.none,
                      onTap: _draft.photoPaths.length >= maxHandoverPhotos ? null : _takePhoto,
                    ),
                  ),
                ),
                if (_draft.photoPaths.isNotEmpty) ...[
                  const SizedBox(height: VoltiSpacing.s10),
                  PhotoThumbnails(
                    paths: _draft.photoPaths,
                    onRemove: (i) =>
                        _set(_draft.copyWith(photoPaths: [..._draft.photoPaths]..removeAt(i))),
                  ),
                ],
              ],
            ],
          ),
        ),
        SubmitBar(
          hint: missing.isEmpty ? null : missingHint(t, missing),
          notice: _error == null
              ? null
              : Notice(
                  key: const Key('arrival-error'),
                  tone: NoticeTone.danger,
                  icon: LucideIcons.circleAlert,
                  title: t.jobFailed(_error!),
                ),
          button: VoltiButton(
            key: const Key('submit-arrival'),
            label: _collect ? t.arrivalCollectSubmit : t.arrivalSubmit,
            icon: LucideIcons.packageCheck,
            fullWidth: true,
            size: VoltiButtonSize.lg,
            loading: _submitting,
            onPressed: canSubmit ? () => _submit(draft) : null,
          ),
        ),
      ],
    );
  }

  Widget _vehicleCard(AppLocalizations t) {
    final (NoticeTone, IconData, String)? status = switch (_lookup) {
      _Lookup.found => (
          NoticeTone.success,
          LucideIcons.circleCheck,
          t.arrivalVehicleFound(_found!.code)
        ),
      _Lookup.noRental => (NoticeTone.danger, LucideIcons.circleAlert, t.arrivalNoRental),
      _Lookup.notFound => (NoticeTone.danger, LucideIcons.searchX, t.arrivalVehicleNotFound),
      _Lookup.offline => (NoticeTone.info, LucideIcons.cloudOff, t.arrivalVehicleOffline),
      null => null,
    };
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            key: const Key('arrival-vehicle'),
            controller: _vehicle,
            maxLength: 64,
            textCapitalization: TextCapitalization.characters,
            style: VoltiTypography.body.copyWith(fontFamily: VoltiTypography.fontMono),
            decoration: InputDecoration(
              labelText: t.arrivalVehicleLabel,
              hintText: t.arrivalVehicleHint,
              counterText: '',
              suffixIcon: IconButton(
                key: const Key('arrival-vehicle-scan'),
                tooltip: t.arrivalScanVehicle,
                constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                icon: const Icon(LucideIcons.scanQrCode),
                onPressed: _scanVehicle,
              ),
            ),
            onChanged: (_) => setState(() {
              _lookup = null;
              _found = null;
            }),
            onSubmitted: (_) => _find(),
          ),
          const SizedBox(height: VoltiSpacing.s10),
          VoltiButton(
            key: const Key('arrival-find'),
            label: t.arrivalVehicleFind,
            icon: LucideIcons.search,
            variant: VoltiButtonVariant.secondary,
            fullWidth: true,
            loading: _looking,
            onPressed: _looking || _vehicle.text.trim().isEmpty ? null : _find,
          ),
          if (status != null) ...[
            const SizedBox(height: VoltiSpacing.s10),
            Notice(
              key: Key(_lookup == _Lookup.offline ? 'arrival-vehicle-offline' : 'arrival-vehicle-status'),
              tone: status.$1,
              icon: status.$2,
              title: status.$3,
            ),
          ],
        ],
      ),
    );
  }
}
