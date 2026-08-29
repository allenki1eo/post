/**
 * Default store factory (web, Jest, and any non-native target).
 *
 * Native builds resolve `createStore.native.ts` instead, which uses SQLite.
 * The platform split keeps the native SQLite module — and its WebAssembly
 * worker — out of the web bundle entirely.
 */
import { MemoryLocalStore } from './memoryStore';
import type { LocalStore } from './types';

export async function createStore(): Promise<LocalStore> {
  const store = new MemoryLocalStore();
  await store.init();
  return store;
}
