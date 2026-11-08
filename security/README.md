# 🔐 Hướng Dẫn Bảo Mật & Sao Lưu Keystore (AutoRingtone Mi)

Tài liệu này dùng để tra cứu lại sau này khi bạn **cài lại Windows, đổi máy tính mới, clone lại dự án từ Git**, hoặc muốn **thêm thiết bị Xiaomi mới** vào danh sách cấp phép sử dụng app.

---

## 1. Danh sách các file QUAN TRỌNG BẮT BUỘC PHẢI SAO LƯU (Backup)

Vì lý do bảo mật, các file chứa khóa ký số riêng tư đã được chặn trong `.gitignore` (sẽ **KHÔNG** được đẩy lên GitHub/GitLab). Bạn hãy copy **3 file dưới đây** cất vào nơi an toàn riêng (Google Drive cá nhân, USB, hoặc trình quản lý mật khẩu Bitwarden / 1Password):

| STT | Tên file | Đường dẫn trong Project | Đường dẫn tuyệt đối hiện tại | Vai trò |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **`autoringtone-release.jks`** | `android/app/autoringtone-release.jks` | `D:\000\ReactNativeProjects\autoSetRandomRingtonesMi\android\app\autoringtone-release.jks` | **Chìa khóa gốc RSA 4096-bit** dùng để ký số file APK (có hiệu lực đến năm 2054). |
| **2** | **`keystore.properties`** | `android/keystore.properties` | `D:\000\ReactNativeProjects\autoSetRandomRingtonesMi\android\keystore.properties` | Chứa **mật khẩu (`storePassword`, `keyPassword`)** và **`keyAlias`** để Gradle & script bảo mật đọc được file `.jks` ở trên. |
| **3** | **`allowed-devices.json`** | `security/allowed-devices.json` | `D:\000\ReactNativeProjects\autoSetRandomRingtonesMi\security\allowed-devices.json` | Danh sách mã **Serial / Mã định danh thiết bị** của các máy Xiaomi được phép mở app. |

> ⚠️ **CẢNH BÁO QUAN TRỌNG — Tại sao không được làm mất 2 file Keystore (số 1 & số 2)?**
> 1. **Cài đè bản cập nhật**: Android bắt buộc bản APK mới phải được ký bằng **đúng file `.jks` cũ** thì mới cho phép cài đè nâng cấp mà không mất dữ liệu khung giờ & danh sách nhạc đã tạo trên máy.
> 2. **Giữ cố định Mã định danh thiết bị trên HyperOS**: Từ Android 8+ đến HyperOS 1/2/3, hệ điều hành tính toán `Mã định danh thiết bị` dựa trên **Cặp khóa chữ ký của APK + Phần cứng máy**. Nếu làm mất file `.jks` và phải tạo Keystore mới, các máy HyperOS chưa Root sẽ sinh ra một Mã định danh khác và bạn sẽ phải cập nhật lại danh sách `allowed-devices.json`.
> 3. **Tuyệt đối không chia sẻ** 2 file `autoringtone-release.jks` và `keystore.properties` cho người lạ. Chỉ người giữ 2 file này mới có thể biên dịch & ký ra bản APK hợp lệ vượt qua được lớp kiểm tra chữ ký C++.

---

## 2. Cách khôi phục khi sang máy tính mới / Clone lại code từ Git

Khi bạn tải source code về một máy tính mới:

1. Chép lại file **`autoringtone-release.jks`** đặt đúng vào thư mục:
   ```text
   android/app/autoringtone-release.jks
   ```
2. Chép lại file **`keystore.properties`** đặt đúng vào thư mục:
   ```text
   android/keystore.properties
   ```
3. Kiểm tra danh sách thiết bị tại:
   ```text
   security/allowed-devices.json
   ```
4. Chạy `yarn install` rồi gõ `yarn b` để xuất APK như bình thường.

---

## 3. Cách cấp quyền thêm điện thoại Xiaomi mới sau này

### Trường hợp A: Máy Xiaomi đã biết mã Serial phần cứng (máy có Root hoặc Android đời cũ)
1. Mở file `security/allowed-devices.json`.
2. Thêm mã Serial vào mảng `"allowedIds"`:
   ```json
   {
     "requireXiaomiBrand": true,
     "allowedIds": [
       "79f8a214",
       "59a422df",
       "2b88b96a",
       "serial_may_xiaomi_moi"
     ]
   }
   ```
3. Chạy lệnh xuất APK:
   ```bash
   yarn b
   ```
   *(Lệnh `yarn b` và `yarn ok` đã được cấu hình tự động chạy `scripts/sync-security.js` để băm HMAC-SHA256 + mã hóa XOR mã mới vào C++ trước khi biên dịch).*

### Trường hợp B: Máy Xiaomi chạy HyperOS 1 / 2 / 3 chưa Root (bị Google SELinux ẩn Serial gốc)
Do chính sách bảo mật SELinux của Android 10–16 không cho ứng dụng thường đọc mã Serial phần cứng gốc:
1. Cài bản APK hiện tại lên chiếc Xiaomi mới đó và mở app lên.
2. App sẽ chặn ở màn hình **Thiết bị bị khóa truy cập** và hiển thị dòng **Mã định danh thiết bị** (mã hex 16 ký tự gắn cố định với phần cứng chiếc Xiaomi đó).
3. Bấm nút **Sao chép** ngay trên màn hình khóa để lấy mã đó gửi về máy tính.
4. Dán mã vừa chép vào mảng `"allowedIds"` trong `security/allowed-devices.json` (giữ nguyên cả các mã cũ).
5. Chạy lại lệnh:
   ```bash
   yarn b
   ```
6. Cài đè file APK mới xuất (`D:\Downloads\autoringtone-mi-<version>.apk`) lên chiếc Xiaomi đó → từ nay về sau máy sẽ tự động mở khóa vĩnh viễn!

---

## 4. Tóm tắt kiến trúc bảo mật chống dịch ngược trong dự án

1. **Tầng C++ Native (`modules/expo-ringtone/android/src/main/cpp/native_security.cpp`)**:
   - Biên dịch thẳng ra thư viện nhị phân `libautoringtone_sec.so` với cờ `-O3 -fvisibility=hidden -s` (xóa bảng ký hiệu debug, ẩn tên hàm qua `JNI_OnLoad` / `RegisterNatives`).
   - Toàn bộ danh sách `allowedIds`, tên package `com.autoringtone.mi`, khóa bí mật HMAC và dấu vân tay chứng chỉ SHA-256 của Keystore đều được script `scripts/sync-security.js` mã hóa XOR từng byte vào `security_whitelist_gen.h` — dùng công cụ quét chuỗi nhị phân sẽ **không tìm thấy bất kỳ mã Serial nào**.
   - Tự đọc chứng chỉ X.509 của APK ngay trong C++ để kiểm tra **SHA-256 Certificate Pinning**: nếu hacker dùng `APKTool` / `MT Manager` giải nén APK, chỉnh sửa giao diện hoặc mã nguồn rồi ký lại bằng chữ ký khác, C++ phát hiện sai chữ ký và khóa cứng toàn bộ tính năng.
   - Quét `/proc/self/maps` và `TracerPid` để tự động khóa khi phát hiện công cụ can thiệp bộ nhớ như `Frida`, `Xposed`, hoặc trình gỡ lỗi `ptrace`.
   - Kiểm tra trực tiếp thuộc tính phần cứng nhân Linux (`__system_property_get`) để đảm bảo máy là **Xiaomi / Redmi / POCO chính hãng** và chặn máy ảo giả lập.
2. **Khóa kép toàn bộ tính năng ở tầng Native Kotlin (`DeviceSecurity.kt`)**:
   - Tất cả hàm đặt nhạc chuông, đặt chuông thông báo/SMS, nghe thử, lưu file âm thanh, hẹn giờ `AlarmManager` và `BootReceiver` đều bắt buộc gọi `DeviceSecurity.isAuthorized(context)` trước khi thực thi.
3. **Làm rối mã nguồn & Đóng gói an toàn**:
   - **R8 Full Mode + Shrink Resources** (`proguard-android-optimize.txt`) đổi tên lớp/hàm và xóa sạch toàn bộ `Log.d` / `Log.v` / `Log.i` khỏi bản APK phát hành.
   - Mã JavaScript được biên dịch sang nhị phân **Hermes Bytecode** (loại bỏ hoàn toàn file `.map`).
   - Đặt `android:allowBackup="false"` trong `AndroidManifest.xml` để chặn sao chép dữ liệu nội bộ qua `adb backup`.

---

## 5. Bảng lệnh nhanh thường dùng

| Lệnh | Tác dụng |
| :--- | :--- |
| `yarn upd` | Tăng phiên bản tự động (`1.1.0` → `1.1.1` ... `1.1.9` → `1.2.0`) cho cả `package.json`, `app.json` và `build.gradle`. |
| `yarn sec` | Chỉ chạy đồng bộ danh sách `security/allowed-devices.json` + chữ ký Keystore sang header C++ (tự động chạy sẵn khi gõ `yarn b` hoặc `yarn ok`). |
| `yarn b` | Đồng bộ bảo mật C++ → Build APK Release (`arm64-v8a`, R8 obfuscated, ký Keystore riêng) → Xuất thẳng ra `D:\Downloads\autoringtone-mi-<version>.apk`. |
| `yarn ok` | Đồng bộ bảo mật C++ → Chạy trực tiếp bản Debug lên điện thoại cắm cáp USB. |
| `yarn c` | Dọn sạch bộ nhớ đệm biên dịch Gradle, C++ (`D:/cxx`, `D:/cxx-sec`) và npm cache. |

