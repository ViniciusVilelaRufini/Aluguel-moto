import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' show Inspection;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/device.dart';
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
  InspectionDraft _draft = const InspectionDraft();
  final _reading = TextEditingController();
  final _notes = TextEditingController();
  bool _submitting = false;
  SubmitOutcome? _outcome;
  String? _error;

  @override
  void dispose() {
    _reading.dispose();
    _notes.dispose();
    super.dispose();
  }

  void _set(InspectionDraft d) => setState(() => _draft = d);

  Future<void> _addPhoto() async {
    final path = await ref.read(photoPickerProvider).take();
    if (path == null) return;
    _set(_draft.copyWith(photoPaths: [..._draft.photoPaths, path]));
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    final outcome = await ref
        .read(syncControllerProvider.notifier)
        .submitInspection(widget.taskId, _draft.copyWith(notes: _notes.text));
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
    return Scaffold(
      appBar: AppBar(title: Text(t.inspectionTitle)),
      body: SafeArea(
        child: _outcome != null && _error == null ? _result(t) : _form(t),
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

  Widget _form(AppLocalizations t) {
    final d = _draft;
    final readingText = _reading.text;
    final readingInvalid = readingText.isNotEmpty && !d.readingValid;
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            children: [
              Row(
                children: [
                  Expanded(child: Text(t.inspectionTitle, style: VoltiTypography.heading)),
                  Text(
                    t.itemsCounter(d.answered, InspectionDraft.totalItems),
                    key: const Key('items-counter'),
                    style: VoltiTypography.label.copyWith(fontFamily: VoltiTypography.fontMono),
                  ),
                ],
              ),
              const SizedBox(height: VoltiSpacing.s12),
              _item('brakes', t.itemBrakes, d.brakes, (v) => _set(d.copyWith(brakes: v))),
              _item('tires', t.itemTires, d.tires, (v) => _set(d.copyWith(tires: v))),
              _item('lights', t.itemLights, d.lights, (v) => _set(d.copyWith(lights: v))),
              _item('bell', t.itemBell, d.bell, (v) => _set(d.copyWith(bell: v))),
              _speedItem(t, d, readingInvalid),
              const SizedBox(height: VoltiSpacing.s12),
              PhotoCapture(
                key: const Key('photo-capture'),
                label: t.photoAdd,
                hint: d.photoPaths.isEmpty ? t.photoHint : t.photoCount(d.photoPaths.length),
                done: d.photoPaths.isNotEmpty,
                height: 110,
                onTap: _addPhoto,
              ),
              const SizedBox(height: VoltiSpacing.s12),
              TextField(
                key: const Key('notes'),
                controller: _notes,
                maxLines: 3,
                maxLength: 2000,
                decoration: InputDecoration(labelText: t.notesLabel),
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
          padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12,
              VoltiSpacing.screenGutter, VoltiSpacing.s16),
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
            Expanded(child: Text(title, style: VoltiTypography.bodyStrong)),
            ChoiceChip(
              key: Key('$id-ok'),
              label: Text(t.answerOk),
              selected: value == true,
              onSelected: lockedProblem ? null : (_) => onChanged(true),
            ),
            const SizedBox(width: VoltiSpacing.s8),
            ChoiceChip(
              key: Key('$id-problem'),
              label: Text(t.answerProblem),
              selected: value == false,
              onSelected: (_) => onChanged(false),
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
                Expanded(child: Text(t.itemSpeed, style: VoltiTypography.bodyStrong)),
                ChoiceChip(
                  key: const Key('speedLimiter-ok'),
                  label: Text(t.answerOk),
                  selected: d.effectiveSpeedOk == true,
                  onSelected: d.speedNonCompliant
                      ? null
                      : (_) => _set(d.copyWith(speedOk: true)),
                ),
                const SizedBox(width: VoltiSpacing.s8),
                ChoiceChip(
                  key: const Key('speedLimiter-problem'),
                  label: Text(t.answerProblem),
                  selected: d.effectiveSpeedOk == false,
                  onSelected: (_) => _set(d.copyWith(speedOk: false)),
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
                var next = d.copyWith(speedReading: n);
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
