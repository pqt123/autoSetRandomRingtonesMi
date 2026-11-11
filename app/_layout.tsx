import '../src/tasks/ringtoneScheduler'; // IMPORTANT: Must be imported at the root level for background task registration
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, View } from 'react-native';
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
  const [splashRunId, setSplashRunId] = useState(0);
  const [isAppActive, setIsAppActive] = useState<boolean>(
    AppState.currentState === 'active'
  );
  const [secReport, setSecReport] = useState<SecurityVerificationReport | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const armedForResumeSplashRef = useRef(false);

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
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background' || nextState === 'inactive') {
        setIsAppActive(false);
        // Khi thoát/ẩn app ra ngoài: phủ sẵn màn hình đen + logo ở trạng thái chờ
        // để khi quay lại app không bị nháy khung hình cũ mà chạy hiệu ứng Splash ngay lập tức
        if (!armedForResumeSplashRef.current) {
          armedForResumeSplashRef.current = true;
          setSplashRunId(id => id + 1);
          setShowSplash(true);
        }
      } else if (nextState === 'active') {
        if (
          (prevState === 'background' || prevState === 'inactive') &&
          !armedForResumeSplashRef.current
        ) {
          setSplashRunId(id => id + 1);
          setShowSplash(true);
        }
        armedForResumeSplashRef.current = false;
        setIsAppActive(true);

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

      {showSplash && (
        <AnimatedSplash
          key={splashRunId}
          isAppActive={isAppActive}
          onFinish={() => setShowSplash(false)}
        />
      )}
    </View>
  );
}
