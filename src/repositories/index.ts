import { ApiRepository } from './ApiRepository';
import { getDemoRepository } from './DemoRepository';
import type { Repository } from './Repository';

/**
 * Repository seam. Demo mode (the default) serves validated synthetic data;
 * a configured API base URL switches to the typed backend adapter.
 */
export function getRepository(): Repository {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (baseUrl && process.env.EXPO_PUBLIC_APP_ENV !== 'demo') {
    return new ApiRepository(baseUrl);
  }
  return getDemoRepository();
}

export type { Repository } from './Repository';
