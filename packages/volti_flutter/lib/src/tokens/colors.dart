import 'package:flutter/painting.dart';
import 'package:volti_api/volti_api.dart' show VehicleStatus;

/// Cores do Volti Design System (`design-system/tokens/colors.css`).
abstract final class VoltiColors {
  // Escala verde (brand).
  static const green50 = Color(0xFFEAF8EF);
  static const green100 = Color(0xFFD2F1DC);
  static const green200 = Color(0xFFA8E4BA);
  static const green300 = Color(0xFF7FD89A);
  static const green400 = Color(0xFF55CC79);
  static const green500 = Color(0xFF34C25C);
  static const green600 = Color(0xFF27A84C);
  static const green700 = Color(0xFF1E8A3D);
  static const green900 = Color(0xFF0F4A21);

  static const coral50 = Color(0xFFFFEDEB);
  static const coral100 = Color(0xFFFFD7D2);
  static const coral400 = Color(0xFFF7867C);
  static const coral500 = Color(0xFFF2665A);
  static const coral600 = Color(0xFFE04E42);

  static const orange50 = Color(0xFFFFF1E6);
  static const orange500 = Color(0xFFF07A2A);
  static const orange600 = Color(0xFFD9661A);

  static const blue50 = Color(0xFFE8F1FD);
  static const blue500 = Color(0xFF2F7FE0);
  static const blue600 = Color(0xFF1F66C1);

  static const sky100 = Color(0xFFDDF1FA);
  static const sky200 = Color(0xFFC3E6F5);

  static const sun300 = Color(0xFFFFD45C);
  static const sun400 = Color(0xFFFBC531);

  static const violet50 = Color(0xFFF0EDFE);
  static const violet500 = Color(0xFF8B7CF6);
  static const violet600 = Color(0xFF6F5EE8);
  static const lavender100 = Color(0xFFE6E9FD);
  static const lavender200 = Color(0xFFC9CFF8);

  // Tinta fria.
  static const ink900 = Color(0xFF15181A);
  static const ink800 = Color(0xFF1F2326);
  static const ink700 = Color(0xFF3A3F44);
  static const ink600 = Color(0xFF50565C);
  static const ink500 = Color(0xFF6B7178);
  static const ink400 = Color(0xFF9AA0A6);
  static const ink300 = Color(0xFFC9CDD2);
  static const ink200 = Color(0xFFE4E7EA);
  static const ink100 = Color(0xFFF1F3F5);
  static const ink50 = Color(0xFFF7F8FA);
  static const white = Color(0xFFFFFFFF);

  // Mapa.
  static const mapLand = Color(0xFFF2F3F0);
  static const mapRoad = Color(0xFFFFFFFF);
  static const mapWater = Color(0xFFAAD3F2);
  static const mapPark = Color(0xFFB6E3B0);

  // Semanticas (tema claro).
  static const brand = green500;
  static const brandHover = green600;
  static const brandPress = green700;
  static const brandSoft = green50;
  static const onBrand = white;

  static const surfaceApp = ink50;
  static const surfaceCard = white;
  static const surfaceSunken = ink100;
  static const surfaceInverse = ink900;
  static const surfaceMedia = sky100;
  static const surfaceScrim = Color(0x7315181A); // rgba(21,24,26,.45)

  static const textPrimary = ink900;
  static const textSecondary = ink500;
  static const textTertiary = ink400;
  static const textOnInverse = white;
  static const textBrand = green700;
  static const textLink = green600;

  static const borderSubtle = ink200;
  static const borderStrong = ink300;
  static const borderFocus = green500;

  static const success = green500;
  static const successSoft = green50;
  static const successInk = green700;
  static const danger = coral500;
  static const dangerSoft = coral50;
  static const dangerInk = coral600;
  static const warning = orange500;
  static const warningSoft = orange50;
  static const warningInk = orange600;
  static const info = blue500;
  static const infoSoft = blue50;
  static const infoInk = blue600;

  // Status da frota (`--status-*`).
  static const statusFree = green500;
  static const statusRented = blue500;
  static const statusReserved = orange500;
  static const statusPaused = sun400;
  static const statusBlocked = coral600;
  static const statusMaintenance = violet500;
  static const statusOffline = ink400;

  // Bateria (`--battery-*`).
  static const batteryHigh = green500;
  static const batteryMid = sun400;
  static const batteryLow = coral500;

  /// Vidro branco 82% dos cards flutuantes sobre o mapa.
  static const glassBg = Color(0xD1FFFFFF);

  /// Cor da bateria: > 50 verde, 21-50 amarelo, <= 20 coral.
  static Color batteryColor(int pct) =>
      pct > 50 ? batteryHigh : (pct > 20 ? batteryMid : batteryLow);

  /// Cor de status da frota (mesmas de `--status-*`).
  static Color statusColor(VehicleStatus status) {
    if (status == VehicleStatus.free) return statusFree;
    if (status == VehicleStatus.rented) return statusRented;
    if (status == VehicleStatus.reserved) return statusReserved;
    if (status == VehicleStatus.paused) return statusPaused;
    if (status == VehicleStatus.blocked) return statusBlocked;
    if (status == VehicleStatus.maintenance) return statusMaintenance;
    return statusOffline;
  }

  /// Rotulo pt-BR do status.
  static String statusLabel(VehicleStatus status) {
    if (status == VehicleStatus.free) return 'Livre';
    if (status == VehicleStatus.rented) return 'Alugada';
    if (status == VehicleStatus.reserved) return 'Reservada';
    if (status == VehicleStatus.paused) return 'Pausada';
    if (status == VehicleStatus.blocked) return 'Bloqueada';
    if (status == VehicleStatus.maintenance) return 'Manutenção';
    return 'Sem sinal';
  }
}
