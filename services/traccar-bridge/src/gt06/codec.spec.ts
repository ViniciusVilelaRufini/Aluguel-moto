import { alarmPacket, commandText, crcItu, frame, infoPacket, locationPacket, loginPacket, parseFrames, PROTO, serverCommandPacket, statusPacket } from './codec';

const fix = { at: new Date('2026-10-27T12:34:56Z'), lat: -23.5614, lng: -46.6914, speedKmh: 20, courseDeg: 90, satellites: 9, valid: true };
const status = { blocked: true, ignition: true, charging: true, voltageLevel: 6, gsmSignal: 4 };

describe('codec GT06', () => {
  it('CRC-ITU (CRC-16/X-25) do vetor padrão "123456789" = 0x906E', () => {
    expect(crcItu(Buffer.from('123456789'))).toBe(0x906e);
  });

  it('login do manual do protocolo: 78 78 0D 01 01 23 45 67 89 01 23 45 00 01 8C DD 0D 0A', () => {
    expect(loginPacket('123456789012345', 1).toString('hex')).toBe('78780d01012345678901234500018cdd0d0a');
  });

  it('resposta do servidor ao login: 78 78 05 01 00 01 D9 DC 0D 0A', () => {
    expect(frame(PROTO.login, Buffer.alloc(0), 1).toString('hex')).toBe('787805010001d9dc0d0a');
  });

  it('localização 0x12: tamanho 0x1F, data UTC, lat/lng × 1.800.000, velocidade em km/h, posicionado, sul e oeste', () => {
    const pkt = locationPacket(fix, 2);
    expect(pkt[2]).toBe(0x1f);
    expect(pkt[3]).toBe(PROTO.location);
    const c = pkt.subarray(4);
    expect([...c.subarray(0, 6)]).toEqual([26, 10, 27, 12, 34, 56]);
    expect(c[6]).toBe(0xc9);
    expect(c.readUInt32BE(7)).toBe(Math.round(23.5614 * 1_800_000));
    expect(c.readUInt32BE(11)).toBe(Math.round(46.6914 * 1_800_000));
    expect(c[15]).toBe(20);
    const flags = c.readUInt16BE(16);
    expect(flags & 0x3ff).toBe(90);
    expect((flags >> 12) & 1).toBe(1); // posicionado
    expect((flags >> 11) & 1).toBe(1); // oeste
    expect((flags >> 10) & 1).toBe(0); // sul
    const { frames, rest } = parseFrames(pkt);
    expect(rest.length).toBe(0);
    expect(frames[0]).toMatchObject({ protocol: PROTO.location, serial: 2 });
  });

  it('heartbeat 0x13: bit 7 = corte, bit 6 = GPS, bit 2 = carregando, bit 1 = ACC', () => {
    const pkt = statusPacket(status, 3);
    expect(pkt[2]).toBe(0x0a);
    expect([...pkt.subarray(4, 9)]).toEqual([0xc6, 6, 4, 0x00, 0x02]);
    expect(statusPacket({ ...status, blocked: false, ignition: false }, 4)[4]).toBe(0x44);
  });

  it('alarme 0x16: tamanho 0x25 e código no fim (powerCut 0x02, vibration 0x03)', () => {
    const pkt = alarmPacket(fix, status, 'powerCut', 5);
    expect(pkt[2]).toBe(0x25);
    expect(pkt[3]).toBe(PROTO.alarm);
    expect(pkt[4 + 30]).toBe(0x02);
    expect(alarmPacket(fix, status, 'vibration', 6)[4 + 30]).toBe(0x03);
  });

  it('parseFrames junta pedaços, descarta lixo e quadro com CRC errado', () => {
    const a = loginPacket('860000000000901', 1);
    const b = statusPacket(status, 2);
    const bad = Buffer.from(b);
    bad[bad.length - 3] ^= 0xff;
    const first = parseFrames(Buffer.concat([Buffer.from([0x00, 0x13]), a, b.subarray(0, 5)]));
    expect(first.frames.map((f) => f.protocol)).toEqual([PROTO.login]);
    const second = parseFrames(Buffer.concat([first.rest, b.subarray(5), bad]));
    expect(second.frames.map((f) => f.serial)).toEqual([2]);
  });

  it('comando do servidor 0x80 (layout do encoder do Traccar) → texto', () => {
    const f = parseFrames(serverCommandPacket('Relay,1#', 7)).frames[0];
    expect(f).toMatchObject({ protocol: PROTO.serverCommand, serial: 7 });
    expect(commandText(f)).toBe('Relay,1#');
    expect(commandText(parseFrames(statusPacket(status, 1)).frames[0])).toBeNull();
  });

  it('info 0x94 subtipo 0x00: tensão externa em 0,01 V (vira attributes.power no Traccar)', () => {
    const pkt = infoPacket(52.5, 8);
    expect(pkt[2]).toBe(0x08);
    expect(pkt[3]).toBe(PROTO.info);
    expect([...pkt.subarray(4, 7)]).toEqual([0x00, 0x14, 0x82]);
    expect(parseFrames(pkt).frames[0]).toMatchObject({ protocol: PROTO.info, serial: 8 });
  });
});
