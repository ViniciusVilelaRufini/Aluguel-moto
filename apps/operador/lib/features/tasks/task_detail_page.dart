import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/device.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/local_state.dart';
import 'package:volti_operador/data/location.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/service_unlock.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/data/tasks_provider.dart';
import 'package:volti_operador/features/tasks/completion.dart';
import 'package:volti_operador/features/tasks/task_list_page.dart' show TaskBadges;
import 'package:volti_operador/features/tasks/task_ui.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Detalhe da tarefa (TaskDetail do design): mapa de 230 px com a moto e o
/// operador, folha de raio 28 sobreposta ao mapa, modo servico, troca de
/// bateria, checklist n/5, foto obrigatoria e "Concluir tarefa" fixo, que so
/// habilita com modo servico + checklist + foto (e troca, nas de bateria).
class TaskDetailPage extends ConsumerStatefulWidget {
  const TaskDetailPage({super.key, required this.taskId, this.onOpenInspection, this.onOpenBattery});

  final String taskId;

  /// Navegacao para o checklist/troca (padrao: `go_router`). Injetavel nos testes.
  final VoidCallback? onOpenInspection;
  final VoidCallback? onOpenBattery;

  @override
  ConsumerState<TaskDetailPage> createState() => _TaskDetailPageState();
}

class _TaskDetailPageState extends ConsumerState<TaskDetailPage> {
  bool _busy = false;

  static const double _mapHeight = 230;

  Future<void> _run(Future<void> Function() body) async {
    final t = AppLocalizations.of(context);
    setState(() => _busy = true);
    try {
      await body();
    } on RepositoryException catch (e) {
      if (mounted) {
        VoltiToast.show(context,
            e.kind == FailureKind.network ? t.offlineAction : e.message,
            tone: VoltiToastTone.danger);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _openInspection(FieldTask task) => widget.onOpenInspection != null
      ? widget.onOpenInspection!()
      : context.push('/tasks/${task.id}/inspection');

  void _openBattery(FieldTask task) => widget.onOpenBattery != null
      ? widget.onOpenBattery!()
      : context.push('/tasks/${task.id}/battery');

  Future<void> _serviceUnlock(FieldTask task) => _run(() async {
        final t = AppLocalizations.of(context);
        await ref
            .read(fieldRepositoryProvider)
            .serviceUnlock(task.vehicleId, reason: t.serviceUnlockReason, taskId: task.id);
        await ref.read(serviceUnlockProvider.notifier).markUnlocked(task.id);
        VoltiHaptics.success();
      });

  Future<void> _start(FieldTask task) =>
      _run(() => ref.read(tasksProvider.notifier).start(task.id));

  Future<void> _takePhoto(FieldTask task) async {
    final path = await ref.read(photoPickerProvider).take();
    if (path == null || !mounted) return;
    ref.read(inspectionDraftsProvider.notifier).addPhoto(task.id, path);
  }

  Future<void> _setStatus(FieldTask task) async {
    final t = AppLocalizations.of(context);
    final result = await VoltiBottomSheet.show<(ServiceVehicleStatus, String)>(
      context,
      builder: (_) => const _StatusSheet(),
    );
    if (result == null || !mounted) return;
    await _run(() async {
      await ref
          .read(fieldRepositoryProvider)
          .setVehicleStatus(task.vehicleId, status: result.$1, reason: result.$2);
      ref.read(knownVehicleStatusProvider.notifier).set(task.vehicleId,
          result.$1 == ServiceVehicleStatus.free ? VehicleStatus.free : VehicleStatus.maintenance);
      if (mounted) VoltiToast.show(context, t.statusChanged);
    });
  }

  Future<void> _complete(FieldTask task, {required bool inspectionRegistered}) async {
    final t = AppLocalizations.of(context);
    final draft = await VoltiBottomSheet.show<CompletionDraft>(
      context,
      builder: (_) => const _CompleteSheet(),
    );
    if (draft == null || !mounted) return;
    setState(() => _busy = true);
    void rejected(String? reason) {
      setState(() => _busy = false);
      VoltiToast.show(context, t.jobFailed(reason ?? t.errorGeneric), tone: VoltiToastTone.danger);
    }

    final sync = ref.read(syncControllerProvider.notifier);
    // Checklist completo mas ainda nao enviado: entra na fila antes da conclusao.
    if (!inspectionRegistered) {
      final inspection = ref.read(inspectionDraftsProvider.notifier).of(task.id);
      final outcome = await sync.submitInspection(task.id, inspection);
      if (!mounted) return;
      // Recusado pela API (4xx): nao conclui; o checklist fica em "Pendencias".
      if (outcome.job.status == JobStatus.failed) return rejected(outcome.job.error);
      final result = outcome.result;
      if (result is Inspection && result.maintenanceTaskId != null) {
        VoltiToast.show(context, t.speedNonCompliant, tone: VoltiToastTone.warning);
      }
    }
    final outcome = await sync.completeTask(task.id, draft);
    if (!mounted) return;
    if (outcome.job.status == JobStatus.failed) return rejected(outcome.job.error);
    final status = draft.vehicleStatus;
    if (status != null) {
      ref.read(knownVehicleStatusProvider.notifier).set(
          task.vehicleId, status == 'free' ? VehicleStatus.free : VehicleStatus.maintenance);
    }
    if (outcome.synced) {
      ref.read(tasksProvider.notifier).markDone(task.id);
      await ref.read(serviceUnlockProvider.notifier).clear(task.id);
      ref.read(inspectionDraftsProvider.notifier).clear(task.id);
    }
    // Na fila: a tarefa segue aberta como "Aguardando sincronizacao" e vira
    // concluida quando a fila enviar (TasksController ouve o resultado).
    if (!mounted) return;
    setState(() => _busy = false);
    VoltiToast.show(context, outcome.synced ? t.taskCompleted : t.taskCompletePending);
    await Navigator.of(context).maybePop();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final task = ref.watch(tasksProvider).value?.byId(widget.taskId);
    final sync = ref.watch(syncControllerProvider);
    if (task == null) {
      return Scaffold(
        body: Column(
          children: [
            OperatorTopBar(title: t.taskDetailTitle),
            Expanded(
              child: VoltiEmptyState(icon: LucideIcons.searchX, title: t.taskNotFound),
            ),
          ],
        ),
      );
    }
    bool registered(JobKind kind) =>
        sync.hasPending(task.id, kind) ||
        sync.results.values.any((r) => switch (kind) {
              JobKind.inspection => r is Inspection && r.fieldTaskId == task.id,
              JobKind.batterySwap => r is BatterySwap && r.fieldTaskId == task.id,
              _ => false,
            });
    ref.watch(serviceUnlockProvider);
    final unlocked = ref.read(serviceUnlockProvider.notifier).isUnlocked(task.id);
    final draft = ref.watch(inspectionDraftsProvider)[task.id] ?? const InspectionDraft();
    final knownStatus = ref.watch(knownVehicleStatusProvider)[task.vehicleId];
    final user = watchLocationWhenVisible(ref, context)?.position;
    final isBattery = task.type == FieldTaskType.batterySwap;
    final inspected = registered(JobKind.inspection);
    final swapped = registered(JobKind.batterySwap);
    final done = isDone(task);
    // Conclusao na fila (aguardando sincronizacao) ou algo recusado pela API.
    final completionQueued = sync.hasPending(task.id, JobKind.completeTask);
    final rejectedJobs = sync.failed.where((j) => j.taskId == task.id).toList();
    final started = task.status == FieldTaskStatus.inProgress;
    final blockers = completionBlockers(
      task: task,
      unlocked: unlocked,
      draft: draft,
      inspectionRegistered: inspected,
      swapRegistered: swapped,
    );
    final lat = task.type == FieldTaskType.reposition && task.targetLat != null
        ? task.targetLat!
        : task.vehicleLat;
    final lng = task.type == FieldTaskType.reposition && task.targetLng != null
        ? task.targetLng!
        : task.vehicleLng;
    final pct = task.vehicleBatteryPct;
    final hasPosition = task.vehicleLat != null && task.vehicleLng != null;
    final photoDone = inspected || draft.photoPaths.isNotEmpty;

    final sheet = <Widget>[
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(typeLabel(t, task.type),
                    style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
                Semantics(
                  header: true,
                  child: Text(task.vehicleCode,
                      style: VoltiTypography.title.copyWith(
                          fontFamily: VoltiTypography.fontMono, letterSpacing: 0)),
                ),
                // Endereco depende de contrato: mostra as observacoes da tarefa.
                if (task.notes != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(task.notes!,
                        style:
                            VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
                  ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (pct != null) BatteryPill(pct, rangeKm: batteryRangeKm(pct)),
              // Status da moto so quando conhecido (o FieldTask nao traz vehicleStatus).
              if (knownStatus != null) ...[
                const SizedBox(height: 6),
                Semantics(
                  label: t.vehicleStatusLabel(VoltiColors.statusLabel(knownStatus)),
                  excludeSemantics: true,
                  child: FleetStatusBadge(knownStatus,
                      key: const Key('fleet-status'), pill: false),
                ),
              ],
            ],
          ),
        ],
      ),
      TaskBadges(
        task: task,
        showBattery: false,
        distanceMeters: distanceToTaskMeters(task, user?.lat, user?.lng),
      ),
      const ConnectivityBanner(padding: EdgeInsets.zero),
      if (!done && completionQueued)
        Notice(
          key: const Key('completion-queued'),
          tone: NoticeTone.info,
          icon: LucideIcons.cloudOff,
          title: t.awaitingSync,
          body: t.taskCompletePending,
        ),
      for (final j in rejectedJobs)
        Notice(
          key: Key('rejected-${j.kind.name}'),
          tone: NoticeTone.danger,
          icon: LucideIcons.circleAlert,
          title: t.jobFailed(j.error ?? t.errorGeneric),
          body: t.rejectedHint,
        ),
      if (done)
        Notice(
          key: const Key('task-done'),
          tone: NoticeTone.success,
          icon: LucideIcons.circleCheck,
          title: t.taskDoneTitle,
          body: task.completionNotes == null || task.completionNotes!.trim().isEmpty
              ? null
              : '${t.completionNotesLabel}: ${task.completionNotes}',
        ),
      if (task.type == FieldTaskType.reposition &&
          task.targetLat != null &&
          task.targetLng != null &&
          hasPosition)
        Notice(
          tone: NoticeTone.neutral,
          icon: LucideIcons.mapPinned,
          title: t.targetLabel,
          body: t.distanceToTarget(distanceKm(
                  task.vehicleLat!, task.vehicleLng!, task.targetLat!, task.targetLng!)
              .toStringAsFixed(1)
              .replaceAll('.', ',')),
        ),
      if (lat != null && lng != null)
        VoltiButton(
          key: const Key('route'),
          label: t.actionRoute,
          icon: LucideIcons.navigation,
          variant: VoltiButtonVariant.secondary,
          fullWidth: true,
          onPressed: () => openRoute(lat, lng),
        ),
      if (!done && !started)
        VoltiButton(
          key: const Key('start'),
          label: t.actionStart,
          icon: LucideIcons.play,
          variant: VoltiButtonVariant.secondary,
          fullWidth: true,
          onPressed: _busy ? null : () => _start(task),
        ),
      if (!done)
        if (unlocked)
          Notice(
            key: const Key('service-unlock-active'),
            tone: NoticeTone.success,
            icon: LucideIcons.lockOpen,
            title: t.serviceUnlockActive,
            body: t.serviceUnlockActiveBody,
          )
        else
          VoltiButton(
            key: const Key('service-unlock'),
            label: t.actionServiceUnlock,
            icon: LucideIcons.wrench,
            variant: VoltiButtonVariant.dark,
            fullWidth: true,
            size: VoltiButtonSize.lg,
            onPressed: _busy ? null : () => _serviceUnlock(task),
          ),
      if (isBattery) _batteryCard(t, task, sync, swapped, done),
      _checklistCard(t, task, sync, draft, inspected, done),
      PhotoCapture(
        key: const Key('detail-photo'),
        label: t.photoAfterService,
        hint: t.photoHint,
        height: 110,
        done: photoDone,
        onTap: done || inspected ? null : () => _takePhoto(task),
      ),
      if (!inspected && draft.photoPaths.isNotEmpty)
        PhotoThumbnails(
          paths: draft.photoPaths,
          onRemove: (i) => ref.read(inspectionDraftsProvider.notifier).removePhoto(task.id, i),
        ),
      ListRow(
        key: const Key('set-status'),
        icon: LucideIcons.arrowLeftRight,
        title: t.actionSetStatus,
        trailing: ListRowTrailing.chevron,
        onTap: done ? null : () => _setStatus(task),
      ),
    ];

    return Scaffold(
      body: Column(
        children: [
          Expanded(
            child: Stack(
              children: [
                SizedBox(
                  height: _mapHeight,
                  width: double.infinity,
                  child: hasPosition
                      ? _MiniMap(task: task, user: user)
                      : _NoPosition(label: t.noVehiclePosition),
                ),
                Positioned(
                  top: MediaQuery.paddingOf(context).top + 8,
                  left: VoltiSpacing.screenGutter,
                  child: VoltiIconButton(
                    key: const Key('detail-back'),
                    icon: LucideIcons.arrowLeft,
                    label: t.back,
                    onPressed: () => Navigator.of(context).maybePop(),
                  ),
                ),
                Positioned.fill(
                  top: _mapHeight - 24,
                  child: Container(
                    key: const Key('detail-sheet'),
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(
                      color: Theme.of(context).scaffoldBackgroundColor,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                    ),
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                      itemCount: sheet.length,
                      separatorBuilder: (_, _) => const SizedBox(height: VoltiSpacing.s14),
                      itemBuilder: (_, i) => sheet[i],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12,
                VoltiSpacing.screenGutter, MediaQuery.paddingOf(context).bottom + 12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerLowest,
              boxShadow: VoltiShadows.shadowSheet,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!done && !completionQueued && rejectedJobs.isEmpty && blockers.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: VoltiSpacing.s8),
                    child: Semantics(
                      liveRegion: true,
                      child: Text(
                        completionHint(t, blockers),
                        key: const Key('complete-hint'),
                        textAlign: TextAlign.center,
                        style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary),
                      ),
                    ),
                  ),
                VoltiButton(
                  key: const Key('complete'),
                  label: t.actionComplete,
                  icon: LucideIcons.clipboardCheck,
                  fullWidth: true,
                  size: VoltiButtonSize.lg,
                  loading: _busy && blockers.isEmpty,
                  onPressed: done ||
                          _busy ||
                          completionQueued ||
                          rejectedJobs.isNotEmpty ||
                          blockers.isNotEmpty
                      ? null
                      : () => _complete(task, inspectionRegistered: inspected),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _batteryCard(
      AppLocalizations t, FieldTask task, SyncState sync, bool swapped, bool done) {
    String? installed;
    for (final r in sync.results.values) {
      if (r is BatterySwap && r.fieldTaskId == task.id) installed = r.installedBatterySerial;
    }
    for (final j in sync.pending) {
      if (j.taskId == task.id && j.kind == JobKind.batterySwap) {
        installed = BatterySwapDraft.fromJson(j.payload['swap'] as Map<String, dynamic>)
            .installedSerial;
      }
    }
    final waiting = sync.hasPending(task.id, JobKind.batterySwap);
    return SectionCard(
      key: const Key('battery-card'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(t.actionBatterySwap, style: VoltiTypography.label),
          if (swapped && installed != null) ...[
            const SizedBox(height: VoltiSpacing.s6),
            Text(t.batteryInstalledSummary(installed),
                style: VoltiTypography.body.copyWith(fontFamily: VoltiTypography.fontMono)),
            Text(waiting ? t.awaitingSync : t.sectionRegistered,
                style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
          ],
          // "Retirada: BT-... · % · ciclos" depende de contrato (bateria atual da moto): oculto.
          if (!swapped && !done) ...[
            const SizedBox(height: VoltiSpacing.s10),
            VoltiButton(
              key: const Key('open-battery'),
              label: t.batteryRegister,
              icon: LucideIcons.scanBarcode,
              variant: VoltiButtonVariant.secondary,
              fullWidth: true,
              onPressed: () => _openBattery(task),
            ),
          ],
        ],
      ),
    );
  }

  Widget _checklistCard(AppLocalizations t, FieldTask task, SyncState sync, InspectionDraft d,
      bool inspected, bool done) {
    final items = [
      (t.itemBrakes, d.brakes),
      (t.itemTires, d.tires),
      (t.itemLights, d.lights),
      (t.itemBell, d.bell),
      (t.itemSpeed, d.speedReading == null ? null : d.effectiveSpeedOk),
    ];
    final answered = inspected && d.answered == 0 ? InspectionDraft.totalItems : d.answered;
    final waiting = sync.hasPending(task.id, JobKind.inspection);
    return SectionCard(
      key: const Key('open-checklist'),
      onTap: done || inspected ? null : () => _openInspection(task),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(t.inspectionTitle, style: VoltiTypography.label)),
              Text(
                t.itemsCounter(answered, InspectionDraft.totalItems),
                key: const Key('detail-items-counter'),
                style: const TextStyle(
                  fontFamily: VoltiTypography.fontMono,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  height: 1,
                  color: VoltiColors.textSecondary,
                ),
              ),
            ],
          ),
          if (inspected)
            Padding(
              padding: const EdgeInsets.only(top: VoltiSpacing.s4),
              child: Text(waiting ? t.awaitingSync : t.sectionRegistered,
                  style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
            ),
          const SizedBox(height: VoltiSpacing.s12),
          for (final (label, value) in items)
            Semantics(
              label: value == null
                  ? t.checklistItemPending(label)
                  : (value ? t.checklistItemOk(label) : t.checklistItemProblem(label)),
              excludeSemantics: true,
              child: Padding(
                padding: const EdgeInsets.only(bottom: VoltiSpacing.s10),
                child: Row(
                  children: [
                    ChecklistMark(value: inspected && value == null ? true : value),
                    const SizedBox(width: VoltiSpacing.s10),
                    Expanded(child: Text(label, style: VoltiTypography.body)),
                  ],
                ),
              ),
            ),
          if (!done && !inspected)
            Align(
              alignment: Alignment.centerRight,
              child: Text(t.checklistOpen,
                  style: VoltiTypography.label.copyWith(color: VoltiColors.textLink)),
            ),
        ],
      ),
    );
  }
}

class _NoPosition extends StatelessWidget {
  const _NoPosition({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: VoltiColors.mapLand,
      alignment: Alignment.center,
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(LucideIcons.mapPinOff, color: VoltiColors.ink500, size: 28),
          const SizedBox(height: VoltiSpacing.s6),
          Text(label, style: VoltiTypography.caption.copyWith(color: VoltiColors.ink500)),
        ],
      ),
    );
  }
}

class _MiniMap extends StatelessWidget {
  const _MiniMap({required this.task, this.user});

  final FieldTask task;
  final GeoPoint? user;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final pos = LatLng(task.vehicleLat!, task.vehicleLng!);
    final target = task.targetLat != null && task.targetLng != null
        ? LatLng(task.targetLat!, task.targetLng!)
        : null;
    final me = user == null ? null : LatLng(user!.lat, user!.lng);
    return FlutterMap(
      options: MapOptions(initialCenter: pos, initialZoom: 15),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'br.com.volti.operador',
        ),
        if (target != null)
          PolylineLayer(polylines: [
            Polyline(points: [pos, target], strokeWidth: 4, color: VoltiColors.brand),
          ]),
        MarkerLayer(markers: [
          Marker(
            point: pos,
            width: 56,
            height: 64,
            child: VehicleMarker(
              task.type == FieldTaskType.maintenance
                  ? VehicleStatus.maintenance
                  : VehicleStatus.free,
              task.vehicleBatteryPct ?? 0,
              selected: true,
            ),
          ),
          if (target != null)
            Marker(
              point: target,
              width: 40,
              height: 40,
              child: const Icon(LucideIcons.mapPin, color: VoltiColors.brand, size: 32),
            ),
          if (me != null)
            Marker(
              point: me,
              width: 48,
              height: 48,
              child: Semantics(
                label: t.yourLocation,
                child: Transform.rotate(
                  angle: (user!.heading ?? 0) * 3.141592653589793 / 180,
                  child: const VoltiUserDot(heading: true),
                ),
              ),
            ),
        ]),
        const RichAttributionWidget(
          attributions: [TextSourceAttribution('OpenStreetMap contributors')],
        ),
      ],
    );
  }
}

class _StatusSheet extends StatefulWidget {
  const _StatusSheet();

  @override
  State<_StatusSheet> createState() => _StatusSheetState();
}

class _StatusSheetState extends State<_StatusSheet> {
  ServiceVehicleStatus _status = ServiceVehicleStatus.maintenance;
  final _reason = TextEditingController();

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final valid = _reason.text.trim().length >= 3;
    return VoltiBottomSheet(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(t.statusSheetTitle, style: VoltiTypography.heading),
          const SizedBox(height: VoltiSpacing.s12),
          VoltiSegmentedControl<ServiceVehicleStatus>(
            options: [
              VoltiSegment(value: ServiceVehicleStatus.maintenance, label: t.statusMaintenance),
              VoltiSegment(value: ServiceVehicleStatus.free, label: t.statusAvailable),
            ],
            value: _status,
            onChanged: (s) => setState(() => _status = s),
          ),
          const SizedBox(height: VoltiSpacing.s10),
          FleetStatusBadge(
            _status == ServiceVehicleStatus.free ? VehicleStatus.free : VehicleStatus.maintenance,
            pill: false,
          ),
          const SizedBox(height: VoltiSpacing.s12),
          TextField(
            controller: _reason,
            maxLength: 500,
            decoration: InputDecoration(
              labelText: t.statusReason,
              errorText: _reason.text.isNotEmpty && !valid ? t.statusReasonTooShort : null,
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: VoltiSpacing.s12),
          VoltiButton(
            label: t.statusConfirm,
            fullWidth: true,
            onPressed: valid ? () => Navigator.of(context).pop((_status, _reason.text.trim())) : null,
          ),
        ],
      ),
    );
  }
}

class _CompleteSheet extends StatefulWidget {
  const _CompleteSheet();

  @override
  State<_CompleteSheet> createState() => _CompleteSheetState();
}

class _CompleteSheetState extends State<_CompleteSheet> {
  String? _status;
  final _notes = TextEditingController();

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return VoltiBottomSheet(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(t.completeTitle, style: VoltiTypography.heading),
          const SizedBox(height: VoltiSpacing.s12),
          Text(t.completeVehicleStatus, style: VoltiTypography.label),
          const SizedBox(height: VoltiSpacing.s8),
          VoltiSegmentedControl<String?>(
            key: const Key('complete-status'),
            options: [
              VoltiSegment(value: null, label: t.keepStatus),
              VoltiSegment(value: 'free', label: t.statusAvailable),
              VoltiSegment(value: 'maintenance', label: t.statusMaintenance),
            ],
            value: _status,
            onChanged: (s) => setState(() => _status = s),
          ),
          const SizedBox(height: VoltiSpacing.s12),
          TextField(
            controller: _notes,
            maxLines: 3,
            maxLength: 2000,
            decoration: InputDecoration(labelText: t.completeNotes),
          ),
          const SizedBox(height: VoltiSpacing.s12),
          VoltiButton(
            key: const Key('complete-confirm'),
            label: t.completeConfirm,
            fullWidth: true,
            onPressed: () => Navigator.of(context)
                .pop(CompletionDraft(notes: _notes.text, vehicleStatus: _status)),
          ),
        ],
      ),
    );
  }
}
