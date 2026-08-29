import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * A counter that increments each time the screen regains focus.
 *
 * Tab screens stay mounted, so data loaded on mount would otherwise go stale —
 * after a check-in is submitted, Today must show the new state rather than
 * still inviting the patient to start one. Pass the returned key in a loader's
 * dependency list.
 */
export function useFocusRefreshKey(): number {
  const [key, setKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setKey((previous) => previous + 1);
    }, []),
  );

  return key;
}
