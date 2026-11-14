import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppLanguage = 'vi' | 'en';

const LANGUAGE_STORAGE_KEY = '@autoringtone_language';

interface I18nState {
  lang: AppLanguage;
  initialized: boolean;
  loadLanguage: () => Promise<void>;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  toggleLanguage: () => Promise<void>;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  lang: 'vi',
  initialized: false,

  loadLanguage: async () => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'vi' || saved === 'en') {
        set({ lang: saved, initialized: true });
      } else {
        set({ initialized: true });
      }
    } catch {
      set({ initialized: true });
    }
  },

  setLanguage: async (nextLang: AppLanguage) => {
    set({ lang: nextLang });
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang).catch(() => {});
  },

  toggleLanguage: async () => {
    const next: AppLanguage = get().lang === 'vi' ? 'en' : 'vi';
    set({ lang: next });
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next).catch(() => {});
  },
}));

export const translations = {
  vi: {
    common: {
      version: (v: string) => `Phiên bản ${v}`,
      cancel: 'Hủy',
      confirm: 'Xác nhận',
      delete: 'Xóa',
      setup: 'Thiết lập',
      errorTitle: 'Lỗi',
      failedTitle: 'Thất bại',
      successTitle: 'Thành công',
      unknown: 'Không xác định',
      notSet: 'Chưa thiết lập',
      langSwitchLabel: 'VI',
      langName: 'Tiếng Việt',
    },
    tabs: {
      ringtone: 'Nhạc chuông',
      notification: 'Âm thông báo',
      about: 'Giới thiệu',
    },
    home: {
      subtitle: 'Tự động đổi nhạc chuông theo khung giờ',
      permWarningTitle: 'Chưa cấp quyền',
      permWarningSub: 'Nhấn để thiết lập quyền cần thiết',
      schedulerTitle: 'Lên lịch tự động',
      schedulerRunning: 'Đang chạy',
      schedulerStopped: 'Đã tắt',
      activeSlotsCount: (n: number) => ` · ${n} slot active`,
      activeSlotPrefix: 'Slot đang chạy: ',
      currentRingtoneHeader: 'Nhạc chuông hiện tại',
      testRandomBtn: '🎲 Test Random',
      audioFileSub: 'File âm thanh',
      systemRingtoneDefault: 'Nhạc chuông hệ thống',
      slotsHeader: (n: number) => `Khung giờ (${n})`,
      addBtn: '＋ Thêm',
      emptySlotsTitle: 'Chưa có khung giờ nào',
      emptySlotsSub: "Nhấn '+ Thêm' để tạo khung giờ đầu tiên với playlist nhạc riêng",
      devTriggerBtn: '🛠 [DEV] Trigger Task ngay',
      slotActiveBadge: 'Active',
      intervalOnce: '⏱ Chỉ 1 lần/khung giờ',
      intervalOneHour: '🔄 Đổi mỗi 1 tiếng',
      intervalHours: (h: number) => `🔄 Đổi mỗi ${h} tiếng`,
      intervalMinutes: (m: number) => `🔄 Đổi mỗi ${m} phút`,
      slotSummary: (count: number, intervalText: string) => `🎵 ${count} bài · ${intervalText}`,
      alertPermTitle: 'Yêu cầu quyền',
      alertPermMsg:
        'Ứng dụng cần quyền thay đổi cài đặt hệ thống (WRITE_SETTINGS) để đặt nhạc chuông. Bạn có muốn chuyển sang màn hình thiết lập không?',
      alertCannotTestTitle: 'Không thể test',
      alertCannotTestMsg:
        'Vui lòng tạo/bật ít nhất một khung giờ có chứa các bài hát trong playlist trước khi thực hiện test.',
      alertTestSuccessMsg: (label: string, isActive: boolean, songTitle: string) =>
        `Đã thay đổi nhạc chuông ngẫu nhiên từ khung giờ "${label}"${isActive ? ' (Đang active)' : ' (Test)'} thành:\n🎵 ${songTitle}`,
      alertTestFailedMsg:
        'Không thể ghi đè nhạc chuông. Vui lòng kiểm tra lại quyền truy cập hoặc file nhạc.',
      alertErrorMsg: (msg: string) => `Có lỗi xảy ra: ${msg}`,
    },
    addSlot: {
      hourLabel: 'GIỜ',
      minuteLabel: 'PHÚT',
      editHeader: 'Sửa khung giờ',
      addHeader: 'Thêm khung giờ',
      slotNameHeader: 'Tên khung giờ',
      slotNamePlaceholder: 'VD: Buổi sáng, Giờ học...',
      timeRangeHeader: 'Khung giờ',
      startLabel: 'Bắt đầu',
      endLabel: 'Kết thúc',
      rotationTitle: 'Đổi nhạc định kỳ',
      rotationCustomSub: (m: string) => `Đổi ngẫu nhiên mỗi ${m} phút`,
      rotationOnceSub: 'Chỉ đổi 1 lần khi bắt đầu khung giờ',
      rotationOneHourSub: 'Đổi ngẫu nhiên mỗi 1 tiếng',
      rotationHoursSub: (h: number) => `Đổi ngẫu nhiên mỗi ${h} tiếng`,
      rotationMinutesSub: (m: number) => `Đổi ngẫu nhiên mỗi ${m} phút`,
      rotationOffSub: 'Tắt (chỉ đổi 1 lần khi bắt đầu)',
      frequencyLabel: 'TẦN SUẤT ĐỔI NHẠC',
      preset1h: '1 tiếng',
      preset30m: '30 phút',
      preset2h: '2 tiếng',
      preset3h: '3 tiếng',
      presetOnce: 'Chỉ 1 lần',
      presetCustom: '✏️ Tùy chỉnh',
      customEveryLabel: 'Đổi ngẫu nhiên mỗi:',
      customMinutesUnit: 'phút',
      playlistHeader: (n: number) => `Playlist (${n} bài)`,
      playlistSub: 'Random 1 bài mỗi lần scheduler chạy',
      pickAudioBtn: '＋ Chọn file âm thanh',
      emptyPlaylistText: 'Chưa có bài nào. Thêm file mp3/m4a/ogg từ bộ nhớ máy.',
      saveChangesBtn: '💾 Lưu thay đổi',
      createSlotBtn: '✓ Tạo khung giờ',
      pickStartTitle: 'Chọn giờ bắt đầu',
      pickEndTitle: 'Chọn giờ kết thúc',
      alertPickErrMsg: 'Không thể chọn file âm thanh',
      alertMissingNameTitle: 'Thiếu tên',
      alertMissingNameMsg: 'Vui lòng nhập tên cho khung giờ này',
      alertEmptyPlaylistTitle: 'Chưa có nhạc',
      alertEmptyPlaylistMsg: 'Thêm ít nhất 1 bài vào playlist',
      alertDeleteTitle: 'Xóa khung giờ',
      alertDeleteMsg: (label: string) => `Xóa "${label}"?`,
    },
    notification: {
      title: 'Âm thông báo',
      subtitle: 'Đổi chuông tin nhắn SMS & thông báo ngay trong app',
      permWarningTitle: 'Chưa cấp quyền hệ thống',
      permWarningSub: 'Nhấn để bật quyền sửa cài đặt hệ thống trước khi đổi âm báo',
      currentHeader: 'Âm báo đang dùng',
      stopBtn: '⏹ Dừng',
      previewBtn: '🔊 Nghe',
      randomBtn: '🎲 Random',
      activeOnDeviceSub: 'Đang áp dụng trên thiết bị',
      systemNotifDefault: 'Âm báo hệ thống',
      scopeHeader: 'Phạm vi áp dụng',
      modeBothLabel: '🔔 + 💬 Cả hai',
      modeBothDesc:
        'Áp dụng cho cả âm thông báo mặc định Android & chuông tin nhắn SMS (hỗ trợ cả 2 SIM trên Xiaomi/HyperOS).',
      modeNotifLabel: '🔔 Thông báo',
      modeNotifDesc: 'Chỉ thay đổi âm thông báo mặc định của hệ thống Android.',
      modeSmsLabel: '💬 Tin nhắn SMS',
      modeSmsDesc:
        'Ưu tiên đổi chuông tin nhắn SMS trên Xiaomi/HyperOS (trên Android thuần dùng chung âm thông báo).',
      libraryHeader: (n: number) => `Thư viện âm báo của tôi (${n})`,
      librarySub: 'Chọn file mp3 / m4a / ogg / wav từ máy',
      pickAndApplyBtn: '⚡ Chọn file từ máy & Đặt ngay',
      addMultipleBtn: '＋ Thêm nhiều âm báo vào thư viện',
      emptyLibraryTitle: 'Chưa có âm báo riêng',
      emptyLibrarySub:
        'Nhấn nút ở trên để chọn âm báo tin nhắn / thông báo yêu thích từ bộ nhớ máy',
      systemTonesTitle: '📱 Âm báo có sẵn trên máy',
      systemTonesSub: 'Chọn nhanh chuông mặc định của hệ thống (không qua app Chủ đề)',
      searchPlaceholder: 'Tìm âm báo hệ thống...',
      noMatchingTones: 'Không tìm thấy âm báo phù hợp',
      footerTip:
        '💡 Mẹo: Âm báo này áp dụng cho Tin nhắn SMS và mọi ứng dụng dùng "Âm thông báo mặc định". Với các app có nhạc riêng (như Messenger/Zalo), hãy chọn "Âm mặc định hệ thống" trong cài đặt thông báo của app đó nếu muốn đồng bộ.',
      inUsePill: 'Đang dùng',
      appliedChip: '✓ Đã đặt',
      applyChip: 'Đặt',
      alertPermMsg:
        'Ứng dụng cần quyền thay đổi cài đặt hệ thống (Modify system settings) để đổi chuông thông báo / tin nhắn.',
      alertCannotPlayTitle: 'Không thể phát',
      alertCannotPlayMsg: 'Không đọc được file âm thanh này để nghe thử.',
      alertAppliedTitle: 'Đã áp dụng',
      targetBoth: 'Thông báo & Tin nhắn SMS',
      targetSms: 'Tin nhắn SMS',
      targetNotif: 'Thông báo hệ thống',
      alertAppliedMsg: (target: string, toneTitle: string) =>
        `Đã đặt âm báo (${target}):\n🔔 ${toneTitle}`,
      alertApplyFailedMsg:
        'Không thể cập nhật âm thông báo. Vui lòng kiểm tra quyền truy cập hoặc chọn lại file âm thanh.',
      alertPickFileErr: 'Không thể chọn file âm báo từ bộ nhớ.',
      alertAddLibErr: 'Không thể thêm file âm thanh vào thư viện.',
      alertEmptyRandomTitle: 'Chưa có âm báo',
      alertEmptyRandomMsg:
        'Hãy thêm ít nhất 1 file âm báo vào "Thư viện âm báo của tôi" trước khi Random.',
    },
    permissions: {
      header: 'Quyền truy cập',
      bannerReadyTitle: 'Quyền bắt buộc đã sẵn sàng',
      bannerNeededTitle: 'Cần cấp thêm quyền',
      bannerReadySub:
        'Trên HyperOS 1+, hãy bật thêm Autostart & Không hạn chế pin bên dưới để chạy ngầm 100% ổn định',
      bannerNeededSub: 'Nhấn vào từng mục bên dưới để thiết lập',
      writeSettingsTitle: 'Sửa cài đặt hệ thống',
      writeSettingsDesc: 'Cần thiết để thay đổi nhạc chuông (kể cả SIM 1 & SIM 2)',
      writeSettingsDetail:
        'Trên Android & HyperOS, thay đổi nhạc chuông yêu cầu quyền đặc biệt "Modify system settings". Bạn cần bật thủ công trong Settings.',
      audioReadTitle: 'Truy cập nhạc & âm thanh',
      audioReadDesc: 'Cần thiết trên HyperOS 1 / Android 13+ để đọc MediaStore ổn định',
      audioReadDetail:
        'Giúp ứng dụng đọc và đăng ký file nhạc chuông trong bộ nhớ mà không bị HyperOS 1 chặn quyền truy cập.',
      exactAlarmTitle: 'Báo thức & Lịch chính xác',
      exactAlarmDesc: 'Giúp đổi nhạc chuông chuẩn từng phút ngay cả khi tắt màn hình',
      exactAlarmDetail:
        'Cho phép AlarmManager đánh thức bộ đổi nhạc đúng giờ bắt đầu khung giờ mà không phụ thuộc mạng hay bị trễ.',
      batteryTitle: 'Tắt tối ưu pin (Battery)',
      batteryDesc: 'Đặc biệt quan trọng trên MIUI / HyperOS',
      batteryDetail:
        'HyperOS 1 kiểm soát chạy nền rất gắt. Tắt tối ưu pin giúp bộ hẹn giờ tự động đổi nhạc chuông không bị hệ thống đóng băng.',
      miuiHeader: '📱 Thiết lập cho Xiaomi / HyperOS 1+',
      currentDevicePrefix: 'Thiết bị hiện tại:',
      miuiStep1: 'Autostart (Tự khởi chạy) → Bật ON cho AutoRingtone',
      miuiStep2: 'Tiết kiệm pin MIUI/HyperOS → Không hạn chế (No restrictions)',
      miuiStep3:
        'Quyền khác → Thay đổi cài đặt hệ thống (Modify system settings) → Cho phép',
      openAutostartBtn: '🚀 Mở cài đặt Autostart (HyperOS / MIUI)',
      openBatteryBtn: '⚡ Mở Tiết kiệm pin HyperOS / MIUI',
      miuiFootnote:
        '* HyperOS 1 quản lý tiến trình nền chặt hơn HyperOS 3. Bật đủ Autostart + Không hạn chế pin giúp lịch tự động hoạt động xuyên suốt kể cả khi khởi động lại máy hoặc tắt mạng.',
      recheckBtn: '↻ Kiểm tra lại quyền',
      requiredBadge: 'BẮT BUỘC',
      statusChecking: 'Đang kiểm tra...',
      statusGranted: 'Đã cấp quyền',
      statusDenied: 'Chưa cấp quyền',
      setupPermBtn: 'Thiết lập quyền này',
    },
    about: {
      heroTagline:
        'Tự động đổi nhạc chuông & âm báo thông minh dành riêng cho Xiaomi HyperOS',
      langSectionTitle: 'Ngôn ngữ hiển thị',
      langSectionSub: 'Chuyển đổi giao diện Tiếng Việt / Tiếng Anh',
      generalTitle: 'Thông tin chung',
      generalSub: 'Mục đích và giải pháp',
      generalP1Rest:
        ' ra đời nhằm giải quyết sự nhàm chán khi điện thoại chỉ phát duy nhất một đoạn chuông lặp đi lặp lại.',
      generalP2:
        'Ứng dụng cho phép bạn gán từng bài hát yêu thích theo từng khoảng thời gian sinh hoạt trong ngày (giờ làm việc, giờ nghỉ ngơi, giờ tập luyện), tự động chọn ngẫu nhiên các bài hát trong danh sách và tương thích hoàn hảo từ cuộc gọi SIM thường đến các ứng dụng gọi phổ biến như Zalo, Messenger.',
      featuresTitle: 'Tính năng nổi bật',
      featuresSub: 'Trải nghiệm mượt mà & tối ưu',
      f1Title: 'Đổi nhạc chuông theo khung giờ',
      f1Desc:
        'Tạo linh hoạt các khung giờ trong ngày (sáng, trưa, tối...). Mỗi khung giờ có danh sách bài hát riêng và tự động đảo nhạc ngẫu nhiên.',
      f2Title: 'Âm thông báo & tin nhắn SMS',
      f2Desc:
        'Tuỳ biến âm báo tin nhắn và thông báo Android riêng biệt, tương thích sâu với cả 2 SIM trên hệ điều hành Xiaomi HyperOS.',
      f3Title: 'Hoạt động nền bền bỉ',
      f3Desc:
        'Tích hợp bộ lập lịch phần cứng (AlarmManager), tự động phục hồi ngay khi khởi động lại máy mà không lo bị hệ thống dọn dẹp bộ nhớ tắt ngầm.',
      f4Title: 'Bảo mật chuyên biệt thiết bị',
      f4Desc:
        'Bảo vệ thiết bị bằng chữ ký mã hoá C++ JNI Native và whitelist số serial, chống can thiệp hoặc sửa đổi ứng dụng.',
      teamTitle: 'Đội ngũ phát triển',
      teamSub: 'Ý tưởng & thực hiện dự án',
      pqtRole: 'Lên ý tưởng, Thiết kế & Trực tiếp thực hiện',
      geminiRole: 'Đồng hành kiến tạo kiến trúc & Hỗ trợ lập trình',
      footerText: 'Thiết kế & xây dựng với tất cả tâm huyết',
    },
    security: {
      lockedTitle: 'Thiết bị bị khóa truy cập',
      reasonNonXiaomi:
        'Ứng dụng chỉ được phép hoạt động trên thiết bị Xiaomi chính hãng đã đăng ký bảo mật.',
      reasonTampered:
        'Phát hiện tệp cài đặt APK đã bị can thiệp hoặc chữ ký số không hợp lệ. Toàn bộ tính năng đã bị vô hiệu hóa.',
      reasonDebugger:
        'Phát hiện công cụ dịch ngược / can thiệp tiến trình trái phép. Ứng dụng đã tự động khóa bảo vệ.',
      reasonUnauthorized:
        'Thiết bị Xiaomi này chưa nằm trong danh sách cấp phép sử dụng ứng dụng. Toàn bộ tính năng đã bị khóa.',
      deviceLabel: 'Thiết bị',
      deviceIdLabel: 'Mã định danh thiết bị',
      copiedBtn: 'Đã chép',
      copyBtn: 'Sao chép',
      exitBtn: 'Đóng ứng dụng',
    },
  },
  en: {
    common: {
      version: (v: string) => `Version ${v}`,
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      setup: 'Set Up',
      errorTitle: 'Error',
      failedTitle: 'Failed',
      successTitle: 'Success',
      unknown: 'Unknown',
      notSet: 'Not set',
      langSwitchLabel: 'EN',
      langName: 'English',
    },
    tabs: {
      ringtone: 'Ringtone',
      notification: 'Notifications',
      about: 'About',
    },
    home: {
      subtitle: 'Auto-change ringtones by time schedule',
      permWarningTitle: 'Permission Required',
      permWarningSub: 'Tap to configure required permissions',
      schedulerTitle: 'Auto Scheduler',
      schedulerRunning: 'Running',
      schedulerStopped: 'Disabled',
      activeSlotsCount: (n: number) => ` · ${n} active slot${n === 1 ? '' : 's'}`,
      activeSlotPrefix: 'Active slot: ',
      currentRingtoneHeader: 'Current Ringtone',
      testRandomBtn: '🎲 Test Random',
      audioFileSub: 'Audio file',
      systemRingtoneDefault: 'System Ringtone',
      slotsHeader: (n: number) => `Time Slots (${n})`,
      addBtn: '＋ Add',
      emptySlotsTitle: 'No time slots yet',
      emptySlotsSub: "Tap '+ Add' to create your first time slot with a custom playlist",
      devTriggerBtn: '🛠 [DEV] Trigger Task Now',
      slotActiveBadge: 'Active',
      intervalOnce: '⏱ Once per slot',
      intervalOneHour: '🔄 Every 1 hour',
      intervalHours: (h: number) => `🔄 Every ${h} hours`,
      intervalMinutes: (m: number) => `🔄 Every ${m} mins`,
      slotSummary: (count: number, intervalText: string) =>
        `🎵 ${count} track${count === 1 ? '' : 's'} · ${intervalText}`,
      alertPermTitle: 'Permission Required',
      alertPermMsg:
        'The app requires Modify System Settings (WRITE_SETTINGS) permission to set the ringtone. Would you like to open the setup screen?',
      alertCannotTestTitle: 'Cannot Test',
      alertCannotTestMsg:
        'Please create and enable at least one time slot with tracks in its playlist before testing.',
      alertTestSuccessMsg: (label: string, isActive: boolean, songTitle: string) =>
        `Randomly changed ringtone from slot "${label}"${isActive ? ' (Active)' : ' (Test)'} to:\n🎵 ${songTitle}`,
      alertTestFailedMsg:
        'Could not update the system ringtone. Please check permissions or the audio file.',
      alertErrorMsg: (msg: string) => `An error occurred: ${msg}`,
    },
    addSlot: {
      hourLabel: 'HOUR',
      minuteLabel: 'MIN',
      editHeader: 'Edit Time Slot',
      addHeader: 'New Time Slot',
      slotNameHeader: 'Slot Name',
      slotNamePlaceholder: 'E.g., Morning, Work, Study...',
      timeRangeHeader: 'Time Range',
      startLabel: 'Start',
      endLabel: 'End',
      rotationTitle: 'Periodic Rotation',
      rotationCustomSub: (m: string) => `Randomize every ${m} mins`,
      rotationOnceSub: 'Change once when slot starts',
      rotationOneHourSub: 'Randomize every 1 hour',
      rotationHoursSub: (h: number) => `Randomize every ${h} hours`,
      rotationMinutesSub: (m: number) => `Randomize every ${m} mins`,
      rotationOffSub: 'Off (change once at start)',
      frequencyLabel: 'ROTATION FREQUENCY',
      preset1h: '1 hour',
      preset30m: '30 mins',
      preset2h: '2 hours',
      preset3h: '3 hours',
      presetOnce: 'Once only',
      presetCustom: '✏️ Custom',
      customEveryLabel: 'Randomize every:',
      customMinutesUnit: 'mins',
      playlistHeader: (n: number) => `Playlist (${n} track${n === 1 ? '' : 's'})`,
      playlistSub: 'Picks 1 random track each rotation',
      pickAudioBtn: '＋ Select Audio Files',
      emptyPlaylistText: 'No tracks yet. Add mp3/m4a/ogg files from device storage.',
      saveChangesBtn: '💾 Save Changes',
      createSlotBtn: '✓ Create Time Slot',
      pickStartTitle: 'Select Start Time',
      pickEndTitle: 'Select End Time',
      alertPickErrMsg: 'Could not select audio files',
      alertMissingNameTitle: 'Missing Name',
      alertMissingNameMsg: 'Please enter a name for this time slot',
      alertEmptyPlaylistTitle: 'Empty Playlist',
      alertEmptyPlaylistMsg: 'Please add at least 1 track to the playlist',
      alertDeleteTitle: 'Delete Time Slot',
      alertDeleteMsg: (label: string) => `Delete "${label}"?`,
    },
    notification: {
      title: 'Notification Sound',
      subtitle: 'Change SMS & notification tones right in the app',
      permWarningTitle: 'System Permission Required',
      permWarningSub: 'Tap to enable Modify System Settings permission before changing tones',
      currentHeader: 'Current Tone',
      stopBtn: '⏹ Stop',
      previewBtn: '🔊 Preview',
      randomBtn: '🎲 Random',
      activeOnDeviceSub: 'Currently active on device',
      systemNotifDefault: 'System Notification Tone',
      scopeHeader: 'Apply Scope',
      modeBothLabel: '🔔 + 💬 Both',
      modeBothDesc:
        'Applies to both default Android notifications & SMS tones (supports Dual-SIM on Xiaomi/HyperOS).',
      modeNotifLabel: '🔔 Notifications',
      modeNotifDesc: 'Only changes the default Android system notification sound.',
      modeSmsLabel: '💬 SMS Messages',
      modeSmsDesc:
        'Changes the SMS ringtone on Xiaomi/HyperOS (uses default notification sound on stock Android).',
      libraryHeader: (n: number) => `My Tone Library (${n})`,
      librarySub: 'Pick mp3 / m4a / ogg / wav files from device',
      pickAndApplyBtn: '⚡ Pick File & Apply Now',
      addMultipleBtn: '＋ Add Multiple Tones to Library',
      emptyLibraryTitle: 'No custom tones yet',
      emptyLibrarySub:
        'Tap the button above to pick your favorite SMS / notification tones from storage',
      systemTonesTitle: '📱 Built-in System Tones',
      systemTonesSub: 'Quickly select pre-installed system tones (bypasses Themes app)',
      searchPlaceholder: 'Search system tones...',
      noMatchingTones: 'No matching tones found',
      footerTip:
        '💡 Tip: This tone applies to SMS and all apps using "Default notification sound". For apps with custom sounds (like Messenger/Zalo), select "System default sound" in their notification settings to sync.',
      inUsePill: 'Active',
      appliedChip: '✓ Applied',
      applyChip: 'Apply',
      alertPermMsg:
        'The app requires Modify System Settings permission to change notification / SMS tones.',
      alertCannotPlayTitle: 'Cannot Play',
      alertCannotPlayMsg: 'Unable to read this audio file for preview.',
      alertAppliedTitle: 'Applied',
      targetBoth: 'Notifications & SMS',
      targetSms: 'SMS Messages',
      targetNotif: 'System Notifications',
      alertAppliedMsg: (target: string, toneTitle: string) =>
        `Applied tone (${target}):\n🔔 ${toneTitle}`,
      alertApplyFailedMsg:
        'Could not update notification sound. Please check permissions or re-select the audio file.',
      alertPickFileErr: 'Could not pick audio file from storage.',
      alertAddLibErr: 'Could not add audio files to library.',
      alertEmptyRandomTitle: 'No Tones Available',
      alertEmptyRandomMsg:
        'Please add at least 1 audio file to "My Tone Library" before using Random.',
    },
    permissions: {
      header: 'Permissions',
      bannerReadyTitle: 'Required permissions granted',
      bannerNeededTitle: 'Additional permissions needed',
      bannerReadySub:
        'On HyperOS 1+, also enable Autostart & No Battery Restrictions below for 100% reliable background execution',
      bannerNeededSub: 'Tap each item below to configure',
      writeSettingsTitle: 'Modify system settings',
      writeSettingsDesc: 'Required to change ringtones (including SIM 1 & SIM 2)',
      writeSettingsDetail:
        'On Android & HyperOS, changing the ringtone requires the special "Modify system settings" permission. Please enable it manually in Settings.',
      audioReadTitle: 'Music & audio access',
      audioReadDesc: 'Required on HyperOS 1 / Android 13+ for reliable MediaStore access',
      audioReadDetail:
        'Allows the app to read and register ringtone files in storage without being blocked by HyperOS 1.',
      exactAlarmTitle: 'Alarms & exact reminders',
      exactAlarmDesc: 'Ensures minute-accurate ringtone changes even when the screen is off',
      exactAlarmDetail:
        'Allows AlarmManager to wake up the ringtone scheduler right at the start of each time slot with zero delay.',
      batteryTitle: 'Disable battery optimization',
      batteryDesc: 'Critical on Xiaomi MIUI / HyperOS devices',
      batteryDetail:
        'HyperOS 1 strictly restricts background processes. Disabling battery optimization prevents the system from freezing the auto-scheduler.',
      miuiHeader: '📱 Setup for Xiaomi / HyperOS 1+',
      currentDevicePrefix: 'Current device:',
      miuiStep1: 'Autostart → Turn ON for AutoRingtone',
      miuiStep2: 'MIUI/HyperOS Battery Saver → No restrictions',
      miuiStep3: 'Other permissions → Modify system settings → Allow',
      openAutostartBtn: '🚀 Open Autostart Settings (HyperOS / MIUI)',
      openBatteryBtn: '⚡ Open Battery Saver (HyperOS / MIUI)',
      miuiFootnote:
        '* HyperOS 1 manages background tasks more aggressively than HyperOS 3. Enabling Autostart + No battery restrictions ensures seamless scheduling even after reboot or offline.',
      recheckBtn: '↻ Re-check Permissions',
      requiredBadge: 'REQUIRED',
      statusChecking: 'Checking...',
      statusGranted: 'Granted',
      statusDenied: 'Not granted',
      setupPermBtn: 'Configure Permission',
    },
    about: {
      heroTagline:
        'Smart automatic ringtone & notification sound changer crafted for Xiaomi HyperOS',
      langSectionTitle: 'Display Language',
      langSectionSub: 'Switch interface between Vietnamese & English',
      generalTitle: 'General Information',
      generalSub: 'Purpose & solution',
      generalP1Rest:
        ' was created to eliminate the boredom of hearing the exact same phone ringtone over and over every day.',
      generalP2:
        'The app lets you assign your favorite playlists to different daily time slots (work, rest, workout), automatically randomizes tracks, and works seamlessly across both regular SIM calls and VoIP apps like Zalo and Messenger.',
      featuresTitle: 'Key Features',
      featuresSub: 'Smooth & deeply optimized experience',
      f1Title: 'Scheduled Ringtone Rotation',
      f1Desc:
        'Create flexible daily time slots (morning, afternoon, night...). Each slot has its own playlist and automatically rotates tracks at random.',
      f2Title: 'Notification & SMS Tones',
      f2Desc:
        'Customize Android notification and SMS sounds independently, with deep Dual-SIM support on Xiaomi HyperOS.',
      f3Title: 'Reliable Background Execution',
      f3Desc:
        'Powered by hardware-level AlarmManager scheduling that automatically recovers after reboot without being killed by memory cleaners.',
      f4Title: 'Device-Bound Hardware Security',
      f4Desc:
        'Protected by Native C++ JNI cryptographic signature verification and hardware serial whitelisting against tampering.',
      teamTitle: 'Development Team',
      teamSub: 'Project concept & implementation',
      pqtRole: 'Concept, Product Design & Lead Implementation',
      geminiRole: 'Architecture Co-Creator & Engineering Partner',
      footerText: 'Designed & built with passion',
    },
    security: {
      lockedTitle: 'Device Access Locked',
      reasonNonXiaomi:
        'This application is restricted to authorized genuine Xiaomi devices only.',
      reasonTampered:
        'APK tampering or invalid digital signature detected. All features have been disabled.',
      reasonDebugger:
        'Unauthorized reverse-engineering or process hooking tool detected. Security lock engaged.',
      reasonUnauthorized:
        'This Xiaomi device is not on the authorized whitelist. All application features are locked.',
      deviceLabel: 'Device',
      deviceIdLabel: 'Device Identifier',
      copiedBtn: 'Copied',
      copyBtn: 'Copy',
      exitBtn: 'Close Application',
    },
  },
} as const;

export function useTranslation() {
  const lang = useI18nStore(s => s.lang);
  const setLanguage = useI18nStore(s => s.setLanguage);
  const toggleLanguage = useI18nStore(s => s.toggleLanguage);
  return {
    lang,
    t: translations[lang],
    setLanguage,
    toggleLanguage,
  };
}

