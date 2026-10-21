import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/data/tasks_provider.dart';
import 'package:volti_operador/features/tasks/task_ui.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Detalhe da tarefa: mapa, modo servico, checklist, troca de bateria, status e conclusao.
class TaskDetailPage extends ConsumerStatefulWidget {
  const TaskDetailPage({super.key, required this.taskId});

  final String taskId;

  @override
  ConsumerState<TaskDetailPage> createState() => _TaskDetailPageState();
}

class _TaskDetailPageState extends ConsumerState<TaskDetailPage> {
  bool _unlocked = false;
  bool _busy = false;

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

  Future<void> _serviceUnlock(FieldTask task) => _run(() async {
        final t = AppLocalizations.of(context);
        await ref
            .read(fieldRepositoryProvider)
            .serviceUnlock(task.vehicleId, reason: t.serviceUnlockReason, taskId: task.id);
        if (mounted) setState(() => _unlocked = true);
      });

  Future<void> _start(FieldTask task) =>
      _run(() => ref.read(tasksProvider.notifier).start(task.id));

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
      if (mounted) VoltiToast.show(context, t.statusChanged);
    });
  }

  Future<void> _complete(FieldTask task, {required bool registered}) async {
    final t = AppLocalizations.of(context);
    if (!registered) {
      final what = task.type == FieldTaskType.batterySwap ? t.actionBatterySwap : t.actionChecklist;
      VoltiToast.show(context, t.completeRequires(what), tone: VoltiToastTone.warning);
      return;
    }
    final draft = await VoltiBottomSheet.show<CompletionDraft>(
      context,
      builder: (_) => const _CompleteSheet(),
    );
    if (draft == null || !mounted) return;
    final outcome =
        await ref.read(syncControllerProvider.notifier).completeTask(task.id, draft);
    if (!mounted) return;
    ref.read(tasksProvider.notifier).markDone(task.id);
    VoltiToast.show(context, outcome.synced ? t.taskCompleted : t.taskCompletePending);
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final task = ref.watch(tasksProvider).value?.byId(widget.taskId);
    final sync = ref.watch(syncControllerProvider);
    if (task == null) {
      return Scaffold(
          appBar: AppBar(title: Text(t.taskDetailTitle)),
          body: Center(child: Text(t.taskNotFound)));
    }
    bool registered(JobKind kind) =>
        sync.hasPending(task.id, kind) ||
        sync.results.values.any((r) => switch (kind) {
              JobKind.inspection => r is Inspection && r.fieldTaskId == task.id,
              JobKind.batterySwap => r is BatterySwap && r.fieldTaskId == task.id,
              _ => false,
            });
    final isBattery = task.type == FieldTaskType.batterySwap;
    final needsInspection = task.type == FieldTaskType.inspection;
    final inspected = registered(JobKind.inspection);
    final swapped = registered(JobKind.batterySwap);
    final canComplete = isBattery ? swapped : (needsInspection ? inspected : true);
    final done = isDone(task);
    final started = task.status == FieldTaskStatus.inProgress;
    final lat = task.type == FieldTaskType.reposition && task.targetLat != null
        ? task.targetLat!
        : task.vehicleLat;
    final lng = task.type == FieldTaskType.reposition && task.targetLng != null
        ? task.targetLng!
        : task.vehicleLng;
    final pct = task.vehicleBatteryPct;

    return Scaffold(
      body: Column(
        children: [
          SizedBox(
            height: 220,
            child: Stack(
              children: [
                if (task.vehicleLat != null && task.vehicleLng != null)
                  _MiniMap(task: task)
                else
                  Container(color: VoltiColors.mapLand),
                Positioned(
                  top: MediaQuery.paddingOf(context).top + 8,
                  left: 12,
                  child: VoltiIconButton(
                    icon: LucideIcons.arrowLeft,
                    label: t.back,
                    onPressed: () => context.pop(),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(typeLabel(t, task.type), style: VoltiTypography.caption),
                          Text(task.vehicleCode,
                              style: VoltiTypography.title
                                  .copyWith(fontFamily: VoltiTypography.fontMono)),
                          Text(priorityLabel(t, task.priority), style: VoltiTypography.caption),
                          if (task.notes != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(task.notes!, style: VoltiTypography.body),
                            ),
                        ],
                      ),
                    ),
                    if (pct != null) BatteryPill(pct),
                  ],
                ),
                const SizedBox(height: VoltiSpacing.s12),
                if (task.type == FieldTaskType.reposition &&
                    task.targetLat != null &&
                    task.vehicleLat != null &&
                    task.vehicleLng != null &&
                    task.targetLng != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: VoltiSpacing.s12),
                    child: Notice(
                      tone: NoticeTone.neutral,
                      icon: LucideIcons.mapPinned,
                      title: t.targetLabel,
                      body: t.distanceToTarget(distanceKm(task.vehicleLat!, task.vehicleLng!,
                              task.targetLat!, task.targetLng!)
                          .toStringAsFixed(1)
                          .replaceAll('.', ',')),
                    ),
                  ),
                if (lat != null && lng != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: VoltiSpacing.s12),
                    child: VoltiButton(
                      key: const Key('route'),
                      label: t.actionRoute,
                      icon: LucideIcons.navigation,
                      variant: VoltiButtonVariant.secondary,
                      fullWidth: true,
                      onPressed: () => openRoute(lat, lng),
                    ),
                  ),
                if (!done && !started)
                  Padding(
                    padding: const EdgeInsets.only(bottom: VoltiSpacing.s12),
                    child: VoltiButton(
                      key: const Key('start'),
                      label: t.actionStart,
                      fullWidth: true,
                      size: VoltiButtonSize.lg,
                      onPressed: _busy ? null : () => _start(task),
                    ),
                  ),
                if (_unlocked)
                  Notice(
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
                    onPressed: _busy || done ? null : () => _serviceUnlock(task),
                  ),
                const SizedBox(height: VoltiSpacing.s12),
                ListRow(
                  key: const Key('open-checklist'),
                  icon: LucideIcons.clipboardList,
                  title: t.actionChecklist,
                  subtitle: sync.hasPending(task.id, JobKind.inspection)
                      ? t.awaitingSync
                      : (inspected ? t.sectionRegistered : null),
                  onTap: done ? null : () => context.push('/tasks/${task.id}/inspection'),
                ),
                if (isBattery)
                  ListRow(
                    key: const Key('open-battery'),
                    icon: LucideIcons.batteryCharging,
                    iconTone: ListRowTone.info,
                    title: t.actionBatterySwap,
                    subtitle: sync.hasPending(task.id, JobKind.batterySwap)
                        ? t.awaitingSync
                        : (swapped ? t.sectionRegistered : null),
                    onTap: done ? null : () => context.push('/tasks/${task.id}/battery'),
                  ),
                ListRow(
                  key: const Key('set-status'),
                  icon: LucideIcons.arrowLeftRight,
                  title: t.actionSetStatus,
                  onTap: done ? null : () => _setStatus(task),
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
            child: VoltiButton(
              key: const Key('complete'),
              label: t.actionComplete,
              icon: LucideIcons.clipboardCheck,
              fullWidth: true,
              size: VoltiButtonSize.lg,
              onPressed: done ? null : () => _complete(task, registered: canComplete),
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniMap extends StatelessWidget {
  const _MiniMap({required this.task});

  final FieldTask task;

  @override
  Widget build(BuildContext context) {
    final pos = LatLng(task.vehicleLat!, task.vehicleLng!);
    final target = task.targetLat != null && task.targetLng != null
        ? LatLng(task.targetLat!, task.targetLng!)
        : null;
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
          SegmentedButton<ServiceVehicleStatus>(
            showSelectedIcon: false,
            segments: [
              ButtonSegment(value: ServiceVehicleStatus.maintenance, label: Text(t.statusMaintenance)),
              ButtonSegment(value: ServiceVehicleStatus.free, label: Text(t.statusAvailable)),
            ],
            selected: {_status},
            onSelectionChanged: (s) => setState(() => _status = s.first),
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
          SegmentedButton<String?>(
            showSelectedIcon: false,
            segments: [
              ButtonSegment(value: null, label: Text(t.keepStatus)),
              ButtonSegment(value: 'free', label: Text(t.statusAvailable)),
              ButtonSegment(value: 'maintenance', label: Text(t.statusMaintenance)),
            ],
            selected: {_status},
            onSelectionChanged: (s) => setState(() => _status = s.first),
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
