import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

const ExpoRingtone = requireNativeModule('ExpoRingtone');

export interface RingtoneInfo {
  title: string;
  uri: string;
}

function notAndroid(fn: string): never {
  throw new Error(`ExpoRingtone.${fn}: Android only`);
}

/**
 * Set nhạc chuông hệ thống theo file URI (content:// hoặc file://)
 * Yêu cầu quyền WRITE_SETTINGS đã được cấp.
 * @returns true nếu thành công
 */
export async function setSystemRingtone(uri: string): Promise<boolean> {
  if (Platform.OS !== 'android') notAndroid('setSystemRingtone');
  return ExpoRingtone.setSystemRingtone(uri);
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
 * (isIgnoring = true nghĩa là app được miễn battery optimization → tốt)
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
