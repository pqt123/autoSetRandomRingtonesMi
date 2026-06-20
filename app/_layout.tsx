import '../src/tasks/ringtoneScheduler'; // IMPORTANT: Must be imported at the root level for background task registration
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../src/store/useStore';
import { Colors } from '../src/theme';

export default function RootLayout() {
  const loadFromStorage = useStore(s => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor={Colors.bg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="add-slot" />
        <Stack.Screen name="permissions" />
      </Stack>
    </>
  );
}
