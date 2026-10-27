import type { TraccarDevice } from './types';

/** API REST do Traccar (só rede interna, spec §6.5), com a sessão do usuário da ponte (cookie também usado no WebSocket). */
export class TraccarRest {
  private cookie?: string;

  constructor(
    private readonly baseUrl: string,
    private readonly email: string,
    private readonly password: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async login(): Promise<string> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: this.email, password: this.password }).toString(),
    });
    if (!res.ok) throw new Error(`traccar_login_failed_${res.status}`);
    const m = /JSESSIONID=([^;]+)/.exec(res.headers.get('set-cookie') ?? '');
    if (!m) throw new Error('traccar_login_no_session');
    this.cookie = `JSESSIONID=${m[1]}`;
    return this.cookie;
  }

  private async request(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
    const cookie = this.cookie ?? (await this.login());
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, { ...init, headers: { ...((init.headers as Record<string, string>) ?? {}), Cookie: cookie } });
    if (res.status === 401 && retry) {
      this.cookie = undefined;
      return this.request(path, init, false);
    }
    return res;
  }

  async devices(): Promise<TraccarDevice[]> {
    const res = await this.request('/api/devices');
    if (!res.ok) throw new Error(`traccar_devices_failed_${res.status}`);
    return (await res.json()) as TraccarDevice[];
  }

  /** `GET /api/server`: a ponte lê `version` (C1: `noQueue` só a partir do Traccar 6.7.0). */
  async server(): Promise<{ version?: unknown }> {
    const res = await this.request('/api/server');
    if (!res.ok) throw new Error(`traccar_server_failed_${res.status}`);
    return (await res.json()) as { version?: unknown };
  }

  /**
   * Envia SEM fila (`attributes.noQueue`): sem sessão do dispositivo o Traccar recusa (erro HTTP → exceção) em vez de guardar o
   * comando e entregá-lo na reconexão, em qualquer velocidade. 200 = enviado ao dispositivo; 202 = enfileirado mesmo assim
   * (Traccar que ignora `noQueue`) — quem chama registra como erro.
   */
  async sendCommand(deviceId: number, type: 'engineStop' | 'engineResume'): Promise<'sent' | 'queued'> {
    const res = await this.request('/api/commands/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, type, attributes: { noQueue: true } }),
    });
    if (res.status === 202) return 'queued';
    if (!res.ok) throw new Error(`traccar_command_failed_${res.status}`);
    return 'sent';
  }

  /** Só no compose local: o primeiro usuário de um Traccar vazio vira administrador. `false` se já houver usuários. */
  async bootstrapFirstUser(name: string): Promise<boolean> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: this.email, password: this.password }),
    });
    return res.ok;
  }
}
