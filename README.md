# AutoRingtone Mi 🎵

Ứng dụng Android tự động thay đổi nhạc chuông hệ thống theo khung giờ, với tính năng random bài nhạc từ playlist.

## Tính năng

- ⏰ **Khung giờ linh hoạt** – Tạo nhiều khung giờ, hỗ trợ qua midnight (VD: 22:00 → 06:00)
- 🎲 **Random playlist** – Mỗi slot có playlist riêng, random 1 bài mỗi lần chạy
- 🔄 **Background task** – Tự động chạy kể cả khi app đóng (dùng WorkManager)
- 📱 **Hỗ trợ MIUI/Xiaomi** – Hướng dẫn cấu hình đặc biệt cho thiết bị Xiaomi

## Tech Stack

- **Expo SDK 54** (Bare Workflow)
- **React Native 0.81** + **TypeScript**
- **Expo Router** v6 (file-based routing)
- **expo-background-task** + **expo-task-manager** (WorkManager)
- **Zustand** (state management)
- **Custom Expo Native Module** (Kotlin) – giao tiếp với Android RingtoneManager

## Cấu trúc dự án

```
├── app/                    # Expo Router pages
│   ├── _layout.tsx         # Root layout + task registration
│   ├── index.tsx           # Home screen
│   ├── add-slot.tsx        # Add/edit time slot
│   └── permissions.tsx     # Permissions setup
├── src/
│   ├── screens/            # Screen components
│   ├── components/ui.tsx   # Shared UI components
│   ├── store/useStore.ts   # Zustand store
│   ├── tasks/              # Background task logic
│   ├── theme/index.ts      # Design tokens
│   └── types/index.ts      # TypeScript types
├── modules/expo-ringtone/  # Custom native module
│   ├── index.ts            # JS API wrapper
│   ├── expo-module.config.json
│   └── android/            # Kotlin implementation
│       └── .../ExpoRingtoneModule.kt
└── android/                # Generated native Android project
```

## Setup & Build

### Yêu cầu

- Node.js >= 18
- Android Studio + Android SDK
- Java 17+

### Cài đặt

```bash
npm install
```

### Chạy trên device/emulator

```bash
# Development build (bắt buộc, không dùng Expo Go)
npx expo run:android
```

### Lưu ý quan trọng

1. **Không dùng Expo Go** – App cần native module, phải build Development Client
2. **Quyền WRITE_SETTINGS** – Người dùng phải cấp thủ công trong Settings
3. **Xiaomi/MIUI** – Cần tắt Battery Optimization và bật Autostart

## Quyền Android

| Permission | Mục đích |
|---|---|
| `WRITE_SETTINGS` | Thay đổi nhạc chuông hệ thống |
| `READ_MEDIA_AUDIO` | Đọc file âm nhạc từ bộ nhớ |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Giữ background task chạy ổn định |
| `RECEIVE_BOOT_COMPLETED` | Khởi động lại scheduler sau khi reboot |

## Background Task

App dùng `expo-background-task` (WorkManager trên Android):
- **Interval tối thiểu**: 15 phút (giới hạn của WorkManager)
- **Deduplication**: Không set lại ringtone nếu cùng slot, trong vòng 5 phút
- **Dev testing**: Nút "Trigger Task ngay" trong DEV mode

---

Được tạo với [Expo](https://expo.dev) SDK 54

autoSetRandomRingtonesMi/
├── app/                        # Expo Router
│   ├── _layout.tsx             # Root layout + task registration  
│   ├── index.tsx               # → HomeScreen
│   ├── add-slot.tsx            # → AddSlotScreen
│   └── permissions.tsx         # → PermissionsScreen
├── src/
│   ├── screens/HomeScreen.tsx  # Dashboard, slot list, scheduler toggle
│   ├── screens/AddSlotScreen.tsx  # Time picker + file picker + playlist
│   ├── screens/PermissionsScreen.tsx  # WRITE_SETTINGS + MIUI guide
│   ├── components/ui.tsx       # GlassCard, ToggleSwitch, PulseDot...
│   ├── store/useStore.ts       # Zustand + AsyncStorage
│   ├── tasks/ringtoneScheduler.ts  # Background task (WorkManager)
│   ├── theme/index.ts          # Dark theme design tokens
│   └── types/index.ts          # TypeScript types
└── modules/expo-ringtone/      # Kotlin native module
    ├── ExpoRingtoneModule.kt   # setSystemRingtone, permissions, battery
    └── expo-module.config.json # Autolinking config
