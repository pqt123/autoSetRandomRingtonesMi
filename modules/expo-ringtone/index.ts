import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

const ExpoRingtone = requireNativeModule('ExpoRingtone');

export interface RingtoneInfo {
  title: string;
  uri: string;
}

export interface NativeLastSetRecord {
  slotId: string;
  uri: string;
  title: string;
  timestamp: number;
}

export interface DeviceSystemInfo {
  isXiaomi: boolean;
  osVersionName: string;
  sdkInt: number;
  manufacturer: string;
  model: string;
}

function notAndroid(fn: string): never {
  throw new Error(`ExpoRingtone.${fn}: Android only`);
}

/**
 * Set nhạc chuông hệ thống theo file URI (content:// hoặc file://)
 * Yêu cầu quyền WRITE_SETTINGS đã được cấp.
 * Tương thích HyperOS 1 / 2 / 3+, MIUI và Android chuẩn (hỗ trợ cả Dual-SIM).
 */
export async function setSystemRingtone(uri: string, title?: string): Promise<boolean> {
  if (Platform.OS !== 'android') notAndroid('setSystemRingtone');
  return ExpoRingtone.setSystemRingtone(uri, title ?? null);
}

/**
 * Lưu bản sao file nhạc vào bộ nhớ bền vững của app (tránh bị Xiaomi Cleaner trên HyperOS 1 dọn mất cache)
 */
export async function persistAudioFile(uri: string, displayName?: string): Promise<string> {
  if (Platform.OS !== 'android') return uri;
  return ExpoRingtone.persistAudioFile(uri, displayName ?? null);
}

/**
 * Đồng bộ danh sách khung giờ sang Native AlarmManager để tự động đổi nhạc chuẩn giờ ngay cả khi tắt mạng / ngủ sâu
 */
export async function syncNativeSchedule(
  slotsJson: string,
  enabled: boolean,
  lastSetJson?: string | null,
  runNow: boolean = true
): Promise<NativeLastSetRecord | null> {
  if (Platform.OS !== 'android') return null;
  return ExpoRingtone.syncNativeSchedule(slotsJson, enabled, lastSetJson ?? null, runNow);
}

/**
 * Đọc bản ghi lần đổi nhạc tự động gần nhất từ Native
 */
export async function getNativeLastSet(): Promise<NativeLastSetRecord | null> {
  if (Platform.OS !== 'android') return null;
  return ExpoRingtone.getNativeLastSet();
}

/**
 * Kiểm tra quyền WRITE_SETTINGS đã được cấp chưa
 */
export async function checkWriteSettingsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return ExpoRingtone.checkWriteSettingsPermission();
}

/**
 * Mở màn hình Settings để người dùng cấp quyền WRITE_SETTINGS
 */
export function openWriteSettingsScreen(): void {
  if (Platform.OS !== 'android') return;
  ExpoRingtone.openWriteSettingsScreen();
}

/**
 * Lấy thông tin ringtone đang được đặt hiện tại
 */
export async function getCurrentRingtone(): Promise<RingtoneInfo | null> {
  if (Platform.OS !== 'android') return null;
  return ExpoRingtone.getCurrentRingtone();
}

/**
 * Kiểm tra Battery Optimization có đang TẮT cho app này không
 */
export async function isIgnoringBatteryOptimizations(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  return ExpoRingtone.isIgnoringBatteryOptimizations();
}

/**
 * Mở màn hình yêu cầu tắt Battery Optimization cho app
 */
export function openBatteryOptimizationSettings(): void {
  if (Platform.OS !== 'android') return;
  ExpoRingtone.openBatteryOptimizationSettings();
}

/**
 * Kiểm tra quyền đặt báo thức chính xác (Android 12+ / HyperOS 1+)
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  return ExpoRingtone.canScheduleExactAlarms();
}

/**
 * Mở cài đặt cấp quyền Báo thức & nhắc nhở (Alarms & reminders)
 */
export function openExactAlarmSettings(): void {
  if (Platform.OS !== 'android') return;
  ExpoRingtone.openExactAlarmSettings();
}

/**
 * Lấy thông tin thiết bị (Xiaomi / HyperOS / SDK)
 */
export async function getDeviceSystemInfo(): Promise<DeviceSystemInfo> {
  if (Platform.OS !== 'android') {
    return {
      isXiaomi: false,
      osVersionName: '',
      sdkInt: 0,
      manufacturer: '',
      model: '',
    };
  }
  return ExpoRingtone.getDeviceSystemInfo();
}

/**
 * Mở màn hình Autostart đặc thù của Xiaomi MIUI / HyperOS
 */
export function openMiuiAutostartSettings(): void {
  if (Platform.OS !== 'android') return;
  ExpoRingtone.openMiuiAutostartSettings();
}

/**
 * Mở màn hình tiết kiệm pin riêng của Xiaomi MIUI / HyperOS (PowerKeeper)
 */
export function openMiuiBatterySaverSettings(): void {
  if (Platform.OS !== 'android') return;
  ExpoRingtone.openMiuiBatterySaverSettings();
}
