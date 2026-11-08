import '../src/tasks/ringtoneScheduler'; // IMPORTANT: Must be imported at the root level for background task registration
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AnimatedSplash from '../src/components/AnimatedSplash';
import SecurityGateScreen from '../src/components/SecurityGateScreen';
import {
  SecurityVerificationReport,
  verifyDeviceSecurity,
} from '../modules/expo-ringtone';
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
  const [secReport, setSecReport] = useState<SecurityVerificationReport | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkSecurityAndLoad = async () => {
      try {
        const report = await verifyDeviceSecurity();
        if (!mounted) return;
        setSecReport(report);
        if (report.authorized) {
          await loadFromStorage();
        }
      } catch {
        if (!mounted) return;
        setSecReport({
          authorized: false,
          statusCode: 4,
          deviceId: 'SECURITY_ERR',
          deviceModel: '',
        });
      }
    };

    checkSecurityAndLoad();

    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        verifyDeviceSecurity()
          .then(rep => {
            if (mounted) setSecReport(rep);
          })
          .catch(() => {});
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const isAuthorized = secReport?.authorized === true;

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar style="light" />

      {secReport === null ? (
        <View style={{ flex: 1, backgroundColor: '#000000' }} />
      ) : isAuthorized ? (
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
      ) : (
        <SecurityGateScreen report={secReport} />
      )}

      {showSplash && <AnimatedSplash onFinish={() => setShowSplash(false)} />}
    </View>
  );
}
