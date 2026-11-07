import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimeSlot } from '../types';
import {
  setSystemRingtone,
  checkWriteSettingsPermission,
  syncNativeSchedule,
  getNativeLastSet,
  NativeLastSetRecord,
} from '../../modules/expo-ringtone';

export const RINGTONE_SCHEDULER_TASK = 'RINGTONE_SCHEDULER_TASK';

const STORAGE_KEY = '@autoringtone_slots';
const SCHEDULER_KEY = '@autoringtone_scheduler_enabled';
const LAST_SET_KEY = '@autoringtone_last_set'; // { slotId, uri, title, timestamp }

/**
 * Kiểm tra xem giờ hiện tại có nằm trong time slot không
 */
export function isTimeInSlot(slot: TimeSlot, now: Date): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = slot.startHour * 60 + slot.startMinute;
  const endMinutes = slot.endHour * 60 + slot.endMinute;

  if (startMinutes === endMinutes) {
    return true; // Khung giờ 24h
  } else if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Slot vượt qua midnight: VD 22:00 → 06:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Tính timestamp bắt đầu của phiên slot hiện tại (hỗ trợ cả slot qua nửa đêm & lặp lại hằng ngày)
 */
function getOccurrenceStartMs(slot: TimeSlot, now: Date): number {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = slot.startHour * 60 + slot.startMinute;
  const endMinutes = slot.endHour * 60 + slot.endMinute;

  const startDate = new Date(now);
  startDate.setHours(slot.startHour, slot.startMinute, 0, 0);

  if (startMinutes > endMinutes && currentMinutes < endMinutes) {
    startDate.setDate(startDate.getDate() - 1);
  }
  return startDate.getTime();
}

function pickRandom<T>(arr: T[]): T | null {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

async function getMergedLastSet(): Promise<NativeLastSetRecord | null> {
  const [jsJson, nativeRecord] = await Promise.all([
    AsyncStorage.getItem(LAST_SET_KEY).catch(() => null),
    getNativeLastSet().catch(() => null),
  ]);

  let jsRecord: NativeLastSetRecord | null = null;
  if (jsJson) {
    try {
      jsRecord = JSON.parse(jsJson);
    } catch {
      jsRecord = null;
    }
  }

  if (nativeRecord && (!jsRecord || nativeRecord.timestamp >= jsRecord.timestamp)) {
    await AsyncStorage.setItem(LAST_SET_KEY, JSON.stringify(nativeRecord)).catch(() => {});
    return nativeRecord;
  }
  return jsRecord;
}

/**
 * Background task dự phòng (WorkManager) chạy song song với Native AlarmManager
 */
TaskManager.defineTask(RINGTONE_SCHEDULER_TASK, async () => {
  try {
    const enabledJson = await AsyncStorage.getItem(SCHEDULER_KEY);
    const schedulerEnabled: boolean = enabledJson ? JSON.parse(enabledJson) : false;
    if (!schedulerEnabled) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const hasPermission = await checkWriteSettingsPermission();
    if (!hasPermission) {
      console.warn('[RingtoneScheduler] WRITE_SETTINGS permission not granted');
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    const slotsJson = (await AsyncStorage.getItem(STORAGE_KEY)) || '[]';
    const slots: TimeSlot[] = JSON.parse(slotsJson);
    const enabledSlots = slots.filter(s => s.isEnabled && s.playlist.length > 0);

    if (enabledSlots.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const now = new Date();
    const activeSlot = enabledSlots.find(slot => isTimeInSlot(slot, now));
    if (!activeSlot) {
      await syncNativeSchedule(slotsJson, true, null, false).catch(() => null);
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const autoRotate = activeSlot.autoRotate !== false;
    const intervalMinutes = autoRotate ? (activeSlot.changeIntervalMinutes ?? 60) : 0;
    const occurrenceStartMs = getOccurrenceStartMs(activeSlot, now);

    const lastSet = await getMergedLastSet();
    const alreadySetThisOccurrence =
      lastSet !== null &&
      lastSet.slotId === activeSlot.id &&
      lastSet.timestamp >= occurrenceStartMs;

    if (alreadySetThisOccurrence) {
      if (intervalMinutes <= 0) {
        return BackgroundTask.BackgroundTaskResult.Success;
      }
      const minutesSinceLast = (Date.now() - lastSet.timestamp) / 1000 / 60;
      if (minutesSinceLast < intervalMinutes) {
        return BackgroundTask.BackgroundTaskResult.Success;
      }
    }

    let candidates = activeSlot.playlist;
    if (candidates.length > 1 && lastSet?.uri) {
      const filtered = candidates.filter(c => c.uri !== lastSet.uri);
      if (filtered.length > 0) candidates = filtered;
    }

    const picked = pickRandom(candidates);
    if (!picked) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const success = await setSystemRingtone(picked.uri, picked.title);
    if (success) {
      const newRecord: NativeLastSetRecord = {
        slotId: activeSlot.id,
        uri: picked.uri,
        title: picked.title,
        timestamp: Date.now(),
      };
      const recordJson = JSON.stringify(newRecord);
      await AsyncStorage.setItem(LAST_SET_KEY, recordJson);
      await syncNativeSchedule(slotsJson, true, recordJson, false).catch(() => null);
      console.log(`[RingtoneScheduler] Set ringtone: ${picked.title} for slot "${activeSlot.label}"`);
      return BackgroundTask.BackgroundTaskResult.Success;
    } else {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  } catch (error) {
    console.error('[RingtoneScheduler] Error:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Đồng bộ toàn bộ cấu hình lịch sang cả Native AlarmManager (chính, chạy offline & chuẩn giờ trên HyperOS 1+)
 * và WorkManager BackgroundTask (dự phòng).
 */
export async function syncSchedulerWithNative(
  slots: TimeSlot[],
  enabled: boolean,
  runNow: boolean = true
): Promise<void> {
  try {
    const lastSetJson = await AsyncStorage.getItem(LAST_SET_KEY).catch(() => null);
    const nativeUpdated = await syncNativeSchedule(
      JSON.stringify(slots),
      enabled,
      lastSetJson,
      runNow
    );
    if (nativeUpdated) {
      await AsyncStorage.setItem(LAST_SET_KEY, JSON.stringify(nativeUpdated)).catch(() => {});
    }
  } catch (e) {
    console.warn('[RingtoneScheduler] syncNativeSchedule warning:', e);
  }

  if (enabled) {
    await registerSchedulerTask();
  } else {
    await unregisterSchedulerTask();
  }
}

/**
 * Đăng ký background task (WorkManager dự phòng)
 */
export async function registerSchedulerTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(RINGTONE_SCHEDULER_TASK);
    if (!isRegistered) {
      await BackgroundTask.registerTaskAsync(RINGTONE_SCHEDULER_TASK, {
        minimumInterval: 15,
      });
      console.log('[RingtoneScheduler] WorkManager backup task registered');
    }
  } catch (e) {
    console.warn('[RingtoneScheduler] WorkManager register warning (native AlarmManager still active):', e);
  }
}

/**
 * Hủy đăng ký background task
 */
export async function unregisterSchedulerTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(RINGTONE_SCHEDULER_TASK);
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(RINGTONE_SCHEDULER_TASK);
      console.log('[RingtoneScheduler] WorkManager task unregistered');
    }
  } catch (e) {
    console.warn('[RingtoneScheduler] WorkManager unregister warning:', e);
  }
}

/**
 * Trigger kiểm tra lịch ngay lập tức (dùng được trên cả Debug lẫn Release thông qua Native AlarmScheduler)
 */
export async function triggerTaskForTesting(): Promise<void> {
  const [slotsJson, enabledJson, lastSetJson] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEY),
    AsyncStorage.getItem(SCHEDULER_KEY),
    AsyncStorage.getItem(LAST_SET_KEY),
  ]);
  const enabled = enabledJson ? JSON.parse(enabledJson) : false;
  const updated = await syncNativeSchedule(slotsJson || '[]', enabled, lastSetJson, true);
  if (updated) {
    await AsyncStorage.setItem(LAST_SET_KEY, JSON.stringify(updated));
  }
}
