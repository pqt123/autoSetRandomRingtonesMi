export interface RingtoneInfo {
  title: string;
  uri: string;
  duration?: number; // ms
  artist?: string;
}

export interface TimeSlot {
  id: string;
  label: string;
  startHour: number;    // 0–23
  startMinute: number;  // 0–59
  endHour: number;
  endMinute: number;
  playlist: RingtoneInfo[]; // danh sách file âm nhạc từ bộ nhớ để random
  isEnabled: boolean;
  color: string;        // màu hiển thị trên timeline
  createdAt: number;    // timestamp
  autoRotate?: boolean; // tự động đổi nhạc định kỳ trong khung giờ (default: true)
  changeIntervalMinutes?: number; // số phút giữa các lần đổi nhạc (60 = 1 tiếng, 30 = 30p, 0 = chỉ 1 lần khi bắt đầu slot)
}

export type SchedulerStatus = 'active' | 'inactive' | 'permission_required';

export interface AppState {
  slots: TimeSlot[];
  schedulerEnabled: boolean;
  schedulerStatus: SchedulerStatus;
  currentRingtone: RingtoneInfo | null;
  activeSlotId: string | null;
}
