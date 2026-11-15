package expo.modules.ringtone

import android.content.ClipData
import android.content.ClipboardManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val TAG = "ExpoRingtone"

class ExpoRingtoneModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is null" }

  override fun definition() = ModuleDefinition {
    Name("ExpoRingtone")

    OnDestroy {
      RingtoneHelper.stopPreviewSound()
    }

    // ─── Kiểm tra bảo mật thiết bị & tính toàn vẹn APK từ tầng Native C++ (.so) ─
    AsyncFunction("verifyDeviceSecurity") {
      DeviceSecurity.getSecurityReport(context)
    }

    Function("copyTextToClipboard") { text: String ->
      try {
        val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        cm?.setPrimaryClip(ClipData.newPlainText("DeviceID", text))
        true
      } catch (_: Throwable) {
        false
      }
    }

    // ─── Set ringtone từ URI (content:// hoặc file://), tương thích HyperOS 1+ ──
    AsyncFunction("setSystemRingtone") { uriString: String, titleHint: String? ->
      if (!DeviceSecurity.isAuthorized(context)) return@AsyncFunction false
      RingtoneHelper.setSystemRingtone(context, uriString, titleHint)
    }

    // ─── Set âm thông báo / tin nhắn (mode = "both" | "notification" | "sms") ───
    AsyncFunction("setSystemNotificationSound") { uriString: String, titleHint: String?, mode: String? ->
      if (!DeviceSecurity.isAuthorized(context)) return@AsyncFunction false
      RingtoneHelper.setSystemNotificationSound(
        context = context,
        uriString = uriString,
        titleHint = titleHint,
        mode = mode ?: "both"
      )
    }

    // ─── Lấy âm thông báo hiện tại ──────────────────────────────────────────────
    AsyncFunction("getCurrentNotificationSound") {
      if (!DeviceSecurity.isAuthorized(context)) return@AsyncFunction null
      RingtoneHelper.getCurrentNotificationSound(context)
    }

    // ─── Lấy danh sách âm thông báo mặc định có sẵn trên máy ───────────────────
    AsyncFunction("getSystemNotificationTones") {
      if (!DeviceSecurity.isAuthorized(context)) return@AsyncFunction emptyList<Map<String, String>>()
      RingtoneHelper.getSystemNotificationTones(context)
    }

    // ─── Phát / dừng nghe thử âm báo trong app ──────────────────────────────────
    AsyncFunction("previewSound") { uriString: String ->
      if (!DeviceSecurity.isAuthorized(context)) return@AsyncFunction false
      RingtoneHelper.previewSound(context, uriString)
    }

    Function("stopPreviewSound") {
      RingtoneHelper.stopPreviewSound()
    }

    // ─── Lưu file âm thanh vào bộ nhớ trong bền vững của app (tránh bị Cleaner xoá) ─
    AsyncFunction("persistAudioFile") { uriString: String, displayName: String? ->
      if (!DeviceSecurity.isAuthorized(context)) {
        throw SecurityException("Unauthorized device")
      }
      try {
        RingtoneHelper.persistAudioFile(context, uriString, displayName)
      } catch (e: Throwable) {
        Log.w(TAG, "persistAudioFile fallback to original URI (${e.message})")
        uriString
      }
    }

    // ─── Đồng bộ lịch sang Native AlarmManager (chạy ổn định trên HyperOS 1 -> 3+) ─
    AsyncFunction("syncNativeSchedule") { slotsJson: String, enabled: Boolean, lastSetJson: String?, runNow: Boolean ->
      if (!DeviceSecurity.isAuthorized(context)) return@AsyncFunction null
      RingtoneAlarmScheduler.syncSchedule(
        context = context,
        slotsJson = slotsJson,
        enabled = enabled,
        lastSetJsonFromJs = lastSetJson,
        runNow = runNow
      )?.toMap()
    }

    // ─── Lấy thông tin lần đổi tự động gần nhất từ Native ───────────────────────
    AsyncFunction("getNativeLastSet") {
      if (!DeviceSecurity.isAuthorized(context)) return@AsyncFunction null
      RingtoneAlarmScheduler.getLastSet(context)?.toMap()
    }

    // ─── Cấu hình đổi nhạc chuông sau 5 phút kể từ khi có cuộc gọi đến ──────────
    AsyncFunction("getPostCallRotateConfig") {
      if (!DeviceSecurity.isAuthorized(context)) return@AsyncFunction null
      RingtoneAlarmScheduler.getPostCallConfigMap(context)
    }

    AsyncFunction("setPostCallRotateConfig") { enabled: Boolean, delayMinutes: Int ->
      if (!DeviceSecurity.isAuthorized(context)) return@AsyncFunction null
      RingtoneAlarmScheduler.setPostCallConfig(context, enabled, delayMinutes)
    }

    // ─── Kiểm tra & mở quyền NotificationListener (nhận diện cuộc gọi Zalo/Messenger/Telegram) ─
    AsyncFunction("checkNotificationListenerPermission") {
      if (!DeviceSecurity.isAuthorized(context)) return@AsyncFunction false
      isNotificationListenerEnabled(context)
    }

    Function("openNotificationListenerSettings") {
      if (DeviceSecurity.isAuthorized(context)) {
        val cn = ComponentName(context.packageName, CallDetectNotificationService::class.java.name)
        val detailIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).apply {
            putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, cn.flattenToString())
          }
        } else {
          Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        }
        startActivityWithFallbacks(
          detailIntent,
          Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS),
          appDetailsIntent()
        )
      }
    }

    // ─── Kiểm tra quyền WRITE_SETTINGS ──────────────────────────────────────────
    AsyncFunction("checkWriteSettingsPermission") {
      if (!DeviceSecurity.isAuthorized(context)) return@AsyncFunction false
      try {
        Settings.System.canWrite(context)
      } catch (e: Throwable) {
        Log.e(TAG, "checkWriteSettingsPermission error: ${e.message}")
        false
      }
    }

    // ─── Mở màn hình cấp quyền WRITE_SETTINGS ───────────────────────────────────
    Function("openWriteSettingsScreen") {
      if (DeviceSecurity.isAuthorized(context)) {
        startActivityWithFallbacks(
          Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS).apply {
            data = Uri.parse("package:${context.packageName}")
          },
          Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS),
          appDetailsIntent()
        )
      }
    }

    // ─── Lấy ringtone hiện tại (an toàn, không crash trên HyperOS 1) ────────────
    AsyncFunction("getCurrentRingtone") {
      if (!DeviceSecurity.isAuthorized(context)) return@AsyncFunction null
      RingtoneHelper.getCurrentRingtone(context)
    }

    // ─── Kiểm tra Battery Optimization ──────────────────────────────────────────
    AsyncFunction("isIgnoringBatteryOptimizations") {
      if (!DeviceSecurity.isAuthorized(context)) return@AsyncFunction false
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
          pm.isIgnoringBatteryOptimizations(context.packageName)
        } else {
          true
        }
      } catch (_: Throwable) {
        false
      }
    }

    // ─── Mở màn hình tắt Battery Optimization ───────────────────────────────────
    Function("openBatteryOptimizationSettings") {
      if (DeviceSecurity.isAuthorized(context) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        startActivityWithFallbacks(
          Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:${context.packageName}")
          },
          Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
          appDetailsIntent()
        )
      }
    }

    // ─── Kiểm tra & mở quyền Báo thức chính xác (Android 12+ / HyperOS 1+) ──────
    AsyncFunction("canScheduleExactAlarms") {
      if (!DeviceSecurity.isAuthorized(context)) return@AsyncFunction false
      RingtoneAlarmScheduler.canScheduleExactAlarms(context)
    }

    Function("openExactAlarmSettings") {
      if (DeviceSecurity.isAuthorized(context) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        startActivityWithFallbacks(
          Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
            data = Uri.parse("package:${context.packageName}")
          },
          Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM),
          appDetailsIntent()
        )
      }
    }

    // ─── Thông tin thiết bị Xiaomi / HyperOS / MIUI ─────────────────────────────
    AsyncFunction("getDeviceSystemInfo") {
      mapOf(
        "isXiaomi" to RingtoneHelper.isXiaomiDevice(),
        "osVersionName" to RingtoneHelper.getHyperOsOrMiuiVersion(),
        "sdkInt" to Build.VERSION.SDK_INT,
        "manufacturer" to (Build.MANUFACTURER ?: ""),
        "model" to (Build.MODEL ?: "")
      )
    }

    // ─── Mở nhanh cài đặt Autostart đặc thù của Xiaomi MIUI / HyperOS 1+ ───────────────
    Function("openMiuiAutostartSettings") {
      if (DeviceSecurity.isAuthorized(context)) {
        val pkg = context.packageName
        startActivityWithFallbacks(
          Intent().apply {
            component = ComponentName(
              "com.miui.securitycenter",
              "com.miui.permcenter.autostart.AutoStartManagementActivity"
            )
          },
          Intent("miui.intent.action.OP_AUTO_START").apply {
            addCategory(Intent.CATEGORY_DEFAULT)
          },
          Intent("miui.intent.action.APP_PERM_EDITOR").apply {
            setClassName(
              "com.miui.securitycenter",
              "com.miui.permcenter.permissions.PermissionsEditorActivity"
            )
            putExtra("extra_pkgname", pkg)
          },
          appDetailsIntent()
        )
      }
    }

    // ─── Mở nhanh cài đặt Tiết kiệm pin MIUI / HyperOS PowerKeeper ──────────────
    Function("openMiuiBatterySaverSettings") {
      if (DeviceSecurity.isAuthorized(context)) {
        val pkg = context.packageName
        val appLabel = try {
          context.applicationInfo.loadLabel(context.packageManager).toString()
        } catch (_: Throwable) {
          "AutoRingtone"
        }
        startActivityWithFallbacks(
          Intent().apply {
            component = ComponentName(
              "com.miui.powerkeeper",
              "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"
            )
            putExtra("package_name", pkg)
            putExtra("package_label", appLabel)
          },
          Intent("miui.intent.action.POWER_HIDE_MODE_ACTIVITY"),
          appDetailsIntent()
        )
      }
    }
  }

  private fun isNotificationListenerEnabled(ctx: Context): Boolean {
    return try {
      val flat = Settings.Secure.getString(ctx.contentResolver, "enabled_notification_listeners")
      if (flat.isNullOrBlank()) return false
      val myPkg = ctx.packageName
      flat.split(":").any { entry ->
        val cn = ComponentName.unflattenFromString(entry)
        cn?.packageName == myPkg
      }
    } catch (_: Throwable) {
      false
    }
  }

  private fun appDetailsIntent(): Intent {
    return Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
      data = Uri.parse("package:${context.packageName}")
    }
  }

  private fun startActivityWithFallbacks(vararg intents: Intent) {
    for (intent in intents) {
      try {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return
      } catch (t: Throwable) {
        Log.d(TAG, "Intent fallback (${intent.action ?: intent.component}): ${t.message}")
      }
    }
  }
}
