# Volti — App do cliente (UI kit)

Recriação clicável do app de aluguel (iOS/Android). Visual: `uploads/8f26498453a8dd40398598c025cf4411.jpg`. Funções: `uploads/infra_file-1792592492426-iuah.docx`.

Fluxo: Cadastro (celular/Apple/Google → SMS → dados + 18+ → documento + selfie → pagamento) → Mapa (filtros, pin → sheet com buzinar/navegar/reportar) → Reservar (contagem + deslize para cancelar) → QR ou número da moto → Plano (minuto/hora/dia/semana/mês) + seguro (básico obrigatório / completo) + resumo com caução → Corrida (velocidade, limite, SOS, pausa, aviso de zona, detecção de queda, reportar e trocar) → Devolução (ponto verde, foto obrigatória, confirmação do rastreador) → Recibo e avaliação. Avatar → Conta (carteira, plano semanal, histórico, sinistro, suporte, LGPD).

- `MapView.jsx` — tiles OpenStreetMap z15 (São Paulo) dessaturados; `Pin`, `UserDot`, `Route`
- Telas: `Onboarding`, `HomeScreen`, `PickScreen` (lista para escolher e reservar a moto), `ReservedScreen`, `ScanScreen`, `PlanScreen`, `RideScreen`, `ReturnScreen`, `SummaryScreen`, `AccountScreen`
- `ClientApp.jsx` — roteador; chips acima do aparelho pulam entre telas. Em Corrida, chips "Simular zona/queda" demonstram os avisos.

Só mapa, sheet do veículo e reserva existem na referência visual; o resto foi derivado do sistema seguindo o documento de funções.
