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
} from '../components/ui';
import { useStore } from '../store/useStore';
import {
  checkWriteSettingsPermission,
  getCurrentRingtone,
  isIgnoringBatteryOptimizations,
} from '../../modules/expo-ringtone';
import {
  registerSchedulerTask,
  unregisterSchedulerTask,
  triggerTaskForTesting,
} from '../tasks/ringtoneScheduler';
import { TimeSlot } from '../types';

function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getActiveSlot(slots: TimeSlot[]): TimeSlot | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return slots.find(slot => {
    if (!slot.isEnabled) return false;
    const start = slot.startHour * 60 + slot.startMinute;
    const end = slot.endHour * 60 + slot.endMinute;
    if (start <= end) return currentMinutes >= start && currentMinutes < end;
    return currentMinutes >= start || currentMinutes < end;
  }) ?? null;
}

export default function HomeScreen() {
  const { slots, schedulerEnabled, currentRingtone, toggleScheduler, toggleSlot, loadFromStorage, setCurrentRingtone } = useStore();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [hasBatteryExemption, setHasBatteryExemption] = useState<boolean | null>(null);
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
  }, []);

  const checkStatus = async () => {
    const [perm, battery, ringtone] = await Promise.all([
      checkWriteSettingsPermission(),
      isIgnoringBatteryOptimizations(),
      getCurrentRingtone(),
    ]);
    setHasPermission(perm);
    setHasBatteryExemption(battery);
    if (ringtone) setCurrentRingtone(ringtone);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFromStorage(), checkStatus()]);
    setRefreshing(false);
  };

  const handleToggleScheduler = async () => {
    await toggleScheduler();
    if (!schedulerEnabled) {
      await registerSchedulerTask();
    } else {
      await unregisterSchedulerTask();
    }
  };

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
          <View>
            <Text style={Typography.h1}>AutoRingtone</Text>
            <Text style={[Typography.bodySmall, { marginTop: 2 }]}>
              Tự động đổi nhạc chuông theo khung giờ
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/permissions')}
            style={styles.settingsBtn}
          >
            <Text style={{ fontSize: 22 }}>⚙️</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Permission Warning ── */}
        {hasPermission === false && (
          <TouchableOpacity onPress={() => router.push('/permissions')} activeOpacity={0.8}>
            <View style={styles.warningCard}>
              <Text style={{ fontSize: 20 }}>⚠️</Text>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={[Typography.body, { fontWeight: '600' }]}>
                  Chưa cấp quyền
                </Text>
                <Text style={Typography.bodySmall}>
                  Nhấn để thiết lập quyền cần thiết
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
              <Text style={Typography.h3}>Lên lịch tự động</Text>
              <View style={styles.statusRow}>
                {schedulerEnabled && <PulseDot color={Colors.success} />}
                <Text style={[Typography.bodySmall, { marginLeft: schedulerEnabled ? 6 : 0 }]}>
                  {schedulerEnabled ? 'Đang chạy' : 'Đã tắt'}
                  {schedulerEnabled && enabledSlots.length > 0
                    ? ` · ${enabledSlots.length} slot active`
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
                Slot đang chạy:{' '}
                <Text style={{ color: activeSlot.color, fontWeight: '600' }}>
                  {activeSlot.label}
                </Text>
                {' '}({formatTime(activeSlot.startHour, activeSlot.startMinute)} – {formatTime(activeSlot.endHour, activeSlot.endMinute)})
              </Text>
            </View>
          )}
        </GlassCard>

        {/* ── Current Ringtone ── */}
        <GlassCard style={styles.ringtoneCard}>
          <SectionHeader title="Nhạc chuông hiện tại" />
          <View style={styles.ringtoneInfo}>
            <Text style={{ fontSize: 32 }}>🎵</Text>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={Typography.body} numberOfLines={1}>
                {currentRingtone?.title ?? 'Không xác định'}
              </Text>
              <Text style={Typography.bodySmall} numberOfLines={1}>
                {currentRingtone?.uri ? 'File âm thanh' : 'Chưa thiết lập'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* ── Time Slots ── */}
        <View style={styles.slotsSection}>
          <SectionHeader
            title={`Khung giờ (${slots.length})`}
            action={
              <TouchableOpacity
                onPress={() => router.push('/add-slot')}
                style={styles.addBtn}
              >
                <Text style={styles.addBtnText}>＋ Thêm</Text>
              </TouchableOpacity>
            }
          />

          {slots.length === 0 ? (
            <EmptyState
              emoji="🕐"
              title="Chưa có khung giờ nào"
              subtitle="Nhấn '+ Thêm' để tạo khung giờ đầu tiên với playlist nhạc riêng"
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
            <Text style={styles.devBtnText}>🛠 [DEV] Trigger Task ngay</Text>
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
                    <Text style={[Typography.caption, { marginLeft: 4, color: slot.color }]}>Active</Text>
                  </View>
                )}
              </View>
            </View>
            <ToggleSwitch value={slot.isEnabled} onToggle={onToggle} activeColor={slot.color} />
          </View>

          <View style={styles.slotBottom}>
            <Text style={Typography.bodySmall}>
              🎵 {slot.playlist.length} bài · random mỗi lần
            </Text>
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
});
