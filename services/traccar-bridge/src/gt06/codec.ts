/**
 * Protocolo GT06 (Concox) — só o necessário para o emulador de testes: quadro `78 78 | tamanho | protocolo | conteúdo | série |
 * CRC-ITU | 0D 0A`, com tamanho = 1 + conteúdo + 2 + 2 e CRC calculado do byte de tamanho até a série.
 */
export const PROTO = { login: 0x01, location: 0x12, status: 0x13, stringInfo: 0x15, alarm: 0x16, info: 0x94, serverCommand: 0x80 } as const;
const START = Buffer.from([0x78, 0x78]);
const STOP = Buffer.from([0x0d, 0x0a]);

/** CRC-ITU = CRC-16/X-25 (polinômio refletido 0x8408, início 0xFFFF, saída invertida). */
export function crcItu(data: Uint8Array): number {
  let crc = 0xffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0x8408 : crc >>> 1;
  }
  return (crc ^ 0xffff) & 0xffff;
}

export function frame(protocol: number, content: Buffer, serial: number): Buffer {
  const body = Buffer.alloc(2 + content.length + 2);
  body.writeUInt8(1 + content.length + 2 + 2, 0);
  body.writeUInt8(protocol, 1);
  content.copy(body, 2);
  body.writeUInt16BE(serial & 0xffff, 2 + content.length);
  const crc = Buffer.alloc(2);
  crc.writeUInt16BE(crcItu(body), 0);
  return Buffer.concat([START, body, crc, STOP]);
}

/** IMEI de 15 dígitos em BCD com um zero à esquerda (8 bytes). */
export function loginPacket(imei: string, serial: number): Buffer {
  if (!/^\d{15}$/.test(imei)) throw new Error('IMEI deve ter 15 dígitos');
  return frame(PROTO.login, Buffer.from(`0${imei}`, 'hex'), serial);
}

export interface Gt06Fix {
  at: Date;
  lat: number;
  lng: number;
  speedKmh: number;
  courseDeg: number;
  satellites: number;
  valid: boolean;
}

function gpsBlock(f: Gt06Fix): Buffer {
  const b = Buffer.alloc(18);
  b.writeUInt8(f.at.getUTCFullYear() % 100, 0);
  b.writeUInt8(f.at.getUTCMonth() + 1, 1);
  b.writeUInt8(f.at.getUTCDate(), 2);
  b.writeUInt8(f.at.getUTCHours(), 3);
  b.writeUInt8(f.at.getUTCMinutes(), 4);
  b.writeUInt8(f.at.getUTCSeconds(), 5);
  b.writeUInt8((12 << 4) | Math.min(15, Math.max(0, f.satellites)), 6);
  b.writeUInt32BE(Math.round(Math.abs(f.lat) * 1_800_000), 7);
  b.writeUInt32BE(Math.round(Math.abs(f.lng) * 1_800_000), 11);
  b.writeUInt8(Math.max(0, Math.min(255, Math.round(f.speedKmh))), 15);
  let flags = Math.round(f.courseDeg) & 0x3ff;
  if (f.valid) flags |= 1 << 12;
  if (f.lng < 0) flags |= 1 << 11; // oeste
  if (f.lat >= 0) flags |= 1 << 10; // norte
  b.writeUInt16BE(flags, 16);
  return b;
}

/** Célula fixa (MCC 724 = Brasil): MCC 2, MNC 1, LAC 2, Cell ID 3 bytes; com o byte de tamanho no alarme. */
function lbsBlock(withLength: boolean): Buffer {
  const lbs = Buffer.from([0x02, 0xd4, 0x05, 0x12, 0x34, 0x00, 0xab, 0xcd]);
  return withLength ? Buffer.concat([Buffer.from([0x09]), lbs]) : lbs;
}

export function locationPacket(f: Gt06Fix, serial: number): Buffer {
  return frame(PROTO.location, Buffer.concat([gpsBlock(f), lbsBlock(false)]), serial);
}

export interface Gt06Status {
  blocked: boolean;
  ignition: boolean;
  charging: boolean;
  /** 0–6 */
  voltageLevel: number;
  /** 0–4 */
  gsmSignal: number;
}

function terminalInfo(s: Gt06Status): number {
  return (s.blocked ? 0x80 : 0) | 0x40 | (s.charging ? 0x04 : 0) | (s.ignition ? 0x02 : 0);
}

export function statusPacket(s: Gt06Status, serial: number): Buffer {
  return frame(PROTO.status, Buffer.from([terminalInfo(s), s.voltageLevel, s.gsmSignal, 0x00, 0x02]), serial);
}

/**
 * Pacote de informação 0x94 em quadro 0x7878: SEM byte de subtipo (o subtipo só existe nos quadros estendidos 0x7979), conteúdo =
 * tensão externa em 0,01 V como short com sinal. O `decodeBasic` do Traccar faz `KEY_POWER = readShort() * 0.01`, e a ponte tira
 * `bateria_pct` de `attributes.power` (o heartbeat 0x13 só traz um nível 0–6, que a ponte não usa).
 */
export function infoPacket(volts: number, serial: number): Buffer {
  const c = Buffer.alloc(2);
  c.writeInt16BE(Math.max(0, Math.min(0x7fff, Math.round(volts * 100))), 0);
  return frame(PROTO.info, c, serial);
}

const ALARM_CODE = { powerCut: 0x02, vibration: 0x03 } as const;

export function alarmPacket(f: Gt06Fix, s: Gt06Status, kind: keyof typeof ALARM_CODE, serial: number): Buffer {
  const status = Buffer.from([terminalInfo(s), s.voltageLevel, s.gsmSignal, ALARM_CODE[kind], 0x02]);
  return frame(PROTO.alarm, Buffer.concat([gpsBlock(f), lbsBlock(true), status]), serial);
}

/** Resposta de texto a um comando: tamanho, 4 bytes de flag do servidor, ASCII, idioma (0x0002 = inglês). */
export function stringReplyPacket(text: string, serial: number): Buffer {
  const ascii = Buffer.from(text, 'ascii');
  return frame(PROTO.stringInfo, Buffer.concat([Buffer.from([4 + ascii.length, 0, 0, 0, 0]), ascii, Buffer.from([0x00, 0x02])]), serial);
}

/** Comando do servidor no layout do encoder GT06 do Traccar (para testes): tamanho, flag de 4 bytes, ASCII, idioma. */
export function serverCommandPacket(text: string, serial: number): Buffer {
  const ascii = Buffer.from(text, 'ascii');
  return frame(PROTO.serverCommand, Buffer.concat([Buffer.from([4 + ascii.length, 0, 0, 0, 0]), ascii, Buffer.from([0x00, 0x02])]), serial);
}

export interface Gt06Frame {
  protocol: number;
  content: Buffer;
  serial: number;
}

/** Extrai os quadros completos e válidos (CRC e fim conferidos); devolve o resto incompleto para juntar com o próximo pedaço. */
export function parseFrames(buf: Buffer): { frames: Gt06Frame[]; rest: Buffer } {
  const frames: Gt06Frame[] = [];
  let i = 0;
  while (i + 3 <= buf.length) {
    if (buf[i] !== 0x78 || buf[i + 1] !== 0x78) {
      i++;
      continue;
    }
    const len = buf[i + 2];
    const total = len + 5;
    if (i + total > buf.length) break;
    const body = buf.subarray(i + 2, i + 2 + len - 1);
    const crc = buf.readUInt16BE(i + 1 + len);
    const okStop = buf[i + len + 3] === 0x0d && buf[i + len + 4] === 0x0a;
    if (len < 5 || !okStop || crcItu(body) !== crc) {
      i++;
      continue;
    }
    frames.push({ protocol: body[1], content: Buffer.from(body.subarray(2, body.length - 2)), serial: body.readUInt16BE(body.length - 2) });
    i += total;
  }
  return { frames, rest: Buffer.from(buf.subarray(i)) };
}

export function commandText(f: Gt06Frame): string | null {
  if (f.protocol !== PROTO.serverCommand || f.content.length < 5) return null;
  const len = f.content[0];
  return f.content.subarray(5, Math.min(f.content.length, 1 + len)).toString('ascii');
}
