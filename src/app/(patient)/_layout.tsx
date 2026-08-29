import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useNotificationRouting } from '../../features/notifications/useNotificationRouting';
import { colors } from '../../theme/tokens';

export default function PatientTabLayout() {
  const { t } = useTranslation();
  // A reminder tap opens the task it refers to.
  useNotificationRouting();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.mutedInk,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: t('patientTabs.today'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sunny-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('patientTabs.progress'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="passport"
        options={{
          title: t('patientTabs.passport'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-open-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: t('patientTabs.help'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="help-buoy-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('patientTabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
      {/* The check-in is a pushed screen, not a sixth tab. */}
      <Tabs.Screen name="check-in/[scheduleId]" options={{ href: null }} />
    </Tabs>
  );
}
