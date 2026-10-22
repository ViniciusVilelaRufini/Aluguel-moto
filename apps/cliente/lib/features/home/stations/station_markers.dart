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
    final (bg, fg) = badgeColors(a);
    final disc = a == StationAvailability.none ? VoltiColors.ink400 : VoltiColors.blue600;
    return Semantics(
      button: onTap != null,
      label: l.stationMarkerSemantics(station.name, l.stationAvailability(station.availableBatteries)),
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: SizedBox(
          width: stationMarkerSize,
          height: stationMarkerSize,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
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
              Positioned(
                top: 0,
                right: 0,
                child: DecoratedBox(
                  key: const Key('station-count-badge'),
                  decoration: BoxDecoration(
                    color: bg,
                    borderRadius: VoltiRadii.rPill,
                    border: Border.all(color: VoltiColors.white, width: 1.5),
                  ),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minWidth: 20, minHeight: 20, maxHeight: 20),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 5),
                      child: Center(
                        widthFactor: 1,
                        // O selo nao cresce com o texto do sistema (cabe no marcador);
                        // o numero tambem e lido no rotulo do marcador.
                        child: MediaQuery.withNoTextScaling(
                          child: Text(
                            '${station.availableBatteries}',
                            style: TextStyle(fontFamily: VoltiTypography.fontSans, fontWeight: VoltiTypography.fwBold, fontSize: 11, height: 1, color: fg),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
