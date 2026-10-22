import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../../core/widgets.dart';
import 'station_logic.dart';

/// Lado do marcador do modo estacoes (alvo de toque >= 44 px).
const stationMarkerSize = 52.0;

/// Marcadores das estacoes no modo estacoes da home: disco azul com o raio e
/// a contagem de baterias num selo colorido pela disponibilidade.
List<Marker> stationMarkers(List<SwapStation> stations, {required ValueChanged<SwapStation> onTap}) => [
  for (final s in stations)
    Marker(
      key: ValueKey('station-mode-${s.id}'),
      point: LatLng(s.lat, s.lng),
      width: stationMarkerSize,
      height: stationMarkerSize,
      child: StationMarker(station: s, onTap: () => onTap(s)),
    ),
];

class StationMarker extends StatelessWidget {
  const StationMarker({super.key, required this.station, this.onTap});
  final SwapStation station;
  final VoidCallback? onTap;

  /// Fundo e texto do selo: verde (>= 3), ambar (1-2) e cinza (0). Texto com
  /// contraste >= 4,5:1 em cada fundo.
  static (Color, Color) badgeColors(StationAvailability a) => switch (a) {
    StationAvailability.many => (VoltiColors.brandAction, VoltiColors.white),
    StationAvailability.few => (VoltiColors.sun400, VoltiColors.ink900),
    StationAvailability.none => (VoltiColors.ink500, VoltiColors.white),
  };

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final a = stationAvailability(station);
    final disc = a == StationAvailability.none ? VoltiColors.ink400 : VoltiColors.blue600;
    return Semantics(
      button: onTap != null,
      // O toque tambem pelo leitor de tela (o GestureDetector fica sob excludeSemantics).
      onTap: onTap,
      label: l.stationMarkerSemantics(station.name, l.stationAvailability(station.availableBatteries)),
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: SizedBox(
          width: stationMarkerSize,
          height: stationMarkerSize,
          child: StationBadgeOverlay(
            station: station,
            child: Center(
              child: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: disc,
                  shape: BoxShape.circle,
                  border: Border.all(color: VoltiColors.white, width: 3),
                  boxShadow: VoltiShadows.shadow2,
                ),
                child: const Icon(LucideIcons.batteryCharging, color: VoltiColors.white, size: 17),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// [child] com o selo de baterias de [station] no canto superior direito
/// (marcador da estacao e, no modo estacoes, o do galpao que e ponto de troca).
/// Sem [station], so o [child].
class StationBadgeOverlay extends StatelessWidget {
  const StationBadgeOverlay({super.key, required this.station, required this.child});
  final SwapStation? station;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final s = station;
    if (s == null) return child;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned.fill(child: child),
        Positioned(top: 0, right: 0, child: StationCountBadge(station: s)),
      ],
    );
  }
}

/// Selo com `availableBatteries`, colorido por [StationMarker.badgeColors].
class StationCountBadge extends StatelessWidget {
  const StationCountBadge({super.key, required this.station});
  final SwapStation station;

  /// Teto da escala de texto do selo (cresce com o texto do sistema sem sair do marcador).
  static const maxTextScale = 1.3;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = StationMarker.badgeColors(stationAvailability(station));
    // O numero tambem e lido no rotulo do marcador.
    return ExcludeSemantics(
      child: MediaQuery.withClampedTextScaling(
        maxScaleFactor: maxTextScale,
        child: DecoratedBox(
          key: const Key('station-count-badge'),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: VoltiRadii.rPill,
            border: Border.all(color: VoltiColors.white, width: 1.5),
          ),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
              child: Center(
                widthFactor: 1,
                heightFactor: 1,
                child: Text(
                  '${station.availableBatteries}',
                  style: TextStyle(fontFamily: VoltiTypography.fontSans, fontWeight: VoltiTypography.fwBold, fontSize: 11, height: 1, color: fg),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
