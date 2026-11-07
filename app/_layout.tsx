import '../src/tasks/ringtoneScheduler'; // IMPORTANT: Must be imported at the root level for background task registration
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AnimatedSplash from '../src/components/AnimatedSplash';
import { useStore } from '../src/store/useStore';
import { Colors } from '../src/theme';

// Giữ màn hình Splash gốc cho tới khi lớp phủ AnimatedSplash sẵn sàng nối tiếp mượt mà
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({
  duration: 0,
  fade: false,
});

export default function RootLayout() {
  const loadFromStorage = useStore(s => s.loadFromStorage);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    loadFromStorage();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-slot" />
        <Stack.Screen name="permissions" />
      </Stack>

      {showSplash && <AnimatedSplash onFinish={() => setShowSplash(false)} />}
    </View>
  );
}
