import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimeSlot, RingtoneInfo, SchedulerStatus } from '../types';

const STORAGE_KEY = '@autoringtone_slots';
const SCHEDULER_KEY = '@autoringtone_scheduler_enabled';

interface StoreState {
  slots: TimeSlot[];
  schedulerEnabled: boolean;
  schedulerStatus: SchedulerStatus;
  currentRingtone: RingtoneInfo | null;
  activeSlotId: string | null;

  // Actions
  loadFromStorage: () => Promise<void>;
  addSlot: (slot: Omit<TimeSlot, 'id' | 'createdAt'>) => Promise<void>;
  updateSlot: (id: string, updates: Partial<TimeSlot>) => Promise<void>;
  deleteSlot: (id: string) => Promise<void>;
  toggleSlot: (id: string) => Promise<void>;
  toggleScheduler: () => Promise<void>;
  setSchedulerStatus: (status: SchedulerStatus) => void;
  setCurrentRingtone: (ringtone: RingtoneInfo | null) => void;
  setActiveSlotId: (id: string | null) => void;
}

const SLOT_COLORS = [
  '#6C63FF', '#FF6584', '#43C6AC', '#F7971E',
  '#a18cd1', '#fda085', '#84fab0', '#f6d365',
  '#4facfe', '#f093fb', '#43e97b', '#fa709a',
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getRandomColor(existingColors: string[]): string {
  const available = SLOT_COLORS.filter(c => !existingColors.includes(c));
  const pool = available.length > 0 ? available : SLOT_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const useStore = create<StoreState>((set, get) => ({
  slots: [],
  schedulerEnabled: false,
  schedulerStatus: 'inactive',
  currentRingtone: null,
  activeSlotId: null,

  loadFromStorage: async () => {
    try {
      const [slotsJson, enabledJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(SCHEDULER_KEY),
      ]);
      const slots: TimeSlot[] = slotsJson ? JSON.parse(slotsJson) : [];
      const schedulerEnabled: boolean = enabledJson ? JSON.parse(enabledJson) : false;
      set({ slots, schedulerEnabled });
    } catch (e) {
      console.error('loadFromStorage error:', e);
    }
  },

  addSlot: async (slotData) => {
    const { slots } = get();
    const existingColors = slots.map(s => s.color);
    const newSlot: TimeSlot = {
      ...slotData,
      id: generateId(),
      color: slotData.color || getRandomColor(existingColors),
      createdAt: Date.now(),
    };
    const updated = [...slots, newSlot];
    set({ slots: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  updateSlot: async (id, updates) => {
    const { slots } = get();
    const updated = slots.map(s => s.id === id ? { ...s, ...updates } : s);
    set({ slots: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  deleteSlot: async (id) => {
    const { slots } = get();
    const updated = slots.filter(s => s.id !== id);
    set({ slots: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  toggleSlot: async (id) => {
    const { slots } = get();
    const updated = slots.map(s =>
      s.id === id ? { ...s, isEnabled: !s.isEnabled } : s
    );
    set({ slots: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  toggleScheduler: async () => {
    const { schedulerEnabled } = get();
    const next = !schedulerEnabled;
    set({ schedulerEnabled: next });
    await AsyncStorage.setItem(SCHEDULER_KEY, JSON.stringify(next));
  },

  setSchedulerStatus: (status) => set({ schedulerStatus: status }),
  setCurrentRingtone: (ringtone) => set({ currentRingtone: ringtone }),
  setActiveSlotId: (id) => set({ activeSlotId: id }),
}));
