import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import {
  GlassCard,
  PrimaryButton,
  SectionHeader,
  EmptyState,
} from '../components/ui';
import {
  checkWriteSettingsPermission,
  getCurrentNotificationSound,
  getSystemNotificationTones,
  persistAudioFile,
  previewSound,
  setSystemNotificationSound,
  stopPreviewSound,
  NotificationApplyMode,
} from '../../modules/expo-ringtone';
import { RingtoneInfo } from '../types';

const SAVED_NOTIF_TONES_KEY = '@autoringtone_notif_tones';
const NOTIF_MODE_KEY = '@autoringtone_notif_apply_mode';

const APPLY_MODES: { id: NotificationApplyMode; label: string; desc: string }[] = [
  {
    id: 'both',
    label: '🔔 + 💬 Cả hai',
    desc: 'Áp dụng cho cả âm thông báo mặc định Android & chuông tin nhắn SMS (hỗ trợ cả 2 SIM trên Xiaomi/HyperOS).',
  },
  {
    id: 'notification',
    label: '🔔 Thông báo',
    desc: 'Chỉ thay đổi âm thông báo mặc định của hệ thống Android.',
  },
  {
    id: 'sms',
    label: '💬 Tin nhắn SMS',
    desc: 'Ưu tiên đổi chuông tin nhắn SMS trên Xiaomi/HyperOS (trên Android thuần dùng chung âm thông báo).',
  },
];

export default function NotificationSoundScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentSound, setCurrentSound] = useState<RingtoneInfo | null>(null);
  const [savedTones, setSavedTones] = useState<RingtoneInfo[]>([]);
  const [systemTones, setSystemTones] = useState<RingtoneInfo[]>([]);
  const [showSystemTones, setShowSystemTones] = useState(false);
  const [systemSearch, setSystemSearch] = useState('');
  const [applyMode, setApplyMode] = useState<NotificationApplyMode>('both');
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const [applyingUri, setApplyingUri] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    loadInitialData();

    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refreshSystemState();
      } else {
        handleStopPreview();
      }
    });

    return () => {
      sub.remove();
      stopPreviewSound();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSystemState();
      return () => {
        stopPreviewSound();
        setPlayingUri(null);
      };
    }, [])
  );

  const loadInitialData = async () => {
    try {
      const [tonesJson, modeSaved] = await Promise.all([
        AsyncStorage.getItem(SAVED_NOTIF_TONES_KEY),
        AsyncStorage.getItem(NOTIF_MODE_KEY),
      ]);
      if (tonesJson) {
        setSavedTones(JSON.parse(tonesJson));
      }
      if (modeSaved === 'both' || modeSaved === 'notification' || modeSaved === 'sms') {
        setApplyMode(modeSaved);
      }
    } catch (e) {
      console.warn('[NotificationSoundScreen] loadInitialData warning:', e);
    }
    await refreshSystemState();
  };

  const refreshSystemState = async () => {
    const [perm, cur] = await Promise.all([
      checkWriteSettingsPermission().catch(() => false),
      getCurrentNotificationSound().catch(() => null),
    ]);
    setHasPermission(perm);
    if (cur) setCurrentSound(cur);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    if (showSystemTones) {
      const sys = await getSystemNotificationTones().catch(() => []);
      setSystemTones(sys);
    }
    setRefreshing(false);
  };

  const handleSelectMode = async (mode: NotificationApplyMode) => {
    setApplyMode(mode);
    await AsyncStorage.setItem(NOTIF_MODE_KEY, mode).catch(() => {});
  };

  const ensureWritePermission = async (): Promise<boolean> => {
    const perm = await checkWriteSettingsPermission().catch(() => false);
    setHasPermission(perm);
    if (!perm) {
      Alert.alert(
        'Yêu cầu quyền',
        'Ứng dụng cần quyền thay đổi cài đặt hệ thống (Modify system settings) để đổi chuông thông báo / tin nhắn.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Thiết lập', onPress: () => router.push('/permissions') },
        ]
      );
      return false;
    }
    return true;
  };

  const handleTogglePreview = async (uri: string) => {
    if (playingUri === uri) {
      handleStopPreview();
      return;
    }
    const ok = await previewSound(uri).catch(() => false);
    if (ok) {
      setPlayingUri(uri);
    } else {
      setPlayingUri(null);
      Alert.alert('Không thể phát', 'Không đọc được file âm thanh này để nghe thử.');
    }
  };

  const handleStopPreview = () => {
    stopPreviewSound();
    setPlayingUri(null);
  };

  const applyNotificationTone = async (tone: RingtoneInfo, showAlert: boolean = true) => {
    handleStopPreview();
    if (!(await ensureWritePermission())) return;

    setApplyingUri(tone.uri);
    try {
      const ok = await setSystemNotificationSound(tone.uri, tone.title, applyMode);
      if (ok) {
        const updated = await getCurrentNotificationSound().catch(() => null);
        setCurrentSound(updated ?? { title: tone.title, uri: tone.uri });
        if (showAlert) {
          const targetText =
            applyMode === 'both'
              ? 'Thông báo & Tin nhắn SMS'
              : applyMode === 'sms'
                ? 'Tin nhắn SMS'
                : 'Thông báo hệ thống';
          Alert.alert('Đã áp dụng', `Đã đặt âm báo (${targetText}):\n🔔 ${tone.title}`);
        }
      } else {
        Alert.alert(
          'Thất bại',
          'Không thể cập nhật âm thông báo. Vui lòng kiểm tra quyền truy cập hoặc chọn lại file âm thanh.'
        );
      }
    } catch (e: any) {
      Alert.alert('Lỗi', `Có lỗi xảy ra: ${e?.message || e}`);
    } finally {
      setApplyingUri(null);
    }
  };

  const saveUpdatedTones = async (nextList: RingtoneInfo[]) => {
    setSavedTones(nextList);
    await AsyncStorage.setItem(SAVED_NOTIF_TONES_KEY, JSON.stringify(nextList)).catch(() => {});
  };

  const handlePickAndApplyNow = async () => {
    handleStopPreview();
    if (!(await ensureWritePermission())) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets.length) return;

      const asset = result.assets[0];
      const persistedUri = await persistAudioFile(asset.uri, asset.name);
      const cleanTitle = asset.name.replace(/\.[^.]+$/, '');
      const newTone: RingtoneInfo = {
        title: cleanTitle,
        uri: persistedUri,
        duration: asset.size,
      };

      // Lưu luôn vào danh sách của tôi để lần sau chọn lại 1 chạm
      const exists = savedTones.some(t => t.uri === newTone.uri || t.title === newTone.title);
      if (!exists) {
        await saveUpdatedTones([newTone, ...savedTones]);
      }

      await applyNotificationTone(newTone, true);
    } catch {
      Alert.alert('Lỗi', 'Không thể chọn file âm báo từ bộ nhớ.');
    }
  };

  const handleAddMultipleToLibrary = async () => {
    handleStopPreview();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets.length) return;

      const imported: RingtoneInfo[] = await Promise.all(
        result.assets.map(async asset => {
          const persistedUri = await persistAudioFile(asset.uri, asset.name);
          return {
            title: asset.name.replace(/\.[^.]+$/, ''),
            uri: persistedUri,
            duration: asset.size,
          };
        })
      );

      const existingUris = new Set(savedTones.map(t => t.uri));
      const unique = imported.filter(t => !existingUris.has(t.uri));
      if (unique.length > 0) {
        await saveUpdatedTones([...unique, ...savedTones]);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể thêm file âm thanh vào thư viện.');
    }
  };

  const handleRemoveSavedTone = (uri: string) => {
    if (playingUri === uri) handleStopPreview();
    const next = savedTones.filter(t => t.uri !== uri);
    saveUpdatedTones(next);
  };

  const handleRandomNotificationTone = async () => {
    if (savedTones.length === 0) {
      Alert.alert(
        'Chưa có âm báo',
        'Hãy thêm ít nhất 1 file âm báo vào "Thư viện âm báo của tôi" trước khi Random.'
      );
      return;
    }
    let pool = savedTones;
    if (pool.length > 1 && currentSound?.title) {
      const filtered = pool.filter(t => t.title !== currentSound.title);
      if (filtered.length > 0) pool = filtered;
    }
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    if (chosen) {
      await applyNotificationTone(chosen, true);
    }
  };

  const handleToggleSystemTones = async () => {
    const next = !showSystemTones;
    setShowSystemTones(next);
    if (next && systemTones.length === 0) {
      const tones = await getSystemNotificationTones().catch(() => []);
      setSystemTones(tones);
    }
  };

  const isToneCurrentlyActive = (tone: RingtoneInfo): boolean => {
    if (!currentSound) return false;
    return (
      currentSound.uri === tone.uri ||
      currentSound.title.trim().toLowerCase() === tone.title.trim().toLowerCase()
    );
  };

  const filteredSystemTones = systemSearch.trim()
    ? systemTones.filter(t => t.title.toLowerCase().includes(systemSearch.trim().toLowerCase()))
    : systemTones;

  const activeModeInfo = APPLY_MODES.find(m => m.id === applyMode) ?? APPLY_MODES[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accentGreen}
          />
        }
      >
        {/* ── Header ── */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={Typography.h1}>Âm thông báo</Text>
            <Text style={[Typography.bodySmall, { marginTop: 2 }]}>
              Đổi chuông tin nhắn SMS & thông báo ngay trong app
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              handleStopPreview();
              router.push('/permissions');
            }}
            style={styles.settingsBtn}
          >
            <Text style={{ fontSize: 22 }}>⚙️</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Permission Warning ── */}
        {hasPermission === false && (
          <TouchableOpacity
            onPress={() => {
              handleStopPreview();
              router.push('/permissions');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.warningCard}>
              <Text style={{ fontSize: 20 }}>⚠️</Text>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={[Typography.body, { fontWeight: '600' }]}>Chưa cấp quyền hệ thống</Text>
                <Text style={Typography.bodySmall}>
                  Nhấn để bật quyền sửa cài đặt hệ thống trước khi đổi âm báo
                </Text>
              </View>
              <Text style={{ color: Colors.textSecondary }}>›</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Current Notification Sound ── */}
        <GlassCard style={styles.card}>
          <SectionHeader
            title="Âm báo đang dùng"
            action={
              <View style={styles.headerActions}>
                {currentSound?.uri ? (
                  <TouchableOpacity
                    onPress={() => handleTogglePreview(currentSound.uri)}
                    style={styles.previewCurrentBtn}
                  >
                    <Text style={styles.previewCurrentText}>
                      {playingUri === currentSound.uri ? '⏹ Dừng' : '🔊 Nghe'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={handleRandomNotificationTone} style={styles.randomBtn}>
                  <Text style={styles.randomBtnText}>🎲 Random</Text>
                </TouchableOpacity>
              </View>
            }
          />
          <View style={styles.currentInfo}>
            <Text style={{ fontSize: 32 }}>🔔</Text>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={[Typography.body, { fontWeight: '600' }]} numberOfLines={1}>
                {currentSound?.title ?? 'Không xác định'}
              </Text>
              <Text style={Typography.bodySmall} numberOfLines={1}>
                {currentSound?.uri ? 'Đang áp dụng trên thiết bị' : 'Chưa thiết lập'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* ── Target Mode Selector ── */}
        <GlassCard style={styles.card}>
          <SectionHeader title="Phạm vi áp dụng" />
          <View style={styles.modeRow}>
            {APPLY_MODES.map(mode => {
              const selected = applyMode === mode.id;
              return (
                <TouchableOpacity
                  key={mode.id}
                  onPress={() => handleSelectMode(mode.id)}
                  style={[styles.modeChip, selected && styles.modeChipSelected]}
                >
                  <Text style={[styles.modeChipText, selected && styles.modeChipTextSelected]}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[Typography.caption, { marginTop: Spacing.sm, lineHeight: 17 }]}>
            {activeModeInfo.desc}
          </Text>
        </GlassCard>

        {/* ── Pick & Saved Library ── */}
        <GlassCard style={styles.card}>
          <SectionHeader
            title={`Thư viện âm báo của tôi (${savedTones.length})`}
            subtitle="Chọn file mp3 / m4a / ogg / wav từ máy"
          />

          <PrimaryButton
            label="⚡ Chọn file từ máy & Đặt ngay"
            onPress={handlePickAndApplyNow}
            style={{ marginTop: Spacing.xs }}
          />
          <PrimaryButton
            label="＋ Thêm nhiều âm báo vào thư viện"
            onPress={handleAddMultipleToLibrary}
            variant="outlined"
            style={{ marginTop: Spacing.sm, marginBottom: Spacing.md }}
          />

          {savedTones.length === 0 ? (
            <EmptyState
              emoji="💬"
              title="Chưa có âm báo riêng"
              subtitle="Nhấn nút ở trên để chọn âm báo tin nhắn / thông báo yêu thích từ bộ nhớ máy"
            />
          ) : (
            savedTones.map(tone => {
              const active = isToneCurrentlyActive(tone);
              const isPlaying = playingUri === tone.uri;
              const isApplying = applyingUri === tone.uri;
              return (
                <ToneItemRow
                  key={tone.uri}
                  tone={tone}
                  active={active}
                  isPlaying={isPlaying}
                  isApplying={isApplying}
                  onPreview={() => handleTogglePreview(tone.uri)}
                  onApply={() => applyNotificationTone(tone, true)}
                  onDelete={() => handleRemoveSavedTone(tone.uri)}
                />
              );
            })
          )}
        </GlassCard>

        {/* ── Built-in System Notification Tones ── */}
        <GlassCard style={styles.card}>
          <TouchableOpacity
            onPress={handleToggleSystemTones}
            activeOpacity={0.7}
            style={styles.systemHeaderBtn}
          >
            <View style={{ flex: 1 }}>
              <Text style={Typography.h3}>📱 Âm báo có sẵn trên máy</Text>
              <Text style={[Typography.bodySmall, { marginTop: 2 }]}>
                Chọn nhanh chuông mặc định của hệ thống (không qua app Chủ đề)
              </Text>
            </View>
            <Text style={{ color: Colors.textSecondary, fontSize: 16, marginLeft: Spacing.sm }}>
              {showSystemTones ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showSystemTones && (
            <View style={styles.systemListContainer}>
              <TextInput
                style={styles.searchInput}
                value={systemSearch}
                onChangeText={setSystemSearch}
                placeholder="Tìm âm báo hệ thống..."
                placeholderTextColor={Colors.textMuted}
              />

              {filteredSystemTones.length === 0 ? (
                <Text style={[Typography.bodySmall, { textAlign: 'center', paddingVertical: Spacing.md }]}>
                  Không tìm thấy âm báo phù hợp
                </Text>
              ) : (
                filteredSystemTones.map(tone => {
                  const active = isToneCurrentlyActive(tone);
                  const isPlaying = playingUri === tone.uri;
                  const isApplying = applyingUri === tone.uri;
                  return (
                    <ToneItemRow
                      key={tone.uri}
                      tone={tone}
                      active={active}
                      isPlaying={isPlaying}
                      isApplying={isApplying}
                      onPreview={() => handleTogglePreview(tone.uri)}
                      onApply={() => applyNotificationTone(tone, true)}
                    />
                  );
                })
              )}
            </View>
          )}
        </GlassCard>

        {/* ── Info tip ── */}
        <Text style={styles.footerTip}>
          💡 Mẹo: Âm báo này áp dụng cho Tin nhắn SMS và mọi ứng dụng dùng "Âm thông báo mặc định". Với các app có nhạc riêng (như Messenger/Zalo), hãy chọn "Âm mặc định hệ thống" trong cài đặt thông báo của app đó nếu muốn đồng bộ.
        </Text>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

function ToneItemRow({
  tone,
  active,
  isPlaying,
  isApplying,
  onPreview,
  onApply,
  onDelete,
}: {
  tone: RingtoneInfo;
  active: boolean;
  isPlaying: boolean;
  isApplying: boolean;
  onPreview: () => void;
  onApply: () => void;
  onDelete?: () => void;
}) {
  return (
    <View style={[styles.toneRow, active && styles.toneRowActive]}>
      <TouchableOpacity
        onPress={onPreview}
        style={[styles.playCircle, isPlaying && styles.playCircleActive]}
      >
        <Text style={styles.playIconText}>{isPlaying ? '⏹' : '▶'}</Text>
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <View style={styles.toneTitleRow}>
          <Text style={[Typography.body, { fontWeight: '600', flexShrink: 1 }]} numberOfLines={1}>
            {tone.title}
          </Text>
          {active && (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Đang dùng</Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        onPress={onApply}
        disabled={isApplying}
        style={[styles.applyChip, active && styles.applyChipActive]}
      >
        <Text style={[styles.applyChipText, active && styles.applyChipTextActive]}>
          {isApplying ? '...' : active ? '✓ Đã đặt' : 'Đặt'}
        </Text>
      </TouchableOpacity>

      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteIconBtn}>
          <Text style={{ color: Colors.error, fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

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
  card: {
    marginBottom: Spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  previewCurrentBtn: {
    borderColor: Colors.borderLight,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  previewCurrentText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  randomBtn: {
    borderColor: Colors.accentGreen,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  randomBtnText: {
    ...Typography.bodySmall,
    color: Colors.accentGreen,
    fontWeight: '600',
  },
  currentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  modeChip: {
    backgroundColor: Colors.bgCardAlt,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modeChipText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modeChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  toneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  toneRowActive: {
    backgroundColor: 'rgba(67,198,172,0.08)',
    borderRadius: BorderRadius.sm,
  },
  playCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircleActive: {
    backgroundColor: 'rgba(255,101,132,0.2)',
    borderColor: Colors.accent,
  },
  playIconText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  toneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  activePill: {
    backgroundColor: 'rgba(67,198,172,0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accentGreen,
  },
  applyChip: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  applyChipActive: {
    backgroundColor: 'rgba(67,198,172,0.2)',
    borderWidth: 1,
    borderColor: Colors.accentGreen,
  },
  applyChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  applyChipTextActive: {
    color: Colors.accentGreen,
  },
  deleteIconBtn: {
    padding: Spacing.xs,
  },
  systemHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  systemListContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  searchInput: {
    backgroundColor: Colors.bgCardAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  footerTip: {
    ...Typography.caption,
    color: Colors.textMuted,
    lineHeight: 18,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
  },
});

