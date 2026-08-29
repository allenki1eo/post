import { useEffect, useState } from 'react';

export interface AsyncDataState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
}

/**
 * Minimal async loader for the demo repository (which resolves instantly from
 * validated in-memory seeds). TanStack Query is introduced in Milestone 2
 * when real caching/retry semantics arrive with the sync layer.
 */
export function useAsyncData<T>(load: () => Promise<T>, deps: unknown[] = []): AsyncDataState<T> {
  const [state, setState] = useState<AsyncDataState<T>>({
    data: undefined,
    loading: true,
    error: undefined,
  });

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (!cancelled) {
          setState({ data, loading: false, error: undefined });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setState({ data: undefined, loading: false, error });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
