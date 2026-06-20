import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { GlassCard, PrimaryButton } from '../components/ui';
import {
  checkWriteSettingsPermission,
  openWriteSettingsScreen,
  isIgnoringBatteryOptimizations,
  openBatteryOptimizationSettings,
} from '../../modules/expo-ringtone';

interface PermissionItem {
  id: string;
  title: string;
  description: string;
  detail: string;
  icon: string;
  required: boolean;
  granted: boolean | null;
  onRequest: () => void;
  onCheck: () => Promise<boolean>;
}

export default function PermissionsScreen() {
  const [writeSettings, setWriteSettings] = useState<boolean | null>(null);
  const [batteryExempt, setBatteryExempt] = useState<boolean | null>(null);

  useEffect(() => {
    checkAll();
  }, []);

  const checkAll = async () => {
    const [ws, be] = await Promise.all([
      checkWriteSettingsPermission(),
      isIgnoringBatteryOptimizations(),
    ]);
    setWriteSettings(ws);
    setBatteryExempt(be);
  };

  const permissions: PermissionItem[] = [
    {
      id: 'write_settings',
      title: 'Sửa cài đặt hệ thống',
      description: 'Cần thiết để thay đổi nhạc chuông',
      detail: 'Trên Android, thay đổi ringtone yêu cầu quyền đặc biệt "Modify system settings". Bạn cần bật thủ công trong Settings.',
      icon: '🔔',
      required: true,
      granted: writeSettings,
      onCheck: checkWriteSettingsPermission,
      onRequest: () => {
        openWriteSettingsScreen();
        setTimeout(async () => setWriteSettings(await checkWriteSettingsPermission()), 2000);
      },
    },
    {
      id: 'battery',
      title: 'Tắt tối ưu pin (Battery)',
      description: 'Đặc biệt quan trọng trên MIUI/Xiaomi',
      detail: 'Android có thể ngắt app chạy nền để tiết kiệm pin. Tắt tối ưu pin cho AutoRingtone giúp lịch nhạc chuông hoạt động đúng giờ.',
      icon: '🔋',
      required: false,
      granted: batteryExempt,
      onCheck: isIgnoringBatteryOptimizations,
      onRequest: () => {
        openBatteryOptimizationSettings();
        setTimeout(async () => setBatteryExempt(await isIgnoringBatteryOptimizations()), 2000);
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
          <Text style={{ fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={Typography.h2}>Quyền truy cập</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Status banner */}
        <View style={[styles.banner, { backgroundColor: allRequired ? 'rgba(67,198,172,0.12)' : 'rgba(255,101,132,0.12)' }]}>
          <Text style={{ fontSize: 32 }}>{allRequired ? '✅' : '⚠️'}</Text>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={[Typography.body, { fontWeight: '700' }]}>
              {allRequired ? 'Tất cả quyền đã được cấp' : 'Cần cấp thêm quyền'}
            </Text>
            <Text style={Typography.bodySmall}>
              {allRequired
                ? 'App sẵn sàng tự động đổi nhạc chuông'
                : 'Nhấn vào từng mục bên dưới để thiết lập'}
            </Text>
          </View>
        </View>

        {/* Permission cards */}
        {permissions.map(perm => (
          <PermissionCard key={perm.id} item={perm} onRefresh={checkAll} />
        ))}

        {/* MIUI guide */}
        <GlassCard style={styles.miuiCard}>
          <Text style={[Typography.h3, { marginBottom: Spacing.sm }]}>
            📱 Hướng dẫn cho Xiaomi / MIUI
          </Text>
          <MiuiStep step={1} text='Vào Settings → Apps → Manage apps → AutoRingtone' />
          <MiuiStep step={2} text='Battery saver → No restrictions' />
          <MiuiStep step={3} text='Autostart → Bật ON' />
          <MiuiStep step={4} text='Permissions → Modify system settings → Bật ON' />
          <Text style={[Typography.caption, { marginTop: Spacing.md, color: Colors.textMuted }]}>
            * MIUI (HyperOS) có thể kill background apps mạnh hơn Android thuần. Các bước trên giúp app hoạt động ổn định.
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
  const [expanded, setExpanded] = useState(false);

  const statusColor = item.granted === null
    ? Colors.textMuted
    : item.granted
      ? Colors.success
      : Colors.error;

  const statusText = item.granted === null
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
              label="Mở Settings để cấp quyền"
              onPress={() => { item.onRequest(); setTimeout(onRefresh, 2500); }}
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
  refreshBtn: {
    alignSelf: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
});
