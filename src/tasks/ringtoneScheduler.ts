import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimeSlot } from '../types';
import { setSystemRingtone, checkWriteSettingsPermission } from '../../modules/expo-ringtone';

export const RINGTONE_SCHEDULER_TASK = 'RINGTONE_SCHEDULER_TASK';

const STORAGE_KEY = '@autoringtone_slots';
const SCHEDULER_KEY = '@autoringtone_scheduler_enabled';
const LAST_SET_KEY = '@autoringtone_last_set'; // { slotId, uri, timestamp }

/**
 * Kiểm tra xem giờ hiện tại có nằm trong time slot không
 */
function isTimeInSlot(slot: TimeSlot, now: Date): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = slot.startHour * 60 + slot.startMinute;
  const endMinutes = slot.endHour * 60 + slot.endMinute;

  if (startMinutes <= endMinutes) {
    // Slot không vượt qua midnight: VD 09:00 → 17:00
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Slot vượt qua midnight: VD 22:00 → 06:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Chọn ngẫu nhiên 1 file từ playlist của slot
 */
function pickRandom<T>(arr: T[]): T | null {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Background task chính: kiểm tra giờ → set ringtone ngẫu nhiên
 */
TaskManager.defineTask(RINGTONE_SCHEDULER_TASK, async () => {
  try {
    // 1. Kiểm tra scheduler có được bật không
    const enabledJson = await AsyncStorage.getItem(SCHEDULER_KEY);
    const schedulerEnabled: boolean = enabledJson ? JSON.parse(enabledJson) : false;
    if (!schedulerEnabled) {
      return BackgroundTask.BackgroundFetchResult.NoData;
    }

    // 2. Kiểm tra quyền
    const hasPermission = await checkWriteSettingsPermission();
    if (!hasPermission) {
      console.warn('[RingtoneScheduler] WRITE_SETTINGS permission not granted');
      return BackgroundTask.BackgroundFetchResult.Failed;
    }

    // 3. Lấy danh sách slots
    const slotsJson = await AsyncStorage.getItem(STORAGE_KEY);
    const slots: TimeSlot[] = slotsJson ? JSON.parse(slotsJson) : [];
    const enabledSlots = slots.filter(s => s.isEnabled && s.playlist.length > 0);

    if (enabledSlots.length === 0) {
      return BackgroundTask.BackgroundFetchResult.NoData;
    }

    // 4. Tìm slot đang active
    const now = new Date();
    const activeSlot = enabledSlots.find(slot => isTimeInSlot(slot, now));

    if (!activeSlot) {
      return BackgroundTask.BackgroundFetchResult.NoData;
    }

    // 5. Kiểm tra xem slot này đã được set trong khung giờ hiện tại chưa
    //    (tránh set lại liên tục nếu task chạy nhiều lần)
    const lastSetJson = await AsyncStorage.getItem(LAST_SET_KEY);
    if (lastSetJson) {
      const lastSet = JSON.parse(lastSetJson);
      const minutesSinceLast = (Date.now() - lastSet.timestamp) / 1000 / 60;
      // Nếu cùng slot và mới set trong vòng 5 phút → skip
      if (lastSet.slotId === activeSlot.id && minutesSinceLast < 5) {
        return BackgroundTask.BackgroundFetchResult.NoData;
      }
    }

    // 6. Random pick ringtone từ playlist
    const picked = pickRandom(activeSlot.playlist);
    if (!picked) {
      return BackgroundTask.BackgroundFetchResult.NoData;
    }

    // 7. Set ringtone
    const success = await setSystemRingtone(picked.uri);

    if (success) {
      await AsyncStorage.setItem(LAST_SET_KEY, JSON.stringify({
        slotId: activeSlot.id,
        uri: picked.uri,
        title: picked.title,
        timestamp: Date.now(),
      }));
      console.log(`[RingtoneScheduler] ✅ Set ringtone: ${picked.title} for slot "${activeSlot.label}"`);
      return BackgroundTask.BackgroundFetchResult.NewData;
    } else {
      return BackgroundTask.BackgroundFetchResult.Failed;
    }
  } catch (error) {
    console.error('[RingtoneScheduler] Error:', error);
    return BackgroundTask.BackgroundFetchResult.Failed;
  }
});

/**
 * Đăng ký background task (gọi khi bật scheduler)
 */
export async function registerSchedulerTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(RINGTONE_SCHEDULER_TASK);
    if (!isRegistered) {
      await BackgroundTask.registerTaskAsync(RINGTONE_SCHEDULER_TASK, {
        minimumInterval: 15, // phút – Android WorkManager tối thiểu 15 phút
      });
      console.log('[RingtoneScheduler] Task registered');
    }
  } catch (e) {
    console.error('[RingtoneScheduler] Register error:', e);
  }
}

/**
 * Hủy đăng ký background task (gọi khi tắt scheduler)
 */
export async function unregisterSchedulerTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(RINGTONE_SCHEDULER_TASK);
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(RINGTONE_SCHEDULER_TASK);
      console.log('[RingtoneScheduler] Task unregistered');
    }
  } catch (e) {
    console.error('[RingtoneScheduler] Unregister error:', e);
  }
}

/**
 * Trigger task ngay lập tức để test (development only)
 */
export async function triggerTaskForTesting(): Promise<void> {
  await BackgroundTask.triggerTaskWorkerForTestingAsync(RINGTONE_SCHEDULER_TASK);
}
