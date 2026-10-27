import { checkTimeline, mergeByTime } from './check-timeline';

const T = 'moto-0901';
const tel = (sec: number, kmh: number) => `motos/${T}/telemetria ${JSON.stringify({ lat: -23.5, lng: -46.6, velocidade_kmh: kmh, bateria_pct: 50, travada: false, ignicao: true, sinal: 5, timestamp: new Date(Date.UTC(2026, 9, 27, 12, 0, sec)).toISOString() })}`;
const cut = `$aws/things/${T}/shadow/update/delta ${JSON.stringify({ state: { travada: true }, version: 9, timestamp: 1 })}`;
const locked = `$aws/things/${T}/shadow/update ${JSON.stringify({ state: { reported: { travada: true, velocidade_kmh: 0 } } })}`;
const unlockDelta = `$aws/things/${T}/shadow/update/delta ${JSON.stringify({ state: { travada: false }, version: 10, timestamp: 2 })}`;
const desiredFalse = `$aws/things/${T}/shadow/update ${JSON.stringify({ state: { desired: { travada: false } } })}`;
const at = (sec: number) => new Date(Date.UTC(2026, 9, 27, 12, 1, sec)).toISOString();
const emu = (e: Record<string, unknown>, sec?: number) => JSON.stringify({ ...(sec === undefined ? {} : { ts: at(sec) }), level: 'info', service: 'gt06-emulator', ...e });
const login = (s?: number) => emu({ msg: 'gt06_logged_in' }, s);
const gotCut = (speed = 0, s?: number) => emu({ msg: 'gt06_cut', text: 'Relay,1#', speedKmhAtCut: speed }, s);
const status = (blocked: boolean, s?: number) => emu({ msg: 'gt06_status_sent', blocked }, s);
const stopped = [tel(0, 0), tel(10, 0), cut];
const NO_EMU = { noEmulatorLog: true };

describe('checkTimeline (e2e do dev single)', () => {
  it('ok: corte depois de ≥ 2 telemetrias paradas cobrindo ≥ 10 s, uma vez, e reported travada:true depois', () => {
    expect(checkTimeline([tel(0, 20), tel(5, 20), tel(10, 0), tel(15, 0), tel(20, 0), cut, locked], T, NO_EMU)).toEqual({ ok: true, problems: [] });
  });

  it('falhas: corte com a moto andando, com < 10 s parada, repetido ou sem confirmação', () => {
    expect(checkTimeline([tel(0, 20), cut, locked], T, NO_EMU).problems).toEqual(['corte com 0 amostra(s) parada(s) antes', 'corte com a última velocidade >= 3 km/h']);
    expect(checkTimeline([tel(0, 0), tel(5, 0), cut, locked], T, NO_EMU).problems).toEqual(['corte com amostras paradas cobrindo menos de 10 s']);
    expect(checkTimeline([tel(0, 0), tel(10, 0), cut, cut, locked], T, NO_EMU).problems).toEqual(['travada:true gravado 2 vezes']);
    expect(checkTimeline([tel(0, 0), tel(10, 0), cut], T, NO_EMU).problems).toEqual(['sem reported travada:true depois do corte']);
    expect(checkTimeline([tel(0, 0)], T, NO_EMU).problems).toEqual(['nenhum desired travada:true observado']);
  });

  it('falha fechada: sem log do emulador (e sem dispensa explícita) é problema, não ok', () => {
    const r = checkTimeline([...stopped, locked], T);
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toMatch(/^check skipped: sem log do emulador/);
  });

  it('oráculo: comando de corte recebido pelo emulador com a moto a >= 3 km/h', () => {
    expect(checkTimeline([...stopped, locked], T, { emulatorCuts: [{ text: 'Relay,1#', speedKmhAtCut: 0 }], noEmulatorLog: false, unlockRequested: false }).problems).toEqual([
      'reported travada:true publicado sem status com bit de corte (blocked:true) depois do corte do emulador e da última conexão',
    ]);
    const bad = checkTimeline([...stopped, locked], T, { emulatorCuts: [{ text: 'Relay,1#', speedKmhAtCut: 20 }] });
    expect(bad.problems).toContain('emulador recebeu corte "Relay,1#" com a moto a 20 km/h (>= 3)');
    const inLog = checkTimeline([login(), ...stopped, gotCut(20), status(true), locked], T);
    expect(inLog.problems).toEqual(['emulador recebeu corte "Relay,1#" com a moto a 20 km/h (>= 3)']);
  });

  it('oráculo: desired travada:true sem nenhum gt06_cut no log', () => {
    const r = checkTimeline([login(), status(false), ...stopped, locked], T);
    expect(r.problems).toContain('desired travada:true observado mas o emulador não registrou nenhum corte (gt06_cut)');
  });

  it('oráculo: reported travada:true exige status blocked:true depois do corte e da última conexão', () => {
    const good = [login(), status(false), ...stopped, gotCut(), status(true), locked];
    expect(checkTimeline(good, T)).toEqual({ ok: true, problems: [] });
    const msg = 'reported travada:true publicado sem status com bit de corte (blocked:true) depois do corte do emulador e da última conexão';
    // só status blocked:false
    expect(checkTimeline([login(), status(false), ...stopped, gotCut(), status(false), locked], T).problems).toEqual([msg]);
    // status blocked:true ANTES do corte não vale
    expect(checkTimeline([login(), status(true), ...stopped, gotCut(), locked], T).problems).toEqual([msg]);
    // reconexão depois do status zera
    expect(checkTimeline([login(), status(false), ...stopped, gotCut(), status(true), login(), locked], T).problems).toEqual([msg]);
  });

  it('oráculo: status com bit de corte velho (> 90 s) quando as linhas têm hora', () => {
    const stale = [login(0), status(false, 1), `${at(2)} ${tel(0, 0)}`, `${at(3)} ${tel(10, 0)}`, `${at(4)} ${cut}`, gotCut(0, 5), status(true, 6), `${at(6 + 91)} ${locked}`];
    expect(checkTimeline(stale, T).problems).toEqual(['reported travada:true publicado 91 s depois do último status com o bit de corte (> 90 s)']);
    const fresh = [login(0), status(false, 1), `${at(2)} ${tel(0, 0)}`, `${at(3)} ${tel(10, 0)}`, `${at(4)} ${cut}`, gotCut(0, 5), status(true, 6), `${at(6 + 60)} ${locked}`];
    expect(checkTimeline(fresh, T)).toEqual({ ok: true, problems: [] });
  });

  it('oráculo: travada:false em desired que ninguém pediu', () => {
    const base = [...stopped, locked];
    expect(checkTimeline([...base, desiredFalse], T, NO_EMU).problems).toEqual(['desired travada:false não solicitado']);
    expect(checkTimeline([...base, unlockDelta], T, NO_EMU).problems).toEqual(['desired travada:false não solicitado']);
    expect(checkTimeline([...base, unlockDelta], T, { ...NO_EMU, unlockRequested: true }).ok).toBe(true);
  });

  it('mergeByTime intercala por hora e devolve null se faltar hora', () => {
    const stream = [`${at(5)} ${locked}`, `${at(1)} ${tel(0, 0)}`];
    const log = [emu({ msg: 'gt06_logged_in' }, 0), emu({ msg: 'gt06_cut', text: 'x', speedKmhAtCut: 0 }, 3)];
    const m = mergeByTime(stream, log)!;
    expect(m.map((l) => (l.startsWith('{') ? JSON.parse(l).msg : 'mqtt'))).toEqual(['gt06_logged_in', 'mqtt', 'gt06_cut', 'mqtt']);
    expect(mergeByTime([locked], log)).toBeNull();
  });
});
