import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  RefreshControl,
  Alert,
  AppState,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import {
  GlassCard,
  ToggleSwitch,
  PulseDot,
  EmptyState,
  TimeBadge,
  SectionHeader,
  LanguageToggleButton,
} from '../components/ui';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n';
import {
  checkWriteSettingsPermission,
  checkNotificationListenerPermission,
  getCurrentRingtone,
  getPostCallRotateConfig,
  setPostCallRotateConfig,
  isIgnoringBatteryOptimizations,
  setSystemRingtone,
  PostCallRotateStatus,
} from '../../modules/expo-ringtone';
import {
  isTimeInSlot,
  triggerTaskForTesting,
} from '../tasks/ringtoneScheduler';
import { TimeSlot } from '../types';

function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTimestampHHMM(ms: number): string {
  const d = new Date(ms);
  return formatTime(d.getHours(), d.getMinutes());
}

function getActiveSlot(slots: TimeSlot[]): TimeSlot | null {
  const now = new Date();
  return slots.find(slot => slot.isEnabled && isTimeInSlot(slot, now)) ?? null;
}

export default function HomeScreen() {
  const { slots, schedulerEnabled, currentRingtone, toggleScheduler, toggleSlot, loadFromStorage, setCurrentRingtone } = useStore();
  const { t } = useTranslation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [hasBatteryExemption, setHasBatteryExemption] = useState<boolean | null>(null);
  const [hasCallListenerPerm, setHasCallListenerPerm] = useState<boolean | null>(null);
  const [postCallConfig, setPostCallConfig] = useState<PostCallRotateStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const activeSlot = getActiveSlot(slots);
  const enabledSlots = slots.filter(s => s.isEnabled);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    checkStatus();

    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        checkStatus();
      }
    });
    return () => sub.remove();
  }, []);

  // Cập nhật lại nhạc chuông hiển thị mỗi khi load/đổi lịch hoặc bật/tắt slot
  useEffect(() => {
    checkStatus();
  }, [schedulerEnabled, slots.length]);

  const checkStatus = async () => {
    const [perm, battery, ringtone, callListener, postCall] = await Promise.all([
      checkWriteSettingsPermission().catch(() => false),
      isIgnoringBatteryOptimizations().catch(() => false),
      getCurrentRingtone().catch(() => null),
      checkNotificationListenerPermission().catch(() => false),
      getPostCallRotateConfig().catch(() => null),
    ]);
    setHasPermission(perm);
    setHasBatteryExemption(battery);
    setHasCallListenerPerm(callListener);
    if (postCall) setPostCallConfig(postCall);
    if (ringtone) setCurrentRingtone(ringtone);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFromStorage(), checkStatus()]);
    setRefreshing(false);
  };

  const handleToggleScheduler = async () => {
    await toggleScheduler();
    await checkStatus();
  };

  const handleTogglePostCallRotate = async () => {
    const currentEnabled = postCallConfig?.enabled ?? true;
    const delayMinutes = postCallConfig?.delayMinutes ?? 2;
    const updated = await setPostCallRotateConfig(!currentEnabled, delayMinutes).catch(() => null);
    if (updated) {
      setPostCallConfig(updated);
    }
  };

  const handleTestRandomRingtone = async () => {
    // 1. Kiểm tra quyền WRITE_SETTINGS
    const hasPerm = await checkWriteSettingsPermission();
    if (!hasPerm) {
      Alert.alert(
        t.home.alertPermTitle,
        t.home.alertPermMsg,
        [
          { text: t.common.cancel, style: 'cancel' },
          { text: t.common.setup, onPress: () => router.push('/permissions') },
        ]
      );
      return;
    }

    // 2. Tìm slot test
    let targetSlot = activeSlot;
    let isCurrentlyActive = true;
    if (!targetSlot) {
      // Nếu không có slot nào đang chạy, tìm slot bật bất kỳ có bài hát
      targetSlot = slots.find(s => s.isEnabled && s.playlist.length > 0) || null;
      isCurrentlyActive = false;
    }

    if (!targetSlot || targetSlot.playlist.length === 0) {
      Alert.alert(
        t.home.alertCannotTestTitle,
        t.home.alertCannotTestMsg
      );
      return;
    }

    // 3. Chọn ngẫu nhiên bài hát
    const songs = targetSlot.playlist;
    const chosenSong = songs[Math.floor(Math.random() * songs.length)];
    if (!chosenSong) return;

    // 4. Gọi setSystemRingtone
    try {
      console.log('[HomeScreen Test] Chosen song:', chosenSong.title, 'URI:', chosenSong.uri);
      const success = await setSystemRingtone(chosenSong.uri, chosenSong.title);
      console.log('[HomeScreen Test] setSystemRingtone result:', success);

      if (success) {
        // Lấy lại nhạc chuông hệ thống thực tế để đồng bộ giao diện
        const updated = await getCurrentRingtone();
        console.log('[HomeScreen Test] Current ringtone after update:', updated);
        if (updated) {
          setCurrentRingtone(updated);
        } else {
          setCurrentRingtone({ title: chosenSong.title, uri: chosenSong.uri });
        }
        
        Alert.alert(
          t.common.successTitle,
          t.home.alertTestSuccessMsg(targetSlot.label, isCurrentlyActive, chosenSong.title)
        );
      } else {
        console.warn('[HomeScreen Test] setSystemRingtone returned false');
        Alert.alert(
          t.common.failedTitle,
          t.home.alertTestFailedMsg
        );
      }
    } catch (e: any) {
      console.error('[HomeScreen Test] Error setting ringtone:', e);
      Alert.alert(t.common.errorTitle, t.home.alertErrorMsg(String(e?.message || e)));
    }
  };

  const displayRingtoneTitle =
    currentRingtone?.title === 'Nhạc chuông hệ thống'
      ? t.home.systemRingtoneDefault
      : (currentRingtone?.title ?? t.common.unknown);

  const postCallEnabled = postCallConfig?.enabled ?? true;
  const hasPendingPostCall =
    schedulerEnabled &&
    postCallEnabled &&
    !!postCallConfig?.pendingRotateAtMs &&
    postCallConfig.pendingRotateAtMs > Date.now();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* ── Header ── */}
        <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
          <View style={{ flex: 1, paddingRight: Spacing.sm }}>
            <Text style={Typography.h1}>AutoRingtone</Text>
            <Text style={[Typography.bodySmall, { marginTop: 2 }]}>
              {t.home.subtitle}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <LanguageToggleButton />
            <TouchableOpacity
              onPress={() => router.push('/permissions')}
              style={styles.settingsBtn}
            >
              <Text style={{ fontSize: 22 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Permission Warning ── */}
        {hasPermission === false && (
          <TouchableOpacity onPress={() => router.push('/permissions')} activeOpacity={0.8}>
            <View style={styles.warningCard}>
              <Text style={{ fontSize: 20 }}>⚠️</Text>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={[Typography.body, { fontWeight: '600' }]}>
                  {t.home.permWarningTitle}
                </Text>
                <Text style={Typography.bodySmall}>
                  {t.home.permWarningSub}
                </Text>
              </View>
              <Text style={{ color: Colors.textSecondary }}>›</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Scheduler Toggle Card ── */}
        <GlassCard style={styles.schedulerCard}>
          <View style={styles.schedulerRow}>
            <View>
              <Text style={Typography.h3}>{t.home.schedulerTitle}</Text>
              <View style={styles.statusRow}>
                {schedulerEnabled && <PulseDot color={Colors.success} />}
                <Text style={[Typography.bodySmall, { marginLeft: schedulerEnabled ? 6 : 0 }]}>
                  {schedulerEnabled ? t.home.schedulerRunning : t.home.schedulerStopped}
                  {schedulerEnabled && enabledSlots.length > 0
                    ? t.home.activeSlotsCount(enabledSlots.length)
                    : ''}
                </Text>
              </View>
            </View>
            <ToggleSwitch
              value={schedulerEnabled}
              onToggle={handleToggleScheduler}
            />
          </View>

          {/* Active slot info */}
          {schedulerEnabled && activeSlot && (
            <View style={styles.activeSlotBadge}>
              <View style={[styles.activeSlotDot, { backgroundColor: activeSlot.color }]} />
              <Text style={Typography.bodySmall}>
                {t.home.activeSlotPrefix}
                <Text style={{ color: activeSlot.color, fontWeight: '600' }}>
                  {activeSlot.label}
                </Text>
                {' '}({formatTime(activeSlot.startHour, activeSlot.startMinute)} – {formatTime(activeSlot.endHour, activeSlot.endMinute)})
              </Text>
            </View>
          )}

          {/* ── Post-Call 5-Minute Rotation Option ── */}
          <View style={styles.postCallSection}>
            <View style={styles.postCallHeaderRow}>
              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                <Text style={[Typography.body, { fontWeight: '600', fontSize: 14.5 }]}>
                  {t.home.postCallTitle}
                </Text>
                <Text style={[Typography.caption, { marginTop: 3, lineHeight: 16 }]}>
                  {t.home.postCallDesc}
                </Text>
              </View>
              <ToggleSwitch
                value={postCallEnabled}
                onToggle={handleTogglePostCallRotate}
                activeColor={Colors.accentGreen}
              />
            </View>

            {hasPendingPostCall && postCallConfig && (
              <View style={styles.pendingCallBadge}>
                <Text style={styles.pendingCallText}>
                  {t.home.postCallPendingBadge(
                    postCallConfig.lastCallSource,
                    formatTimestampHHMM(postCallConfig.pendingRotateAtMs)
                  )}
                </Text>
              </View>
            )}

            {postCallEnabled && hasCallListenerPerm === false && (
              <TouchableOpacity
                onPress={() => router.push('/permissions')}
                style={styles.callPermHintBtn}
              >
                <Text style={styles.callPermHintText}>{t.home.postCallNeedPermBtn}</Text>
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>

        {/* ── Current Ringtone ── */}
        <GlassCard style={styles.ringtoneCard}>
          <SectionHeader
            title={t.home.currentRingtoneHeader}
            action={
              <TouchableOpacity
                onPress={handleTestRandomRingtone}
                style={styles.testBtn}
              >
                <Text style={styles.testBtnText}>{t.home.testRandomBtn}</Text>
              </TouchableOpacity>
            }
          />
          <View style={styles.ringtoneInfo}>
            <Text style={{ fontSize: 32 }}>🎵</Text>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={Typography.body} numberOfLines={1}>
                {displayRingtoneTitle}
              </Text>
              <Text style={Typography.bodySmall} numberOfLines={1}>
                {currentRingtone?.uri ? t.home.audioFileSub : t.common.notSet}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* ── Time Slots ── */}
        <View style={styles.slotsSection}>
          <SectionHeader
            title={t.home.slotsHeader(slots.length)}
            action={
              <TouchableOpacity
                onPress={() => router.push('/add-slot')}
                style={styles.addBtn}
              >
                <Text style={styles.addBtnText}>{t.home.addBtn}</Text>
              </TouchableOpacity>
            }
          />

          {slots.length === 0 ? (
            <EmptyState
              emoji="🕐"
              title={t.home.emptySlotsTitle}
              subtitle={t.home.emptySlotsSub}
            />
          ) : (
            slots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                isActive={activeSlot?.id === slot.id}
                onToggle={() => toggleSlot(slot.id)}
                onPress={() => router.push({ pathname: '/add-slot', params: { slotId: slot.id } })}
              />
            ))
          )}
        </View>

        {/* ── Dev Tools ── */}
        {__DEV__ && (
          <TouchableOpacity onPress={triggerTaskForTesting} style={styles.devBtn}>
            <Text style={styles.devBtnText}>{t.home.devTriggerBtn}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

// ─── Slot Card Component ──────────────────────────────────────────────────────
function SlotCard({
  slot,
  isActive,
  onToggle,
  onPress,
}: {
  slot: TimeSlot;
  isActive: boolean;
  onToggle: () => void;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.slotCard, isActive && styles.slotCardActive]}>
        {/* Color accent bar */}
        <View style={[styles.slotAccentBar, { backgroundColor: slot.color }]} />

        <View style={styles.slotContent}>
          <View style={styles.slotTop}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.body, { fontWeight: '600' }]} numberOfLines={1}>
                {slot.label}
              </Text>
              <View style={styles.slotTimes}>
                <TimeBadge hour={slot.startHour} minute={slot.startMinute} />
                <Text style={[Typography.bodySmall, { marginHorizontal: Spacing.xs }]}>→</Text>
                <TimeBadge hour={slot.endHour} minute={slot.endMinute} />
                {isActive && (
                  <View style={styles.activeLabel}>
                    <PulseDot color={slot.color} />
                    <Text style={[Typography.caption, { marginLeft: 4, color: slot.color }]}>
                      {t.home.slotActiveBadge}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <ToggleSwitch value={slot.isEnabled} onToggle={onToggle} activeColor={slot.color} />
          </View>

          <View style={styles.slotBottom}>
            {(() => {
              const autoRotate = slot.autoRotate !== false;
              const interval = autoRotate ? (slot.changeIntervalMinutes ?? 60) : 0;
              let intervalText: string = t.home.intervalOneHour;
              if (!autoRotate || interval === 0) {
                intervalText = t.home.intervalOnce;
              } else if (interval === 60) {
                intervalText = t.home.intervalOneHour;
              } else if (interval >= 60 && interval % 60 === 0) {
                intervalText = t.home.intervalHours(interval / 60);
              } else {
                intervalText = t.home.intervalMinutes(interval);
              }
              return (
                <Text style={Typography.bodySmall}>
                  {t.home.slotSummary(slot.playlist.length, intervalText)}
                </Text>
              );
            })()}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: 56 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  settingsBtn: {
    padding: Spacing.sm,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247,151,30,0.12)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(247,151,30,0.3)',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  schedulerCard: { marginBottom: Spacing.md },
  schedulerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  activeSlotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  activeSlotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  postCallSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  postCallHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingCallBadge: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(67,198,172,0.14)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(67,198,172,0.35)',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
  },
  pendingCallText: {
    color: Colors.accentGreen,
    fontSize: 12,
    fontWeight: '600',
  },
  callPermHintBtn: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(247,151,30,0.12)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(247,151,30,0.3)',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
  },
  callPermHintText: {
    color: Colors.accentOrange,
    fontSize: 12,
    fontWeight: '600',
  },
  ringtoneCard: { marginBottom: Spacing.md },
  ringtoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  slotsSection: { marginBottom: Spacing.md },
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  addBtnText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  // Slot card
  slotCard: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  slotCardActive: {
    borderColor: 'rgba(108,99,255,0.4)',
  },
  slotAccentBar: {
    width: 4,
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  slotContent: { flex: 1, padding: Spacing.md },
  slotTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  slotTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  activeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  slotBottom: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  devBtn: {
    alignSelf: 'center',
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCardAlt,
  },
  devBtnText: { color: Colors.textMuted, fontSize: 13 },
  testBtn: {
    borderColor: Colors.accent,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  testBtnText: {
    ...Typography.bodySmall,
    color: Colors.accent,
    fontWeight: '600',
  },
});
