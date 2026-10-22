import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/depot_state.dart';
import 'package:volti_operador/data/handover_models.dart';
import 'package:volti_operador/features/battery/battery_swap_page.dart' show SerialScannerPage;
import 'package:volti_operador/features/pickups/pickup_checklist_page.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

enum _CodeError { invalid, expired, notInAgenda, notActive }

/// Leitura do QR da reserva (camera ou codigo colado). Confere o formato e a
/// agenda do dia; a assinatura e conferida pela API no envio da entrega.
class PickupScanPage extends ConsumerStatefulWidget {
  const PickupScanPage({super.key, this.scan});

  /// Leitor do QR (padrao: camera). Injetavel nos testes.
  final Future<String?> Function(BuildContext context)? scan;

  @override
  ConsumerState<PickupScanPage> createState() => _PickupScanPageState();
}

class _PickupScanPageState extends ConsumerState<PickupScanPage> {
  final _code = TextEditingController();
  _CodeError? _error;
  bool _checking = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _openCamera() async {
    final t = AppLocalizations.of(context);
    final scan = widget.scan ??
        (c) => SerialScannerPage.open(c, title: t.pickupScanAim, manualLabel: t.pickupCodeLabel);
    final raw = await scan(context);
    if (raw == null || !mounted) return;
    _code.text = raw.trim();
    await _check(raw);
  }

  /// Agenda do dia, se der para carregar (sem rede segue sem conferir).
  Future<List<Reservation>?> _agenda() async {
    try {
      final depots = await ref.read(depotsProvider.future);
      final id = effectiveDepotId(depots.depots, ref.read(selectedDepotProvider));
      if (id == null) return null;
      ref.invalidate(pickupsProvider(id));
      return await ref.read(pickupsProvider(id).future);
    } catch (_) {
      return null;
    }
  }

  Future<void> _check(String raw) async {
    final code = PickupCode.parse(raw);
    if (code == null) return setState(() => _error = _CodeError.invalid);
    if (code.expiredAt(DateTime.now())) return setState(() => _error = _CodeError.expired);
    setState(() {
      _error = null;
      _checking = true;
    });
    final agenda = await _agenda();
    if (!mounted) return;
    setState(() => _checking = false);
    Reservation? match;
    if (agenda != null) {
      for (final r in agenda) {
        if (r.id.toLowerCase() == code.reservationId) match = r;
      }
      if (match == null) return setState(() => _error = _CodeError.notInAgenda);
      if (match.status != ReservationStatus.active) {
        return setState(() => _error = _CodeError.notActive);
      }
    }
    VoltiHaptics.success();
    await Navigator.of(context).pushReplacement(MaterialPageRoute<void>(
        builder: (_) => PickupChecklistPage(pickupCode: code.raw, reservation: match)));
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final (title, body) = switch (_error) {
      _CodeError.invalid => (t.pickupCodeInvalid, t.pickupCodeInvalidBody),
      _CodeError.expired => (t.pickupCodeExpired, t.pickupCodeExpiredBody),
      _CodeError.notInAgenda => (t.pickupNotInAgenda, t.pickupNotInAgendaBody),
      _CodeError.notActive => (t.pickupNotActive, null),
      null => (null, null),
    };
    return Scaffold(
      body: Column(
        children: [
          OperatorTopBar(title: t.pickupScanTitle),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
              children: [
                const ConnectivityBanner(padding: EdgeInsets.only(bottom: VoltiSpacing.s10)),
                Text(t.pickupScanBody, style: VoltiTypography.body),
                const SizedBox(height: VoltiSpacing.s16),
                VoltiButton(
                  key: const Key('pickup-open-camera'),
                  label: t.pickupScanOpenCamera,
                  icon: LucideIcons.scanQrCode,
                  size: VoltiButtonSize.lg,
                  fullWidth: true,
                  loading: _checking,
                  onPressed: _checking ? null : _openCamera,
                ),
                if (title != null) ...[
                  const SizedBox(height: VoltiSpacing.s12),
                  Notice(
                    key: const Key('pickup-code-error'),
                    tone: NoticeTone.danger,
                    icon: LucideIcons.circleAlert,
                    title: title,
                    body: body,
                  ),
                ],
                const SizedBox(height: VoltiSpacing.s20),
                SectionCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextField(
                        key: const Key('pickup-code'),
                        controller: _code,
                        maxLength: 256,
                        autocorrect: false,
                        enableSuggestions: false,
                        style: VoltiTypography.body.copyWith(fontFamily: VoltiTypography.fontMono),
                        decoration: InputDecoration(
                          labelText: t.pickupCodeLabel,
                          hintText: t.pickupCodeHint,
                          counterText: '',
                          prefixIcon:
                              const Icon(LucideIcons.keyboard, color: VoltiColors.textTertiary),
                        ),
                        onChanged: (_) => setState(() {}),
                        onSubmitted: (v) => _check(v),
                      ),
                      const SizedBox(height: VoltiSpacing.s12),
                      VoltiButton(
                        key: const Key('pickup-code-continue'),
                        label: t.pickupCodeContinue,
                        variant: VoltiButtonVariant.secondary,
                        fullWidth: true,
                        onPressed: _checking || _code.text.trim().isEmpty
                            ? null
                            : () => _check(_code.text),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
