/**
 * Local store wiring.
 *
 * Native builds persist to SQLite. The Expo web demo has no native SQLite
 * module, so it runs the same logic against the in-memory store — the sync and
 * outbox rules are identical either way.
 */
import { createStore } from './createStore';
import { DemoSyncTransport, type SyncTransport } from './sync';
import type { LocalStore } from './types';

let storePromise: Promise<LocalStore> | undefined;
let transport: SyncTransport | undefined;

export function getLocalStore(): Promise<LocalStore> {
  if (!storePromise) {
    storePromise = createStore();
  }
  return storePromise;
}

export function getSyncTransport(): SyncTransport {
  if (!transport) {
    transport = new DemoSyncTransport();
  }
  return transport;
}

/** Test seam: drop the cached singletons. */
export function resetLocalStoreForTests(): void {
  storePromise = undefined;
  transport = undefined;
}

export { MemoryLocalStore } from './memoryStore';
export { DemoSyncTransport, syncOnce } from './sync';
export type { LocalStore, OutboxOperation, StoredCheckIn } from './types';
