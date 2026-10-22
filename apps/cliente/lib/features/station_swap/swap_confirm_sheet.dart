import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/services.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';
import 'swap_logic.dart';

/// Confirmacao da troca: `Trocar a bateria da <codigo> aqui?`, baterias
/// disponiveis e, nos planos por minuto/hora, a taxa. "Abrir compartimento"
/// cria a troca (`POST /swap-stations/{id}/swaps`) e fecha com ela.
///
/// Idempotencia: uma `Idempotency-Key` por tentativa. Falha de rede repete com
/// a mesma chave e a mesma posicao (a API devolve a troca ja criada, sem abrir
/// outra vaga); recusa da API (erros nao ficam memorizados) gera chave e
/// posicao novas na proxima tentativa.
class SwapConfirmSheet extends ConsumerStatefulWidget {
  const SwapConfirmSheet({
    super.key,
    required this.rental,
    required this.stationId,
    required this.stationCode,
    this.station,
  });

  final Rental rental;
  final String stationId;
  final String stationCode;
  final SwapStation? station;

  static Future<StationSwap?> show(
    BuildContext context, {
    required Rental rental,
    required String stationId,
    required String stationCode,
    SwapStation? station,
  }) =>
      VoltiBottomSheet.show<StationSwap>(
        context,
        builder: (_) => SwapConfirmSheet(rental: rental, stationId: stationId, stationCode: stationCode, station: station),
      );

  @override
  ConsumerState<SwapConfirmSheet> createState() => _SwapConfirmSheetState();
}

class _SwapConfirmSheetState extends ConsumerState<SwapConfirmSheet> {
  String _key = newIdempotencyKey();
  LatLng? _pos;
  bool _busy = false;
  String? _error;
  bool _openConflict = false;

  Future<void> _confirm() async {
    final l = context.l;
    setState(() {
      _busy = true;
      _error = null;
      _openConflict = false;
    });
    try {
      if (_pos == null) {
        bool consent;
        try {
          consent = (await ref.read(sessionProvider.future)).locationConsent;
        } catch (_) {
          consent = false;
        }
        final p = consent ? await ref.read(locationServiceProvider).currentPosition(requestPermission: true) : null;
        if (p == null) {
          if (mounted) setState(() => _error = l.swapLocationNeeded);
          return;
        }
        _pos = p;
      }
      final swap = await ref.read(backendProvider).createStationSwap(
            stationId: widget.stationId,
            stationCode: widget.stationCode,
            rentalId: widget.rental.id,
            lat: _pos!.latitude,
            lng: _pos!.longitude,
            idempotencyKey: _key,
          );
      VoltiHaptics.success();
      if (mounted) Navigator.of(context).pop(swap);
    } catch (e) {
      final f = toFailure(e);
      if (!f.isNetwork) {
        // Recusa da API: a proxima tentativa e outra (chave e posicao novas).
        _key = newIdempotencyKey();
        _pos = null;
      }
      VoltiHaptics.warning();
      if (mounted) {
        setState(() {
          _error = swapErrorMessage(l, f, station: widget.station);
          _openConflict = f.slug == 'swap-open';
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// `409 swap-open`: abre a troca que ja esta em andamento.
  Future<void> _openExisting() async {
    try {
      final s = (await ref.read(backendProvider).currentRentalState()).stationSwap;
      if (!mounted) return;
      if (isOpenSwap(s)) {
        Navigator.of(context).pop(s);
      } else {
        setState(() {
          _openConflict = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = failureText(context.l, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final station = widget.station;
    final fee = swapFeeApplies(widget.rental.planCode);
    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: Text(l.swapConfirmTitle(widget.rental.vehicleCode), key: const Key('swap-confirm-title'), style: VoltiTypography.title),
          ),
          if (station != null) ...[
            const SizedBox(height: VoltiSpacing.s4),
            Text(station.name, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
          ],
          const SizedBox(height: VoltiSpacing.s16),
          if (station != null)
            _Line(
              key: const Key('swap-confirm-available'),
              icon: LucideIcons.batteryCharging,
              text: l.swapConfirmAvailable(station.availableBatteries),
            ),
          if (fee)
            _Line(key: const Key('swap-confirm-fee'), icon: LucideIcons.receipt, text: l.swapConfirmFeeLine),
          _Line(icon: LucideIcons.info, text: l.swapConfirmSteps),
          if (_error != null) ...[
            const SizedBox(height: VoltiSpacing.s4),
            KeyedSubtree(key: const Key('swap-confirm-error'), child: NoticeBanner(icon: LucideIcons.circleAlert, message: _error!, danger: true)),
          ],
          const SizedBox(height: VoltiSpacing.s16),
          if (_openConflict)
            VoltiButton(
              key: const Key('swap-see-open'),
              label: l.swapSeeOpen,
              size: VoltiButtonSize.lg,
              fullWidth: true,
              onPressed: _openExisting,
            )
          else
            VoltiButton(
              key: const Key('swap-open-slot'),
              label: l.swapOpenSlot,
              icon: LucideIcons.packageOpen,
              size: VoltiButtonSize.lg,
              fullWidth: true,
              loading: _busy,
              haptic: VoltiHapticKind.tap,
              onPressed: _busy ? null : _confirm,
            ),
          const SizedBox(height: VoltiSpacing.s8),
          VoltiButton(
            label: l.cancel,
            variant: VoltiButtonVariant.ghost,
            fullWidth: true,
            onPressed: _busy ? null : () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line({super.key, required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: VoltiSpacing.s12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: scheme.onSurfaceVariant),
          const SizedBox(width: VoltiSpacing.s10),
          Expanded(child: Text(text, style: VoltiTypography.body.copyWith(color: scheme.onSurface))),
        ],
      ),
    );
  }
}
