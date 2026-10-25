import { Interval } from '@nestjs/schedule';
import { SCHEDULE_INTERVAL_OPTIONS, SCHEDULER_NAME } from '@nestjs/schedule/dist/schedule.constants';
import { MemoryRedisStore } from '../redis/redis-store';
import { ExclusiveJob, JobLock, registerJobLock } from './job-lock';

describe('JobLock (lock distribuído por job, SET NX PX)', () => {
  afterEach(() => registerJobLock(undefined));

  it('duas instâncias com o mesmo Redis: só uma executa cada rodada do job', async () => {
    const redis = new MemoryRedisStore();
    const a = new JobLock(redis, 'instancia-a');
    const b = new JobLock(redis, 'instancia-b');
    const runs: string[] = [];
    await Promise.all([a.run('purge', 60_000, async () => void runs.push('a')), b.run('purge', 60_000, async () => void runs.push('b'))]);
    expect(runs).toHaveLength(1);
  });

  it('o lock vale pelo TTL (a rodada seguinte, depois de expirar, roda de novo) e nunca é liberado por outra instância', async () => {
    const redis = new MemoryRedisStore();
    const a = new JobLock(redis, 'a');
    const b = new JobLock(redis, 'b');
    expect(await a.tryAcquire('job', 30)).toBe(true);
    expect(await b.tryAcquire('job', 30)).toBe(false);
    await b.release('job'); // não é dono: não apaga
    expect(await b.tryAcquire('job', 30)).toBe(false);
    await new Promise((r) => setTimeout(r, 50));
    expect(await b.tryAcquire('job', 30)).toBe(true);
  });

  it('Redis fora do ar → pula a rodada (nunca roda sem lock em várias instâncias) e não lança', async () => {
    const redis = new MemoryRedisStore();
    jest.spyOn(redis, 'setNx').mockRejectedValue(new Error('ECONNREFUSED'));
    const fn = jest.fn();
    await expect(new JobLock(redis, 'a').run('job', 1000, fn)).resolves.toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });

  describe('@ExclusiveJob', () => {
    class Jobs {
      calls = 0;
      @Interval('meu-job', 10_000)
      @ExclusiveJob('meu-job', 10_000)
      async job(): Promise<string> {
        this.calls += 1;
        return 'ok';
      }
    }

    it('mantém os metadados do @Interval (o agendador continua achando o método)', () => {
      const fn = Jobs.prototype.job;
      expect(Reflect.getMetadata(SCHEDULER_NAME, fn)).toBe('meu-job');
      expect(Reflect.getMetadata(SCHEDULE_INTERVAL_OPTIONS, fn)).toEqual({ timeout: 10_000 });
    });

    it('sem JobLock registrado (testes unitários) → executa como antes', async () => {
      const jobs = new Jobs();
      await expect(jobs.job()).resolves.toBe('ok');
      expect(jobs.calls).toBe(1);
    });

    it('com JobLock registrado: duas instâncias do serviço na mesma rodada → uma execução', async () => {
      const redis = new MemoryRedisStore();
      registerJobLock(new JobLock(redis, 'x'));
      const one = new Jobs();
      const two = new Jobs();
      await Promise.all([one.job(), two.job()]);
      expect(one.calls + two.calls).toBe(1);
    });
  });
});
