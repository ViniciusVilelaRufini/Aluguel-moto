import { createServer, type AddressInfo, type Server, type Socket } from 'node:net';
import { waitFor } from '../../test/wait';
import type { Logger } from '../log';
import { frame, parseFrames, PROTO, serverCommandPacket, type Gt06Frame } from './codec';
import { voltageToPct } from '../units';
import { defaultPowerVolts, Gt06Emulator } from './emulator';

async function fakeTraccar(): Promise<{ frames: Gt06Frame[]; sock: () => Socket; server: Server; port: number }> {
  const frames: Gt06Frame[] = [];
  let sock: Socket | undefined;
  const server = createServer((s) => {
    sock = s;
    let buf: Buffer = Buffer.alloc(0);
    s.on('data', (d) => {
      const r = parseFrames(Buffer.concat([buf, d]));
      buf = r.rest;
      for (const f of r.frames) {
        frames.push(f);
        if (f.protocol === PROTO.login) s.write(frame(PROTO.login, Buffer.alloc(0), f.serial));
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { frames, sock: () => sock!, server, port: (server.address() as AddressInfo).port };
}

describe('defaultPowerVolts', () => {
  it.each(['48v', '60v', '72v'] as const)('modelo %s: ~70 %% da curva (bateria conhecida e saudável na ponte)', (model) => {
    expect(voltageToPct(defaultPowerVolts(model), model)).toBeGreaterThanOrEqual(69);
    expect(voltageToPct(defaultPowerVolts(model), model)).toBeLessThanOrEqual(71);
  });
});

describe('Gt06Emulator (contra um "Traccar" TCP em processo)', () => {
  it('login, posições e heartbeat; Relay,1# liga o corte (registra a velocidade do instante) e Relay,0# desliga', async () => {
    const t = await fakeTraccar();
    const { frames } = t;
    const emu = new Gt06Emulator({ host: '127.0.0.1', port: t.port, imei: '860000000000901', intervalMs: 50, heartbeatMs: 1_000 });
    try {
      await emu.start();
      expect(frames[0].protocol).toBe(PROTO.login);
      emu.setSpeed(20);
      await waitFor(() => frames.filter((f) => f.protocol === PROTO.location && f.content[15] === 20).length >= 2);
      t.sock().write(serverCommandPacket('Relay,1#', 9));
      await waitFor(() => frames.some((f) => f.protocol === PROTO.stringInfo));
      await waitFor(() => frames.some((f) => f.protocol === PROTO.status && (f.content[0] & 0x80) !== 0));
      expect(emu.blocked).toBe(true);
      expect(emu.speedKmh).toBe(0);
      expect(emu.cuts).toEqual([{ text: 'Relay,1#', speedKmhAtCut: 20 }]);
      emu.setSpeed(15);
      expect(emu.speedKmh).toBe(0); // relé cortado: a moto não anda
      t.sock().write(serverCommandPacket('Relay,0#', 10));
      await waitFor(() => !emu.blocked);
    } finally {
      emu.stop();
      t.server.close();
    }
  });

  it('logo após o login manda status (bit de corte) e tensão externa 0x94 (para a ponte não segurar a telemetria)', async () => {
    const t = await fakeTraccar();
    const emu = new Gt06Emulator({ host: '127.0.0.1', port: t.port, imei: '860000000000901', intervalMs: 5_000, heartbeatMs: 30_000 });
    try {
      await emu.start();
      await waitFor(() => t.frames.some((f) => f.protocol === PROTO.status) && t.frames.some((f) => f.protocol === PROTO.info));
      const info = t.frames.find((f) => f.protocol === PROTO.info)!;
      expect(info.content.length).toBe(2); // 0x7878: sem subtipo, só o short da tensão
      expect(voltageToPct(info.content.readInt16BE(0) * 0.01, '72v')).toBe(70);
    } finally {
      emu.stop();
      t.server.close();
    }
  });

  it('heartbeat nunca passa de 60 s (a ponte trata o bit de corte mais velho que 90 s como desconhecido)', () => {
    const emu = new Gt06Emulator({ host: '127.0.0.1', port: 1, imei: '860000000000901', heartbeatMs: 600_000 });
    expect(emu.heartbeatMs).toBe(60_000);
    expect(new Gt06Emulator({ host: '127.0.0.1', port: 1, imei: '860000000000901' }).heartbeatMs).toBe(30_000);
  });

  it('logs em JSON citam o IMEI só mascarado e registram o status enviado', async () => {
    const t = await fakeTraccar();
    const lines: Array<Record<string, unknown>> = [];
    const push = (e: Record<string, unknown>) => void lines.push(e);
    const log: Logger = { info: push, warn: push, error: push };
    const emu = new Gt06Emulator({ host: '127.0.0.1', port: t.port, imei: '860000000000901', log });
    try {
      await emu.start();
      expect(JSON.stringify(lines)).not.toContain('860000000000901');
      expect(lines.some((l) => l.msg === 'gt06_logged_in' && l.imei === '***********0901')).toBe(true);
      expect(lines.some((l) => l.msg === 'gt06_status_sent' && l.blocked === false)).toBe(true);
    } finally {
      emu.stop();
      t.server.close();
    }
  });
});
