// Token bucket rate limiter for API calls
// Ensures we don't exceed API rate limits for Scryfall (10/sec) and Pokemon TCG (5/sec)

import { CONFIG } from './config';

interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

class RateLimiter {
  private queue: QueuedRequest<unknown>[] = [];
  private lastRequestTime = 0;
  private processing = false;
  private minDelayMs: number;

  constructor(minDelayMs: number) {
    this.minDelayMs = minDelayMs;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve: resolve as (value: unknown) => void, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.minDelayMs) {
        await this.delay(this.minDelayMs - timeSinceLastRequest);
      }

      const request = this.queue.shift();
      if (!request) continue;

      this.lastRequestTime = Date.now();

      try {
        const result = await request.fn();
        request.resolve(result);
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.processing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instances for each API
export const scryfallLimiter = new RateLimiter(CONFIG.api.scryfallRateLimitMs);
export const pokemonLimiter = new RateLimiter(CONFIG.api.pokemonRateLimitMs);

// Utility function to chunk arrays for batch processing
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Utility function to delay execution
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
