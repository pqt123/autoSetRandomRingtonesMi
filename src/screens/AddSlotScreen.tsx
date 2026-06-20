import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { GlassCard, PrimaryButton, TimeBadge, SectionHeader } from '../components/ui';
import { useStore } from '../store/useStore';
import { TimeSlot, RingtoneInfo } from '../types';

// ─── Time Picker Modal ────────────────────────────────────────────────────────
function TimePickerModal({
  visible,
  hour,
  minute,
  onConfirm,
  onCancel,
  title,
}: {
  visible: boolean;
  hour: number;
  minute: number;
  onConfirm: (h: number, m: number) => void;
  onCancel: () => void;
  title: string;
}) {
  const [selH, setSelH] = useState(hour);
  const [selM, setSelM] = useState(minute);

  useEffect(() => { setSelH(hour); setSelM(minute); }, [hour, minute, visible]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={[Typography.h3, { marginBottom: Spacing.md }]}>{title}</Text>

          <View style={styles.pickerRow}>
            {/* Hour picker */}
            <View style={styles.pickerCol}>
              <Text style={Typography.label}>GIỜ</Text>
              <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                {hours.map(h => (
                  <TouchableOpacity
                    key={h}
                    onPress={() => setSelH(h)}
                    style={[styles.pickerItem, selH === h && styles.pickerItemSelected]}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      selH === h && { color: Colors.primary, fontWeight: '700' }
                    ]}>
                      {String(h).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={[Typography.h1, { alignSelf: 'center', color: Colors.textMuted }]}>:</Text>

            {/* Minute picker */}
            <View style={styles.pickerCol}>
              <Text style={Typography.label}>PHÚT</Text>
              <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                {minutes.map(m => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setSelM(m)}
                    style={[styles.pickerItem, selM === m && styles.pickerItemSelected]}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      selM === m && { color: Colors.primary, fontWeight: '700' }
                    ]}>
                      {String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <PrimaryButton label="Hủy" onPress={onCancel} variant="ghost" style={{ flex: 1 }} />
            <View style={{ width: Spacing.sm }} />
            <PrimaryButton label="Xác nhận" onPress={() => onConfirm(selH, selM)} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main AddSlotScreen ───────────────────────────────────────────────────────
export default function AddSlotScreen() {
  const { slotId } = useLocalSearchParams<{ slotId?: string }>();
  const { slots, addSlot, updateSlot, deleteSlot } = useStore();

  const existingSlot = slotId ? slots.find(s => s.id === slotId) : undefined;
  const isEditing = !!existingSlot;

  const [label, setLabel] = useState(existingSlot?.label ?? '');
  const [startHour, setStartHour] = useState(existingSlot?.startHour ?? 7);
  const [startMinute, setStartMinute] = useState(existingSlot?.startMinute ?? 0);
  const [endHour, setEndHour] = useState(existingSlot?.endHour ?? 9);
  const [endMinute, setEndMinute] = useState(existingSlot?.endMinute ?? 0);
  const [playlist, setPlaylist] = useState<RingtoneInfo[]>(existingSlot?.playlist ?? []);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: false,
      });

      if (result.canceled) return;

      const newTracks: RingtoneInfo[] = result.assets.map(asset => ({
        title: asset.name.replace(/\.[^.]+$/, ''), // bỏ extension
        uri: asset.uri,
        duration: asset.size,
      }));

      // Tránh trùng lặp theo URI
      const existingUris = new Set(playlist.map(p => p.uri));
      const unique = newTracks.filter(t => !existingUris.has(t.uri));
      setPlaylist(prev => [...prev, ...unique]);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể chọn file âm thanh');
    }
  };

  const removeTrack = (uri: string) => {
    setPlaylist(prev => prev.filter(p => p.uri !== uri));
  };

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert('Thiếu tên', 'Vui lòng nhập tên cho khung giờ này');
      return;
    }
    if (playlist.length === 0) {
      Alert.alert('Chưa có nhạc', 'Thêm ít nhất 1 bài vào playlist');
      return;
    }

    const slotData = {
      label: label.trim(),
      startHour,
      startMinute,
      endHour,
      endMinute,
      playlist,
      isEnabled: existingSlot?.isEnabled ?? true,
      color: existingSlot?.color ?? '',
    };

    if (isEditing && slotId) {
      await updateSlot(slotId, slotData);
    } else {
      await addSlot(slotData);
    }
    router.back();
  };

  const handleDelete = () => {
    if (!slotId) return;
    Alert.alert(
      'Xóa khung giờ',
      `Xóa "${existingSlot?.label}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            await deleteSlot(slotId);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={Typography.h2}>{isEditing ? 'Sửa khung giờ' : 'Thêm khung giờ'}</Text>
        {isEditing ? (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Text style={{ fontSize: 20 }}>🗑</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Label ── */}
        <GlassCard style={styles.section}>
          <SectionHeader title="Tên khung giờ" />
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="VD: Buổi sáng, Giờ học..."
            placeholderTextColor={Colors.textMuted}
            maxLength={30}
          />
        </GlassCard>

        {/* ── Time Range ── */}
        <GlassCard style={styles.section}>
          <SectionHeader title="Khung giờ" />
          <View style={styles.timeRow}>
            {/* Start */}
            <View style={styles.timeBlock}>
              <Text style={Typography.bodySmall}>Bắt đầu</Text>
              <TouchableOpacity
                onPress={() => setShowStartPicker(true)}
                style={styles.timeTouchable}
              >
                <TimeBadge hour={startHour} minute={startMinute} />
              </TouchableOpacity>
            </View>

            <Text style={[Typography.h2, { color: Colors.textMuted, paddingTop: Spacing.lg }]}>→</Text>

            {/* End */}
            <View style={styles.timeBlock}>
              <Text style={Typography.bodySmall}>Kết thúc</Text>
              <TouchableOpacity
                onPress={() => setShowEndPicker(true)}
                style={styles.timeTouchable}
              >
                <TimeBadge hour={endHour} minute={endMinute} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[Typography.caption, { marginTop: Spacing.sm }]}>
            💡 Có thể đặt qua midnight (VD: 22:00 → 06:00)
          </Text>
        </GlassCard>

        {/* ── Playlist ── */}
        <GlassCard style={styles.section}>
          <SectionHeader
            title={`Playlist (${playlist.length} bài)`}
            subtitle="Random 1 bài mỗi lần scheduler chạy"
          />

          <PrimaryButton
            label="＋ Chọn file âm thanh"
            onPress={handlePickAudio}
            variant="outlined"
            style={{ marginTop: Spacing.sm, marginBottom: Spacing.md }}
          />

          {playlist.length === 0 ? (
            <View style={styles.emptyPlaylist}>
              <Text style={{ fontSize: 36 }}>🎼</Text>
              <Text style={[Typography.bodySmall, { marginTop: Spacing.sm, textAlign: 'center' }]}>
                Chưa có bài nào. Thêm file mp3/m4a/ogg từ bộ nhớ máy.
              </Text>
            </View>
          ) : (
            playlist.map((track, index) => (
              <View key={track.uri} style={styles.trackItem}>
                <View style={styles.trackIndex}>
                  <Text style={styles.trackIndexText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={Typography.body} numberOfLines={1}>{track.title}</Text>
                  <Text style={Typography.bodySmall} numberOfLines={1}>
                    {track.uri.split('/').pop()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeTrack(track.uri)} style={styles.removeBtn}>
                  <Text style={{ color: Colors.error, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </GlassCard>

        {/* ── Save Button ── */}
        <PrimaryButton
          label={isEditing ? '💾 Lưu thay đổi' : '✓ Tạo khung giờ'}
          onPress={handleSave}
          style={{ marginTop: Spacing.sm }}
        />

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Time Picker Modals */}
      <TimePickerModal
        visible={showStartPicker}
        hour={startHour}
        minute={startMinute}
        title="Chọn giờ bắt đầu"
        onConfirm={(h, m) => { setStartHour(h); setStartMinute(m); setShowStartPicker(false); }}
        onCancel={() => setShowStartPicker(false)}
      />
      <TimePickerModal
        visible={showEndPicker}
        hour={endHour}
        minute={endMinute}
        title="Chọn giờ kết thúc"
        onConfirm={(h, m) => { setEndHour(h); setEndMinute(m); setShowEndPicker(false); }}
        onCancel={() => setShowEndPicker(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  backBtn: { width: 40, alignItems: 'flex-start' },
  deleteBtn: { width: 40, alignItems: 'flex-end' },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  section: { marginBottom: Spacing.md },
  input: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.bgCardAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
  },
  timeBlock: { alignItems: 'center', gap: Spacing.sm },
  timeTouchable: {
    transform: [{ scale: 1.2 }],
    padding: Spacing.sm,
  },
  emptyPlaylist: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  trackIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackIndexText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  removeBtn: { padding: Spacing.xs },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  pickerCol: { alignItems: 'center', width: 80 },
  pickerScroll: { height: 200 },
  pickerItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  pickerItemSelected: { backgroundColor: 'rgba(108,99,255,0.2)' },
  pickerItemText: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modalButtons: { flexDirection: 'row' },
});
