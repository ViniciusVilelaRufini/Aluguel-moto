import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/location.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/data/tasks_provider.dart';
import 'package:volti_operador/features/auth/auth.dart';
import 'package:volti_operador/features/tasks/task_ui.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Lista e mapa das tarefas atribuidas, com prioridade, distancia e rota.
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

  Future<void> _account() async {
    await VoltiBottomSheet.show<void>(context, builder: (_) => const _AccountSheet());
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final tasks = ref.watch(tasksProvider);
    final sync = ref.watch(syncControllerProvider);
    final name = ref.watch(operatorNameProvider);
    final user = ref.watch(locationProvider).position;
    final all = tasks.value?.tasks ?? const <FieldTask>[];
    // Concluidas = do dia (a API devolve todo o historico; filtro por data e proposta).
    final now = DateTime.now();
    final doneToday = all.where((e) => isDoneOn(e, now)).toList();
    final doneCount = doneToday.length;
    final pending = all.where((e) => !isDone(e)).toList();
    final shown = _showDone ? doneToday : pending;

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
                          // Turno do operador: depende de contrato (proposta em docs/decisoes.md).
                          Text(t.headerRole,
                              style: VoltiTypography.caption
                                  .copyWith(color: const Color(0x99FFFFFF))),
                          Semantics(
                            header: true,
                            child: Text(t.greeting(name),
                                style: VoltiTypography.title.copyWith(
                                    color: VoltiColors.white, letterSpacing: -0.4)),
                          ),
                        ],
                      ),
                    ),
                    // Sino de notificacoes: sem push/notificacoes no contrato, oculto.
                    VoltiIconButton(
                      key: const Key('account-menu'),
                      icon: LucideIcons.circleUser,
                      variant: VoltiIconButtonVariant.dark,
                      dot: sync.pending.isNotEmpty || sync.failed.isNotEmpty,
                      label: t.accountMenu,
                      onPressed: _account,
                    ),
                  ],
                ),
                const SizedBox(height: VoltiSpacing.s16),
                Row(
                  children: [
                    _stat(t.statPending, '${pending.length}'),
                    const SizedBox(width: VoltiSpacing.s8),
                    _stat(t.statDone, '$doneCount'),
                    const SizedBox(width: VoltiSpacing.s8),
                    // "Baterias na van" depende de contrato; mostra a fila offline.
                    _stat(t.statQueue, '${sync.pending.length}'),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.screenGutter),
            child: Column(
              children: [
                const ConnectivityBanner(),
                if (tasks.value?.fromCache == true)
                  Padding(
                    padding: const EdgeInsets.only(top: VoltiSpacing.s10),
                    child: Notice(
                        tone: NoticeTone.info, icon: LucideIcons.cloudOff, title: t.offlineCache),
                  ),
                const LocationRationale(),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s16,
                VoltiSpacing.screenGutter, VoltiSpacing.s8),
            child: Row(
              children: [
                Expanded(
                  child: VoltiSegmentedControl<bool>(
                    key: const Key('tabs'),
                    options: [
                      VoltiSegment(value: false, label: t.tabToday),
                      VoltiSegment(value: true, label: t.tabDone),
                    ],
                    value: _showDone,
                    onChanged: (v) => setState(() => _showDone = v),
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
          Expanded(
            child: tasks.when(
              skipLoadingOnRefresh: true,
              loading: () => const _ListSkeleton(),
              error: (e, _) => VoltiEmptyState(
                icon: LucideIcons.cloudOff,
                title: t.tasksError,
                actionLabel: t.retry,
                actionIcon: LucideIcons.refreshCw,
                onAction: () => ref.invalidate(tasksProvider),
              ),
              data: (_) => _showMap
                  ? TaskMap(tasks: shown, user: user, onOpen: _open)
                  : RefreshIndicator(
                      onRefresh: () => ref.read(tasksProvider.notifier).refresh(),
                      child: shown.isEmpty
                          ? ListView(children: [
                              Padding(
                                padding: const EdgeInsets.only(top: VoltiSpacing.s24),
                                child: VoltiEmptyState(
                                  icon: _showDone ? LucideIcons.clipboardCheck : LucideIcons.coffee,
                                  title: t.emptyTasks,
                                  compact: true,
                                ),
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
                                distanceMeters:
                                    distanceToTaskMeters(shown[i], user?.lat, user?.lng),
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
        child: Semantics(
          container: true,
          label: '$label: $value',
          excludeSemantics: true,
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
                        fontFamily: VoltiTypography.fontSans,
                        fontSize: 22,
                        height: 1,
                        fontWeight: FontWeight.w700,
                        color: VoltiColors.white)),
                const SizedBox(height: 4),
                Text(label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: VoltiTypography.caption.copyWith(color: const Color(0x99FFFFFF))),
              ],
            ),
          ),
        ),
      );
}

/// Menu da conta: pendencias de envio e sair (no lugar dos botoes soltos no header).
class _AccountSheet extends ConsumerWidget {
  const _AccountSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final sync = ref.watch(syncControllerProvider);
    final id = ref.watch(sessionProvider) ?? '';
    final pending = sync.pending.length + sync.failed.length;
    return VoltiBottomSheet(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(t.accountTitle, style: VoltiTypography.heading),
          if (id.isNotEmpty) Text(id, style: VoltiTypography.caption),
          const SizedBox(height: VoltiSpacing.s12),
          ListRow(
            key: const Key('menu-sync'),
            icon: LucideIcons.refreshCw,
            iconTone: ListRowTone.info,
            title: t.syncTitle,
            value: '$pending',
            trailing: ListRowTrailing.chevron,
            onTap: () {
              Navigator.of(context).pop();
              context.push('/sync');
            },
          ),
          ListRow(
            key: const Key('menu-sign-out'),
            icon: LucideIcons.logOut,
            iconTone: ListRowTone.danger,
            title: t.signOut,
            trailing: ListRowTrailing.none,
            onTap: () {
              Navigator.of(context).pop();
              ref.read(sessionProvider.notifier).signOut();
            },
          ),
        ],
      ),
    );
  }
}

class _ListSkeleton extends StatelessWidget {
  const _ListSkeleton();

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return VoltiSkeleton(
      label: t.loadingTasks,
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
            VoltiSpacing.screenGutter, 4, VoltiSpacing.screenGutter, VoltiSpacing.s40),
        itemCount: 4,
        separatorBuilder: (_, _) => const SizedBox(height: VoltiSpacing.s10),
        itemBuilder: (_, _) => const SectionCard(
          child: Row(
            children: [
              VoltiSkeletonBox(width: 40, height: 40, radius: 12),
              SizedBox(width: VoltiSpacing.s12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    VoltiSkeletonBox(width: 180),
                    SizedBox(height: 8),
                    VoltiSkeletonBox(width: 120, height: 12),
                    SizedBox(height: 10),
                    VoltiSkeletonBox(width: 140, height: 20),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Badges da tarefa: prioridade, distancia, bateria, prazo e sincronizacao.
class TaskBadges extends StatelessWidget {
  const TaskBadges({
    super.key,
    required this.task,
    this.distanceMeters,
    this.waiting = false,
    this.showBattery = true,
  });

  final FieldTask task;
  final double? distanceMeters;
  final bool waiting;

  /// `false` no detalhe, que ja mostra a BatteryPill.
  final bool showBattery;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final pct = task.vehicleBatteryPct;
    final priority = priorityLabel(t, task.priority);
    final due = dueLabel(t, task, DateTime.now());
    final done = doneLabel(t, task);
    final dist = distanceMeters == null ? null : formatDistance(distanceMeters!);
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        VoltiBadge(
          priority,
          key: const Key('badge-priority'),
          tone: priorityTone(task.priority),
          size: VoltiBadgeSize.sm,
          semanticLabel: t.prioritySemantics(priority),
        ),
        if (dist != null)
          VoltiBadge(
            dist,
            key: const Key('badge-distance'),
            tone: VoltiBadgeTone.neutral,
            size: VoltiBadgeSize.sm,
            semanticLabel: t.distanceSemantics(dist),
          ),
        if (pct != null && showBattery)
          VoltiBadge('$pct%', tone: batteryTone(pct), size: VoltiBadgeSize.sm),
        if (due != null)
          VoltiBadge(due.$1,
              icon: LucideIcons.clock,
              tone: due.$2 ? VoltiBadgeTone.danger : VoltiBadgeTone.neutral,
              size: VoltiBadgeSize.sm),
        if (done != null)
          VoltiBadge(done, icon: LucideIcons.check, tone: VoltiBadgeTone.success, size: VoltiBadgeSize.sm),
        if (waiting) VoltiBadge(t.awaitingSync, tone: VoltiBadgeTone.info, size: VoltiBadgeSize.sm),
      ],
    );
  }
}

class TaskCard extends StatelessWidget {
  const TaskCard({
    super.key,
    required this.task,
    required this.onTap,
    this.waiting = false,
    this.distanceMeters,
  });

  final FieldTask task;
  final VoidCallback onTap;
  final bool waiting;

  /// Distancia do operador ate a moto (GPS), ou `null`.
  final double? distanceMeters;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final (icon, tone) = typeIcon(task.type);
    return SectionCard(
      padding: 4,
      child: Column(
        children: [
          ListRow(
            icon: icon,
            iconTone: tone,
            title: '${typeLabel(t, task.type)} · ${task.vehicleCode}',
            // Endereco da moto depende de contrato: usa as observacoes da tarefa.
            subtitle: task.notes,
            trailing: ListRowTrailing.chevron,
            onTap: onTap,
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(62, 0, 14, 12),
            child: Align(
              alignment: Alignment.centerLeft,
              child: TaskBadges(task: task, distanceMeters: distanceMeters, waiting: waiting),
            ),
          ),
        ],
      ),
    );
  }
}

/// Mapa OSM com as motos das tarefas e o ponto do operador. Abre enquadrando
/// todas as tarefas; tocar num marcador mostra a previa da tarefa.
class TaskMap extends StatefulWidget {
  const TaskMap({super.key, required this.tasks, required this.onOpen, this.user});

  final List<FieldTask> tasks;
  final void Function(FieldTask) onOpen;
  final GeoPoint? user;

  @override
  State<TaskMap> createState() => _TaskMapState();
}

class _TaskMapState extends State<TaskMap> {
  String? _selected;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final located =
        widget.tasks.where((e) => e.vehicleLat != null && e.vehicleLng != null).toList();
    final points = [
      for (final e in located) LatLng(e.vehicleLat!, e.vehicleLng!),
      if (widget.user != null) LatLng(widget.user!.lat, widget.user!.lng),
    ];
    final center = points.isEmpty ? const LatLng(-23.5505, -46.6333) : points.first;
    final fit = points.length >= 2
        ? CameraFit.bounds(
            bounds: LatLngBounds.fromPoints(points),
            padding: const EdgeInsets.fromLTRB(48, 64, 48, 180),
            maxZoom: 16,
          )
        : null;
    FieldTask? selected;
    for (final e in located) {
      if (e.id == _selected) selected = e;
    }
    return Stack(
      children: [
        FlutterMap(
          options: MapOptions(
            initialCenter: center,
            initialZoom: 14,
            initialCameraFit: fit,
            onTap: (_, _) => setState(() => _selected = null),
          ),
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
                  child: Semantics(
                    button: true,
                    label: '${typeLabel(t, e.type)} · ${e.vehicleCode}',
                    child: VehicleMarker(
                      e.type == FieldTaskType.maintenance
                          ? VehicleStatus.maintenance
                          : VehicleStatus.free,
                      e.vehicleBatteryPct ?? 0,
                      selected: e.id == _selected,
                      onTap: () => setState(() => _selected = e.id),
                    ),
                  ),
                ),
              if (widget.user != null)
                Marker(
                  point: LatLng(widget.user!.lat, widget.user!.lng),
                  width: 44,
                  height: 44,
                  child: Semantics(label: t.yourLocation, child: const VoltiUserDot()),
                ),
            ]),
            const RichAttributionWidget(
              attributions: [TextSourceAttribution('OpenStreetMap contributors')],
            ),
          ],
        ),
        if (selected != null)
          Positioned(
            left: VoltiSpacing.screenGutter,
            right: VoltiSpacing.screenGutter,
            bottom: VoltiSpacing.s24,
            child: TaskCard(
              key: const Key('map-preview'),
              task: selected,
              distanceMeters: distanceToTaskMeters(selected, widget.user?.lat, widget.user?.lng),
              onTap: () => widget.onOpen(selected!),
            ),
          ),
      ],
    );
  }
}
