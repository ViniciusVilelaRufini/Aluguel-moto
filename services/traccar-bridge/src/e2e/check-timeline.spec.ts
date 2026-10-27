import { checkTimeline } from './check-timeline';

const T = 'moto-0901';
const tel = (sec: number, kmh: number) => `motos/${T}/telemetria ${JSON.stringify({ lat: -23.5, lng: -46.6, velocidade_kmh: kmh, bateria_pct: 50, travada: false, ignicao: true, sinal: 5, timestamp: new Date(Date.UTC(2026, 9, 27, 12, 0, sec)).toISOString() })}`;
const cut = `$aws/things/${T}/shadow/update/delta ${JSON.stringify({ state: { travada: true }, version: 9, timestamp: 1 })}`;
const locked = `$aws/things/${T}/shadow/update ${JSON.stringify({ state: { reported: { travada: true, velocidade_kmh: 0 } } })}`;
const unlockDelta = `$aws/things/${T}/shadow/update/delta ${JSON.stringify({ state: { travada: false }, version: 10, timestamp: 2 })}`;
const desiredFalse = `$aws/things/${T}/shadow/update ${JSON.stringify({ state: { desired: { travada: false } } })}`;
const emu = (e: Record<string, unknown>) => JSON.stringify({ ts: 'x', level: 'info', service: 'gt06-emulator', ...e });

describe('checkTimeline (e2e do dev single)', () => {
  it('ok: corte depois de ≥ 2 telemetrias paradas cobrindo ≥ 10 s, uma vez, e reported travada:true depois', () => {
    expect(checkTimeline([tel(0, 20), tel(5, 20), tel(10, 0), tel(15, 0), tel(20, 0), cut, locked], T)).toEqual({ ok: true, problems: [] });
  });

  it('falhas: corte com a moto andando, com < 10 s parada, repetido ou sem confirmação', () => {
    expect(checkTimeline([tel(0, 20), cut, locked], T).problems).toEqual(['corte com 0 amostra(s) parada(s) antes', 'corte com a última velocidade >= 3 km/h']);
    expect(checkTimeline([tel(0, 0), tel(5, 0), cut, locked], T).problems).toEqual(['corte com amostras paradas cobrindo menos de 10 s']);
    expect(checkTimeline([tel(0, 0), tel(10, 0), cut, cut, locked], T).problems).toEqual(['travada:true gravado 2 vezes']);
    expect(checkTimeline([tel(0, 0), tel(10, 0), cut], T).problems).toEqual(['sem reported travada:true depois do corte']);
    expect(checkTimeline([tel(0, 0)], T).problems).toEqual(['nenhum desired travada:true observado']);
  });

  it('oráculo: comando de corte recebido pelo emulador com a moto a >= 3 km/h', () => {
    const ok = checkTimeline([tel(0, 0), tel(10, 0), cut, locked], T, { emulatorCuts: [{ text: 'Relay,1#', speedKmhAtCut: 0 }] });
    expect(ok.ok).toBe(true);
    const bad = checkTimeline([tel(0, 0), tel(10, 0), cut, locked], T, { emulatorCuts: [{ text: 'Relay,1#', speedKmhAtCut: 20 }] });
    expect(bad.problems).toEqual(['emulador recebeu corte "Relay,1#" com a moto a 20 km/h (>= 3)']);
  });

  it('oráculo: reported travada:true sem status com o bit de corte depois da última (re)conexão', () => {
    const base = [tel(0, 0), tel(10, 0), cut];
    const good = [emu({ msg: 'gt06_logged_in' }), emu({ msg: 'gt06_status_sent', blocked: false }), ...base, locked];
    expect(checkTimeline(good, T).ok).toBe(true);
    const noStatus = [emu({ msg: 'gt06_logged_in' }), ...base, locked];
    expect(checkTimeline(noStatus, T).problems).toEqual(['reported travada:true publicado sem status com bit de corte depois da última conexão do rastreador']);
    const reconnect = [emu({ msg: 'gt06_logged_in' }), emu({ msg: 'gt06_status_sent', blocked: true }), emu({ msg: 'gt06_logged_in' }), ...base, locked];
    expect(checkTimeline(reconnect, T).ok).toBe(false);
  });

  it('oráculo: travada:false em desired que ninguém pediu', () => {
    const base = [tel(0, 0), tel(10, 0), cut, locked];
    expect(checkTimeline([...base, desiredFalse], T).problems).toEqual(['desired travada:false não solicitado']);
    expect(checkTimeline([...base, unlockDelta], T).problems).toEqual(['desired travada:false não solicitado']);
    expect(checkTimeline([...base, unlockDelta], T, { unlockRequested: true }).ok).toBe(true);
  });
});
