/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import Redlock from 'redlock';
import { REDIS_CLIENT } from './redis-con.module';

// Defined locally instead of importing redlock's own `Lock` export — that
// export resolves to `any` in some redlock versions/module setups, which
// silently collapses any union type it appears in (e.g. `Lock | undefined`
// becomes just `any`). This interface matches the actual shape redlock
// resolves on a successful acquire().
export interface ILock {
  resource: string;
  value: string;
  attempts: number;
  expiration: number;
  release(): Promise<unknown>;
}

// Real runtime narrowing, not a blind cast — if redlock's resolved object
// ever doesn't actually look like a lock (wrong version, breaking change),
// this catches it with a logged error instead of crashing later at the
// point .release() gets called on something that isn't a lock at all.
function isValidLock(value: unknown): value is ILock {
  return (
    typeof value === 'object' &&
    value !== null &&
    'release' in value &&
    typeof (value as { release?: unknown }).release === 'function'
  );
}

@Injectable()
export class RedisLock implements OnModuleDestroy {
  private single: Redlock;
  private multiple: Redlock;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    this.multiple = new Redlock([this.redis], {
      driftFactor: 0.01,
      retryCount: 25,
      retryDelay: 200,
      retryJitter: 200,
    });

    this.single = new Redlock([this.redis], {
      driftFactor: 0.01,
      retryCount: 0,
      retryDelay: 0,
      retryJitter: 0,
    });
  }

  onModuleDestroy() {
    try {
      this.single.quit();
      this.multiple.quit();
    } catch (error) {
      console.error('Error shutting down RedisLock connections:', error);
    }
  }

  async multipleLock(
    resource: string,
    ttl: number,
  ): Promise<ILock | undefined> {
    try {
      const lock: unknown = await this.multiple.acquire([resource], ttl);

      if (!isValidLock(lock)) {
        console.error('redlock (multiple) returned unexpected shape:', lock);
        return undefined;
      }

      return lock;
    } catch (error) {
      return undefined;
    }
  }

  async singleLock(resource: string, ttl: number): Promise<ILock | undefined> {
    try {
      const lock: unknown = await this.single.acquire([resource], ttl);

      if (!isValidLock(lock)) {
        console.error('redlock (single) returned unexpected shape:', lock);
        return undefined;
      }

      return lock;
    } catch (error) {
      return undefined;
    }
  }

  async releaseLock(lock: ILock): Promise<void> {
    try {
      await lock.release();
    } catch (error) {
      return undefined;
    }
  }

  generateLock(resource: string, unique: string | number): string {
    const environment = process.env.STAGE ?? 'dev';
    return `${environment}:lock:${resource}:${unique}`;
  }
}
