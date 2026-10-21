# volti_flutter

Tokens, tema, widgets e infraestrutura de API/autenticação compartilhados pelos apps Flutter do Volti (`apps/cliente`, `apps/operador`). Fonte visual: `design-system/` (tokens CSS traduzidos 1:1).

## Uso

```yaml
dependencies:
  volti_flutter:
    path: ../../packages/volti_flutter
```

```dart
import 'package:volti_flutter/volti_flutter.dart';

MaterialApp(theme: VoltiTheme.light(), darkTheme: VoltiTheme.dark(), ...);
```

`volti_flutter.dart` reexporta `VehicleStatus` do `volti_api`.

## Tokens

| Classe | Conteúdo |
|---|---|
| `VoltiColors` | escalas (`green500`, `ink900`, ...), semânticas (`brand`, `danger`, `surfaceCard`, ...), `statusFree..statusOffline`, `batteryHigh/Mid/Low`, `batteryColor(pct)`, `statusColor(VehicleStatus)`, `statusLabel(...)` |
| `VoltiSpacing` | `s0..s48`, `screenGutter`, `controlSm/Md/Lg`, `hitMin` |
| `VoltiRadii` | `xs..xl`, `pill` e `BorderRadius` prontos (`rLg`, `sheetTop`, ...) |
| `VoltiShadows` | `shadow1`, `shadow2`, `shadowSheet`, `shadowBrand`, `shadowCoral`, `glassBlur` |
| `VoltiMotion` | `durFast/Base/Slow`, `easeOut/Spring/InOut`, `pressScale` |
| `VoltiTypography` | `display`, `title`, `heading`, `bodyStrong`, `body`, `label`, `caption`, `overline`, `timer` (JetBrains Mono) |
| `VoltiTheme` | `light()` e `dark()` (Material 3; escuro usa superfícies ink e mantém o verde) |

Fontes (Plus Jakarta Sans 400-800, JetBrains Mono 500/700) vão em `fonts/` e já estão declaradas no `pubspec.yaml`.

## Widgets

`VoltiButton` (variantes `primary`, `secondary`, `ghost`, `dark`, `danger`; tamanhos `sm/md/lg`), `VoltiIconButton`, `BatteryPill(pct, {rangeKm})`, `VehicleMarker(status, batteryPct, {selected, onTap})`, `FleetStatusBadge(status, {count, pill, selected, onTap})`, `RouteInfoPill`, `ReservationBanner`, `SwipeAction`, `OptionCard`, `OtpInput`, `PhotoCapture`, `ListRow`, `ProgressSteps`, `VoltiBottomSheet.show`, `VoltiDialog.show`, `VoltiToast.show`.

Cores de bateria: > 50 verde, 21-50 amarelo, <= 20 coral. Ícones: `lucide_icons_flutter` (`LucideIcons.*`), recebidos como `IconData`.

## API e autenticação

```dart
final api = ref.watch(apiClientProvider);            // VoltiApi (volti_api)
final auth = ref.watch(authRepositoryProvider);      // DevAuthRepository | CognitoAuthRepository
await (auth as DevAuthRepository).signIn(sub: 'u1', email: 'a@b.com');
```

- `API_BASE_URL` via `--dart-define` (padrão `http://10.0.2.2:3000` no Android, `http://localhost:3000` nos demais). Sobrescreva em testes com `apiBaseUrlProvider`.
- `AUTH_MODE=dev|cognito` via `--dart-define` (padrão `dev`).
- Retry exponencial (3 tentativas, 300 ms e 600 ms): erros de conexão em qualquer método; 5xx e timeouts de resposta só em métodos idempotentes (GET, HEAD, PUT, DELETE), para não duplicar `POST`.
- Modo `dev`: `POST /dev/token` com `sub`, `email`, `groups`, `pool` (`DevAuthPool`). Token só em memória.
- Modo `cognito`: interface pronta (`CognitoAuthRepository`), mas o login (Hosted UI/PKCE) lança `UnimplementedError` até a infraestrutura de autenticação existir; `accessToken()` devolve `null`.

## Testes

```
flutter pub get && flutter analyze && flutter test
```
