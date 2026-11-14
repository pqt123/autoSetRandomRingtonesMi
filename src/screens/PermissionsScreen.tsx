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
import { GlassCard, PrimaryButton, LanguageToggleButton } from '../components/ui';
import { useTranslation } from '../i18n';
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
  const { t } = useTranslation();
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
      title: t.permissions.writeSettingsTitle,
      description: t.permissions.writeSettingsDesc,
      detail: t.permissions.writeSettingsDetail,
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
      title: t.permissions.audioReadTitle,
      description: t.permissions.audioReadDesc,
      detail: t.permissions.audioReadDetail,
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
            title: t.permissions.exactAlarmTitle,
            description: t.permissions.exactAlarmDesc,
            detail: t.permissions.exactAlarmDetail,
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
      title: t.permissions.batteryTitle,
      description: t.permissions.batteryDesc,
      detail: t.permissions.batteryDetail,
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
        <Text style={Typography.h2}>{t.permissions.header}</Text>
        <LanguageToggleButton />
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
              {allRequired ? t.permissions.bannerReadyTitle : t.permissions.bannerNeededTitle}
            </Text>
            <Text style={Typography.bodySmall}>
              {allRequired
                ? t.permissions.bannerReadySub
                : t.permissions.bannerNeededSub}
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
            {t.permissions.miuiHeader}
          </Text>
          {!!deviceInfo?.osVersionName && (
            <Text style={[Typography.caption, { color: Colors.accent, marginBottom: Spacing.sm }]}>
              {t.permissions.currentDevicePrefix} {deviceInfo.manufacturer} {deviceInfo.model} · {deviceInfo.osVersionName} (SDK {deviceInfo.sdkInt})
            </Text>
          )}

          <MiuiStep step={1} text={t.permissions.miuiStep1} />
          <MiuiStep step={2} text={t.permissions.miuiStep2} />
          <MiuiStep step={3} text={t.permissions.miuiStep3} />

          <View style={styles.miuiBtnGroup}>
            <PrimaryButton
              label={t.permissions.openAutostartBtn}
              variant="outlined"
              onPress={openMiuiAutostartSettings}
            />
            <View style={{ height: Spacing.xs }} />
            <PrimaryButton
              label={t.permissions.openBatteryBtn}
              variant="outlined"
              onPress={openMiuiBatterySaverSettings}
            />
          </View>

          <Text style={[Typography.caption, { marginTop: Spacing.md, color: Colors.textMuted }]}>
            {t.permissions.miuiFootnote}
          </Text>
        </GlassCard>

        <TouchableOpacity onPress={checkAll} style={styles.refreshBtn}>
          <Text style={{ color: Colors.primary }}>{t.permissions.recheckBtn}</Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

function PermissionCard({ item, onRefresh }: { item: PermissionItem; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(!item.granted);

  const statusColor =
    item.granted === null
      ? Colors.textMuted
      : item.granted
        ? Colors.success
        : Colors.error;

  const statusText =
    item.granted === null
      ? t.permissions.statusChecking
      : item.granted
        ? t.permissions.statusGranted
        : t.permissions.statusDenied;

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
                  <Text style={styles.requiredText}>{t.permissions.requiredBadge}</Text>
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
              label={t.permissions.setupPermBtn}
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
