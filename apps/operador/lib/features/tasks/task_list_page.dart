import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/data/tasks_provider.dart';
import 'package:volti_operador/features/auth/auth.dart';
import 'package:volti_operador/features/tasks/task_ui.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Lista e mapa das tarefas atribuidas, com prioridade e rota.
class TaskListPage extends ConsumerStatefulWidget {
  const TaskListPage({super.key, this.onOpen});

  /// Navegacao ao tocar numa tarefa (padrao: `go_router`).
  final void Function(FieldTask task)? onOpen;

  @override
  ConsumerState<TaskListPage> createState() => _TaskListPageState();
}

class _TaskListPageState extends ConsumerState<TaskListPage> {
  bool _showDone = false;
  bool _showMap = false;

  void _open(FieldTask t) {
    if (widget.onOpen != null) {
      widget.onOpen!(t);
    } else {
      context.push('/tasks/${t.id}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final tasks = ref.watch(tasksProvider);
    final sync = ref.watch(syncControllerProvider);
    final email = ref.watch(sessionProvider) ?? '';
    final name = email.split('@').first;
    final all = tasks.value?.tasks ?? const <FieldTask>[];
    final doneCount = all.where(isDone).length;
    final shown = all.where((e) => isDone(e) == _showDone).toList();

    return Scaffold(
      body: Column(
        children: [
          OperatorHeader(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t.headerRole,
                              style: VoltiTypography.caption
                                  .copyWith(color: const Color(0x99FFFFFF))),
                          Text(t.greeting(name),
                              style: VoltiTypography.title.copyWith(color: VoltiColors.white)),
                        ],
                      ),
                    ),
                    VoltiIconButton(
                      icon: LucideIcons.refreshCw,
                      variant: VoltiIconButtonVariant.dark,
                      dot: sync.pending.isNotEmpty,
                      label: t.syncTitle,
                      onPressed: () => context.push('/sync'),
                    ),
                    const SizedBox(width: VoltiSpacing.s8),
                    VoltiIconButton(
                      icon: LucideIcons.logOut,
                      variant: VoltiIconButtonVariant.dark,
                      label: t.signOut,
                      onPressed: () => ref.read(sessionProvider.notifier).signOut(),
                    ),
                  ],
                ),
                const SizedBox(height: VoltiSpacing.s16),
                Row(
                  children: [
                    _stat(t.statPending, '${all.length - doneCount}'),
                    const SizedBox(width: VoltiSpacing.s8),
                    _stat(t.statDone, '$doneCount'),
                    const SizedBox(width: VoltiSpacing.s8),
                    _stat(t.statQueue, '${sync.pending.length}'),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s16,
                VoltiSpacing.screenGutter, VoltiSpacing.s8),
            child: Row(
              children: [
                Expanded(
                  child: SegmentedButton<bool>(
                    showSelectedIcon: false,
                    segments: [
                      ButtonSegment(value: false, label: Text(t.tabToday)),
                      ButtonSegment(value: true, label: Text(t.tabDone)),
                    ],
                    selected: {_showDone},
                    onSelectionChanged: (s) => setState(() => _showDone = s.first),
                  ),
                ),
                const SizedBox(width: VoltiSpacing.s8),
                VoltiIconButton(
                  key: const Key('toggle-map'),
                  icon: _showMap ? LucideIcons.list : LucideIcons.map,
                  variant: VoltiIconButtonVariant.soft,
                  label: _showMap ? t.viewList : t.viewMap,
                  onPressed: () => setState(() => _showMap = !_showMap),
                ),
              ],
            ),
          ),
          if (tasks.value?.fromCache == true)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.screenGutter),
              child: Notice(
                  tone: NoticeTone.info, icon: LucideIcons.cloudOff, title: t.offlineCache),
            ),
          Expanded(
            child: tasks.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(t.tasksError),
                    const SizedBox(height: VoltiSpacing.s12),
                    VoltiButton(
                      label: t.retry,
                      variant: VoltiButtonVariant.secondary,
                      onPressed: () => ref.invalidate(tasksProvider),
                    ),
                  ],
                ),
              ),
              data: (_) => _showMap
                  ? TaskMap(tasks: shown, onOpen: _open)
                  : RefreshIndicator(
                      onRefresh: () => ref.read(tasksProvider.notifier).refresh(),
                      child: shown.isEmpty
                          ? ListView(children: [
                              Padding(
                                padding: const EdgeInsets.all(40),
                                child: Text(t.emptyTasks,
                                    textAlign: TextAlign.center, style: VoltiTypography.body),
                              ),
                            ])
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 4,
                                  VoltiSpacing.screenGutter, VoltiSpacing.s40),
                              itemCount: shown.length,
                              separatorBuilder: (_, _) =>
                                  const SizedBox(height: VoltiSpacing.s10),
                              itemBuilder: (_, i) => TaskCard(
                                task: shown[i],
                                waiting: sync.hasPending(shown[i].id),
                                onTap: () => _open(shown[i]),
                              ),
                            ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _stat(String label, String value) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0x14FFFFFF),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value,
                  style: const TextStyle(
                      fontSize: 22, fontWeight: FontWeight.w700, color: VoltiColors.white)),
              const SizedBox(height: 4),
              Text(label,
                  style: VoltiTypography.caption.copyWith(color: const Color(0x99FFFFFF))),
            ],
          ),
        ),
      );
}

class TaskCard extends StatelessWidget {
  const TaskCard({super.key, required this.task, required this.onTap, this.waiting = false});

  final FieldTask task;
  final VoidCallback onTap;
  final bool waiting;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final (icon, tone) = typeIcon(task.type);
    final pct = task.vehicleBatteryPct;
    return SectionCard(
      padding: 4,
      child: Column(
        children: [
          ListRow(
            icon: icon,
            iconTone: tone,
            title: '${typeLabel(t, task.type)} · ${task.vehicleCode}',
            subtitle: task.notes,
            trailing: ListRowTrailing.chevron,
            onTap: onTap,
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(62, 0, 14, 12),
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _chip(priorityLabel(t, task.priority),
                    isUrgent(task.priority) ? VoltiColors.dangerSoft : VoltiColors.surfaceSunken,
                    isUrgent(task.priority) ? VoltiColors.dangerInk : VoltiColors.ink700),
                if (pct != null)
                  _chip('$pct%', pct <= 20 ? VoltiColors.dangerSoft : VoltiColors.successSoft,
                      pct <= 20 ? VoltiColors.dangerInk : VoltiColors.successInk),
                if (waiting)
                  _chip(t.awaitingSync, VoltiColors.infoSoft, VoltiColors.infoInk),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(String text, Color bg, Color fg) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
        child: Text(text, style: VoltiTypography.caption.copyWith(color: fg)),
      );
}

/// Mapa OSM com as motos das tarefas; toque no marcador abre a tarefa.
class TaskMap extends StatelessWidget {
  const TaskMap({super.key, required this.tasks, required this.onOpen});

  final List<FieldTask> tasks;
  final void Function(FieldTask) onOpen;

  @override
  Widget build(BuildContext context) {
    final located = tasks.where((e) => e.vehicleLat != null && e.vehicleLng != null).toList();
    final center = located.isEmpty
        ? const LatLng(-23.5505, -46.6333)
        : LatLng(located.first.vehicleLat!, located.first.vehicleLng!);
    return FlutterMap(
      options: MapOptions(initialCenter: center, initialZoom: 14),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'br.com.volti.operador',
        ),
        MarkerLayer(markers: [
          for (final e in located)
            Marker(
              point: LatLng(e.vehicleLat!, e.vehicleLng!),
              width: 56,
              height: 64,
              child: VehicleMarker(
                e.type == FieldTaskType.maintenance
                    ? VehicleStatus.maintenance
                    : VehicleStatus.free,
                e.vehicleBatteryPct ?? 0,
                onTap: () => onOpen(e),
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
