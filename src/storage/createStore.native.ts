/**
 * Native store factory: durable SQLite persistence on device.
 */
import { SqliteLocalStore } from './database';
import type { LocalStore } from './types';

export async function createStore(): Promise<LocalStore> {
  const store = new SqliteLocalStore();
  await store.init();
  return store;
}
