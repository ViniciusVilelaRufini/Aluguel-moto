import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' show Inspection;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/device.dart';
import 'package:volti_operador/data/local_state.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Checklist de inspecao: freio, pneus, luzes, campainha e limitador (leitura 0..100),
/// com fotos e observacoes. Acima de 32 km/h o item e forcado a "nao ok" (decisao #13).
class InspectionPage extends ConsumerStatefulWidget {
  const InspectionPage({super.key, required this.taskId, this.onDone});

  final String taskId;

  /// Chamado quando o operador fecha a tela de resultado.
  final VoidCallback? onDone;

  @override
  ConsumerState<InspectionPage> createState() => _InspectionPageState();
}

class _InspectionPageState extends ConsumerState<InspectionPage> {
  late final TextEditingController _reading;
  late final TextEditingController _notes;
  bool _submitting = false;
  SubmitOutcome? _outcome;
  String? _error;

  /// Rascunho compartilhado com o detalhe da tarefa (contador n/5 e foto).
  InspectionDraft get _draft => ref.read(inspectionDraftsProvider.notifier).of(widget.taskId);

  @override
  void initState() {
    super.initState();
    final d = _draft;
    _reading = TextEditingController(text: d.speedReading?.toString() ?? '');
    _notes = TextEditingController(text: d.notes);
  }

  @override
  void dispose() {
    _reading.dispose();
    _notes.dispose();
    super.dispose();
  }

  void _set(InspectionDraft d) => ref.read(inspectionDraftsProvider.notifier).put(widget.taskId, d);

  Future<void> _addPhoto() async {
    final path = await ref.read(photoPickerProvider).take();
    if (path == null || !mounted) return;
    ref.read(inspectionDraftsProvider.notifier).addPhoto(widget.taskId, path);
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    final draft = _draft.copyWith(notes: _notes.text);
    _set(draft);
    final outcome =
        await ref.read(syncControllerProvider.notifier).submitInspection(widget.taskId, draft);
    if (!mounted) return;
    setState(() {
      _submitting = false;
      _outcome = outcome;
      if (outcome.job.status == JobStatus.failed) _error = outcome.job.error;
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final d = ref.watch(inspectionDraftsProvider)[widget.taskId] ?? const InspectionDraft();
    final showResult = _outcome != null && _error == null;
    return Scaffold(
      body: Column(
        children: [
          OperatorTopBar(
            title: t.inspectionTitle,
            trailing: showResult
                ? null
                : Text(
                    t.itemsCounter(d.answered, InspectionDraft.totalItems),
                    key: const Key('items-counter'),
                    style: const TextStyle(
                      fontFamily: VoltiTypography.fontMono,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: VoltiColors.textSecondary,
                    ),
                  ),
          ),
          Expanded(child: showResult ? _result(t) : _form(t, d)),
        ],
      ),
    );
  }

  Widget _result(AppLocalizations t) {
    final o = _outcome!;
    final inspection = o.result is Inspection ? o.result! as Inspection : null;
    final opened = inspection?.maintenanceTaskId != null;
    return ListView(
      padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
      children: [
        if (o.synced)
          Notice(
              key: const Key('inspection-sent'),
              tone: NoticeTone.success,
              icon: LucideIcons.circleCheck,
              title: t.inspectionSent)
        else
          Notice(
              key: const Key('inspection-queued'),
              tone: NoticeTone.info,
              icon: LucideIcons.cloudOff,
              title: t.awaitingSync,
              body: t.inspectionQueued),
        if (opened) ...[
          const SizedBox(height: VoltiSpacing.s12),
          Notice(
            key: const Key('maintenance-opened'),
            tone: NoticeTone.warning,
            icon: LucideIcons.wrench,
            title: t.speedNonCompliant,
            body: t.maintenanceOpened(
                inspection!.maintenanceTaskId!, inspection.alertId ?? '-'),
          ),
        ],
        const SizedBox(height: VoltiSpacing.s20),
        VoltiButton(
          label: t.close,
          fullWidth: true,
          size: VoltiButtonSize.lg,
          onPressed: widget.onDone,
        ),
      ],
    );
  }

  Widget _form(AppLocalizations t, InspectionDraft d) {
    final readingText = _reading.text;
    final readingInvalid = readingText.isNotEmpty && !d.readingValid;
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            children: [
              const ConnectivityBanner(padding: EdgeInsets.only(bottom: VoltiSpacing.s10)),
              _item('brakes', t.itemBrakes, d.brakes, (v) => _set(d.copyWith(brakes: v))),
              _item('tires', t.itemTires, d.tires, (v) => _set(d.copyWith(tires: v))),
              _item('lights', t.itemLights, d.lights, (v) => _set(d.copyWith(lights: v))),
              _item('bell', t.itemBell, d.bell, (v) => _set(d.copyWith(bell: v))),
              _speedItem(t, d, readingInvalid),
              const SizedBox(height: VoltiSpacing.s12),
              PhotoCapture(
                key: const Key('photo-capture'),
                label: d.photoPaths.isEmpty ? t.photoAfterService : t.photoAddMore,
                hint: d.photoPaths.isEmpty ? t.photoHint : t.photoCount(d.photoPaths.length),
                icon: d.photoPaths.isEmpty ? LucideIcons.camera : LucideIcons.imagePlus,
                // Com foto, continua aceitando outras (o "done" do VDS esconderia o rotulo).
                done: false,
                height: 110,
                onTap: _addPhoto,
              ),
              if (d.photoPaths.isNotEmpty) ...[
                const SizedBox(height: VoltiSpacing.s10),
                PhotoThumbnails(
                  key: const Key('photo-thumbnails'),
                  paths: d.photoPaths,
                  onRemove: (i) =>
                      ref.read(inspectionDraftsProvider.notifier).removePhoto(widget.taskId, i),
                ),
              ],
              const SizedBox(height: VoltiSpacing.s12),
              TextField(
                key: const Key('notes'),
                controller: _notes,
                maxLines: 3,
                maxLength: 2000,
                decoration: InputDecoration(labelText: t.notesLabel),
                onChanged: (v) => _set(_draft.copyWith(notes: v)),
              ),
              if (_error != null) ...[
                const SizedBox(height: VoltiSpacing.s8),
                Notice(
                    tone: NoticeTone.danger,
                    icon: LucideIcons.circleAlert,
                    title: t.jobFailed(_error!)),
              ],
            ],
          ),
        ),
        Container(
          padding: EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12,
              VoltiSpacing.screenGutter, MediaQuery.paddingOf(context).bottom + VoltiSpacing.s16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerLowest,
            boxShadow: VoltiShadows.shadowSheet,
          ),
          child: VoltiButton(
            key: const Key('submit-inspection'),
            label: t.submitInspection,
            icon: LucideIcons.clipboardCheck,
            fullWidth: true,
            size: VoltiButtonSize.lg,
            onPressed: d.canSubmit && !_submitting ? _submit : null,
          ),
        ),
      ],
    );
  }

  Widget _item(String id, String title, bool? value, ValueChanged<bool> onChanged,
      {bool lockedProblem = false}) {
    final t = AppLocalizations.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: VoltiSpacing.s8),
      child: SectionCard(
        child: Row(
          children: [
            ChecklistMark(value: value),
            const SizedBox(width: VoltiSpacing.s10),
            Expanded(child: Text(title, style: VoltiTypography.body)),
            AnswerChip(
              key: Key('$id-ok'),
              label: t.answerOk,
              item: title,
              selected: value == true,
              onSelected: lockedProblem ? null : () => onChanged(true),
            ),
            const SizedBox(width: VoltiSpacing.s6),
            AnswerChip(
              key: Key('$id-problem'),
              label: t.answerProblem,
              item: title,
              problem: true,
              selected: value == false,
              onSelected: () => onChanged(false),
            ),
          ],
        ),
      ),
    );
  }

  Widget _speedItem(AppLocalizations t, InspectionDraft d, bool readingInvalid) {
    return Padding(
      padding: const EdgeInsets.only(bottom: VoltiSpacing.s8),
      child: SectionCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                ChecklistMark(value: d.speedReading == null ? null : d.effectiveSpeedOk),
                const SizedBox(width: VoltiSpacing.s10),
                Expanded(child: Text(t.itemSpeed, style: VoltiTypography.body)),
                AnswerChip(
                  key: const Key('speedLimiter-ok'),
                  label: t.answerOk,
                  item: t.itemSpeed,
                  selected: d.effectiveSpeedOk == true,
                  onSelected: d.speedNonCompliant ? null : () => _set(d.copyWith(speedOk: true)),
                ),
                const SizedBox(width: VoltiSpacing.s6),
                AnswerChip(
                  key: const Key('speedLimiter-problem'),
                  label: t.answerProblem,
                  item: t.itemSpeed,
                  problem: true,
                  selected: d.effectiveSpeedOk == false,
                  onSelected: () => _set(d.copyWith(speedOk: false)),
                ),
              ],
            ),
            const SizedBox(height: VoltiSpacing.s8),
            TextField(
              key: const Key('speed-reading'),
              controller: _reading,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(3),
              ],
              decoration: InputDecoration(
                labelText: t.speedReadingLabel,
                helperText: t.speedReadingHelp,
                helperMaxLines: 2,
                errorText: readingInvalid ? t.speedReadingInvalid : null,
              ),
              onChanged: (v) {
                final n = int.tryParse(v);
                var next = _draft.copyWith(speedReading: n);
                if (n != null && n > legalMaxKmh) next = next.copyWith(speedOk: false);
                _set(next);
              },
            ),
            if (d.speedNonCompliant) ...[
              const SizedBox(height: VoltiSpacing.s8),
              Notice(
                key: const Key('speed-noncompliant'),
                tone: NoticeTone.danger,
                icon: LucideIcons.triangleAlert,
                title: t.speedNonCompliant,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Resposta do item do checklist ("Ok" / "Com problema"), pilula do VDS com
/// alvo de 44 px. `onSelected` nulo = bloqueada (ex.: "Ok" com leitura > 32).
class AnswerChip extends StatelessWidget {
  const AnswerChip({
    super.key,
    required this.label,
    required this.item,
    required this.selected,
    required this.onSelected,
    this.problem = false,
  });

  final String label;

  /// Nome do item, para o leitor de tela ("Pneus: Ok").
  final String item;
  final bool selected;
  final VoidCallback? onSelected;
  final bool problem;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (bg, fg, border) = selected
        ? (problem
            ? (VoltiColors.danger, VoltiColors.white, VoltiColors.danger)
            : (VoltiColors.brand, VoltiColors.white, VoltiColors.brand))
        : (scheme.surfaceContainerLowest, scheme.onSurface, scheme.outline);
    final disabled = onSelected == null;
    return Semantics(
      button: true,
      selected: selected,
      enabled: !disabled,
      label: '$item: $label',
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onSelected,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
          child: Center(
            widthFactor: 1,
            child: Opacity(
              opacity: disabled && !selected ? .4 : 1,
              child: AnimatedContainer(
                duration: VoltiMotion.scaled(context, VoltiMotion.durFast),
                height: 32,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: bg,
                  borderRadius: VoltiRadii.rPill,
                  border: Border.all(color: border, width: 1.5),
                ),
                child: Text(
                  label,
                  style: TextStyle(
                    fontFamily: VoltiTypography.fontSans,
                    fontWeight: VoltiTypography.fwSemibold,
                    fontSize: 13,
                    height: 1,
                    color: fg,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
