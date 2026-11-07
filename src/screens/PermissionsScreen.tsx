import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  AppState,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { GlassCard, PrimaryButton } from '../components/ui';
import {
  checkWriteSettingsPermission,
  openWriteSettingsScreen,
  isIgnoringBatteryOptimizations,
  openBatteryOptimizationSettings,
  canScheduleExactAlarms,
  openExactAlarmSettings,
  getDeviceSystemInfo,
  openMiuiAutostartSettings,
  openMiuiBatterySaverSettings,
  DeviceSystemInfo,
} from '../../modules/expo-ringtone';

interface PermissionItem {
  id: string;
  title: string;
  description: string;
  detail: string;
  icon: string;
  required: boolean;
  granted: boolean | null;
  onRequest: () => void | Promise<void>;
  onCheck: () => Promise<boolean>;
}

async function checkAudioReadPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const sdk = Number(Platform.Version);
  const perm =
    sdk >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  if (!perm) return true;
  return PermissionsAndroid.check(perm);
}

async function requestAudioReadPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const sdk = Number(Platform.Version);
  const perm =
    sdk >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  if (!perm) return true;
  const status = await PermissionsAndroid.request(perm);
  if (status === PermissionsAndroid.RESULTS.GRANTED) return true;
  if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    Linking.openSettings();
  }
  return false;
}

export default function PermissionsScreen() {
  const [writeSettings, setWriteSettings] = useState<boolean | null>(null);
  const [audioRead, setAudioRead] = useState<boolean | null>(null);
  const [exactAlarm, setExactAlarm] = useState<boolean | null>(null);
  const [batteryExempt, setBatteryExempt] = useState<boolean | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceSystemInfo | null>(null);

  useEffect(() => {
    checkAll();
    getDeviceSystemInfo().then(setDeviceInfo).catch(() => {});

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        checkAll();
      }
    });
    return () => sub.remove();
  }, []);

  const checkAll = async () => {
    const [ws, ar, ea, be] = await Promise.all([
      checkWriteSettingsPermission().catch(() => false),
      checkAudioReadPermission().catch(() => false),
      canScheduleExactAlarms().catch(() => true),
      isIgnoringBatteryOptimizations().catch(() => false),
    ]);
    setWriteSettings(ws);
    setAudioRead(ar);
    setExactAlarm(ea);
    setBatteryExempt(be);
  };

  const permissions: PermissionItem[] = [
    {
      id: 'write_settings',
      title: 'Sửa cài đặt hệ thống',
      description: 'Cần thiết để thay đổi nhạc chuông (kể cả SIM 1 & SIM 2)',
      detail:
        'Trên Android & HyperOS, thay đổi nhạc chuông yêu cầu quyền đặc biệt "Modify system settings". Bạn cần bật thủ công trong Settings.',
      icon: '🔔',
      required: true,
      granted: writeSettings,
      onCheck: checkWriteSettingsPermission,
      onRequest: () => {
        openWriteSettingsScreen();
      },
    },
    {
      id: 'audio_read',
      title: 'Truy cập nhạc & âm thanh',
      description: 'Cần thiết trên HyperOS 1 / Android 13+ để đọc MediaStore ổn định',
      detail:
        'Giúp ứng dụng đọc và đăng ký file nhạc chuông trong bộ nhớ mà không bị HyperOS 1 chặn quyền truy cập.',
      icon: '🎵',
      required: false,
      granted: audioRead,
      onCheck: checkAudioReadPermission,
      onRequest: async () => {
        const granted = await requestAudioReadPermission();
        setAudioRead(granted);
      },
    },
    ...(Platform.OS === 'android' && Number(Platform.Version) >= 31
      ? [
          {
            id: 'exact_alarm',
            title: 'Báo thức & Lịch chính xác',
            description: 'Giúp đổi nhạc chuông chuẩn từng phút ngay cả khi tắt màn hình',
            detail:
              'Cho phép AlarmManager đánh thức bộ đổi nhạc đúng giờ bắt đầu khung giờ mà không phụ thuộc mạng hay bị trễ.',
            icon: '⏰',
            required: false,
            granted: exactAlarm,
            onCheck: canScheduleExactAlarms,
            onRequest: () => {
              openExactAlarmSettings();
            },
          } as PermissionItem,
        ]
      : []),
    {
      id: 'battery',
      title: 'Tắt tối ưu pin (Battery)',
      description: 'Đặc biệt quan trọng trên MIUI / HyperOS',
      detail:
        'HyperOS 1 kiểm soát chạy nền rất gắt. Tắt tối ưu pin giúp bộ hẹn giờ tự động đổi nhạc chuông không bị hệ thống đóng băng.',
      icon: '🔋',
      required: false,
      granted: batteryExempt,
      onCheck: isIgnoringBatteryOptimizations,
      onRequest: () => {
        openBatteryOptimizationSettings();
      },
    },
  ];

  const allRequired = permissions.filter(p => p.required).every(p => p.granted === true);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 22, color: Colors.textPrimary }}>←</Text>
        </TouchableOpacity>
        <Text style={Typography.h2}>Quyền truy cập</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status banner */}
        <View
          style={[
            styles.banner,
            { backgroundColor: allRequired ? 'rgba(67,198,172,0.12)' : 'rgba(255,101,132,0.12)' },
          ]}
        >
          <Text style={{ fontSize: 32 }}>{allRequired ? '✅' : '⚠️'}</Text>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={[Typography.body, { fontWeight: '700' }]}>
              {allRequired ? 'Quyền bắt buộc đã sẵn sàng' : 'Cần cấp thêm quyền'}
            </Text>
            <Text style={Typography.bodySmall}>
              {allRequired
                ? 'Trên HyperOS 1+, hãy bật thêm Autostart & Không hạn chế pin bên dưới để chạy ngầm 100% ổn định'
                : 'Nhấn vào từng mục bên dưới để thiết lập'}
            </Text>
          </View>
        </View>

        {/* Permission cards */}
        {permissions.map(perm => (
          <PermissionCard key={perm.id} item={perm} onRefresh={checkAll} />
        ))}

        {/* MIUI / HyperOS guide + quick buttons */}
        <GlassCard style={styles.miuiCard}>
          <Text style={[Typography.h3, { marginBottom: 4 }]}>
            📱 Thiết lập cho Xiaomi / HyperOS 1+
          </Text>
          {!!deviceInfo?.osVersionName && (
            <Text style={[Typography.caption, { color: Colors.accent, marginBottom: Spacing.sm }]}>
              Thiết bị hiện tại: {deviceInfo.manufacturer} {deviceInfo.model} · {deviceInfo.osVersionName} (SDK {deviceInfo.sdkInt})
            </Text>
          )}

          <MiuiStep step={1} text="Autostart (Tự khởi chạy) → Bật ON cho AutoRingtone" />
          <MiuiStep step={2} text="Tiết kiệm pin MIUI/HyperOS → Không hạn chế (No restrictions)" />
          <MiuiStep step={3} text="Quyền khác → Thay đổi cài đặt hệ thống (Modify system settings) → Cho phép" />

          <View style={styles.miuiBtnGroup}>
            <PrimaryButton
              label="🚀 Mở cài đặt Autostart (HyperOS / MIUI)"
              variant="outlined"
              onPress={openMiuiAutostartSettings}
            />
            <View style={{ height: Spacing.xs }} />
            <PrimaryButton
              label="⚡ Mở Tiết kiệm pin HyperOS / MIUI"
              variant="outlined"
              onPress={openMiuiBatterySaverSettings}
            />
          </View>

          <Text style={[Typography.caption, { marginTop: Spacing.md, color: Colors.textMuted }]}>
            * HyperOS 1 quản lý tiến trình nền chặt hơn HyperOS 3. Bật đủ Autostart + Không hạn chế pin giúp lịch tự động hoạt động xuyên suốt kể cả khi khởi động lại máy hoặc tắt mạng.
          </Text>
        </GlassCard>

        <TouchableOpacity onPress={checkAll} style={styles.refreshBtn}>
          <Text style={{ color: Colors.primary }}>↻ Kiểm tra lại quyền</Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

function PermissionCard({ item, onRefresh }: { item: PermissionItem; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(!item.granted);

  const statusColor =
    item.granted === null
      ? Colors.textMuted
      : item.granted
        ? Colors.success
        : Colors.error;

  const statusText =
    item.granted === null
      ? 'Đang kiểm tra...'
      : item.granted
        ? 'Đã cấp quyền'
        : 'Chưa cấp quyền';

  return (
    <GlassCard style={styles.permCard}>
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
        <View style={styles.permHeader}>
          <Text style={{ fontSize: 28 }}>{item.icon}</Text>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <View style={styles.permTitleRow}>
              <Text style={[Typography.body, { fontWeight: '600', flex: 1 }]}>{item.title}</Text>
              {item.required && (
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>BẮT BUỘC</Text>
                </View>
              )}
            </View>
            <Text style={Typography.bodySmall}>{item.description}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[Typography.caption, { color: statusColor }]}>{statusText}</Text>
            </View>
          </View>
          <Text style={{ color: Colors.textMuted, marginLeft: Spacing.sm }}>
            {expanded ? '▲' : '▼'}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.permExpanded}>
          <Text style={[Typography.bodySmall, { marginBottom: Spacing.md, lineHeight: 20 }]}>
            {item.detail}
          </Text>
          {!item.granted && (
            <PrimaryButton
              label="Thiết lập quyền này"
              onPress={async () => {
                await item.onRequest();
                setTimeout(onRefresh, 1500);
              }}
            />
          )}
        </View>
      )}
    </GlassCard>
  );
}

function MiuiStep({ step, text }: { step: number; text: string }) {
  return (
    <View style={styles.miuiStep}>
      <View style={styles.miuiStepNum}>
        <Text style={styles.miuiStepNumText}>{step}</Text>
      </View>
      <Text style={[Typography.bodySmall, { flex: 1, lineHeight: 20 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 52,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40 },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  permCard: { marginBottom: Spacing.md },
  permHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  permTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  requiredBadge: {
    backgroundColor: 'rgba(255,101,132,0.15)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    marginLeft: Spacing.xs,
  },
  requiredText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.error,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    marginTop: Spacing.xs,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  permExpanded: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  miuiCard: { marginBottom: Spacing.md },
  miuiStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  miuiStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  miuiStepNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  miuiBtnGroup: {
    marginTop: Spacing.md,
  },
  refreshBtn: {
    alignSelf: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
});
