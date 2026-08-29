import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Routes a notification tap to the task it refers to.
 *
 * The payload carries only an in-app route — never a medicine name, symptom,
 * diagnosis, or workflow status.
 */
export function useNotificationRouting(): void {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    let subscription: { remove: () => void } | undefined;
    let cancelled = false;

    import('expo-notifications')
      .then((Notifications) => {
        if (cancelled) {
          return;
        }
        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const route = response.notification.request.content.data?.route;
          if (typeof route === 'string' && route.startsWith('/')) {
            router.push(route as never);
          }
        });
      })
      .catch(() => {
        // Notifications are optional; the app works without them.
      });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [router]);
}
