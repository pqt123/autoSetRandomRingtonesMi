package expo.modules.ringtone

import android.content.Context
import android.content.ContentValues
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.MediaStore
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoRingtoneModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is null" }

  override fun definition() = ModuleDefinition {
    Name("ExpoRingtone")

    // ─── Set ringtone từ URI (content:// hoặc file://) ──────────────────────
    AsyncFunction("setSystemRingtone") { uriString: String ->
      if (!Settings.System.canWrite(context)) return@AsyncFunction false
      try {
        val uri = Uri.parse(uriString)
        val ringtoneUri = if (uriString.startsWith("file://")) {
          copyToMediaStore(uri)
        } else {
          uri
        }
        RingtoneManager.setActualDefaultRingtoneUri(
          context, RingtoneManager.TYPE_RINGTONE, ringtoneUri
        )
        true
      } catch (e: Exception) {
        e.printStackTrace()
        false
      }
    }

    // ─── Kiểm tra quyền WRITE_SETTINGS ──────────────────────────────────────
    AsyncFunction("checkWriteSettingsPermission") {
      Settings.System.canWrite(context)
    }

    // ─── Mở màn hình cấp quyền WRITE_SETTINGS ───────────────────────────────
    Function("openWriteSettingsScreen") {
      val intent = Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS).apply {
        data = Uri.parse("package:${context.packageName}")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }

    // ─── Lấy ringtone hiện tại ───────────────────────────────────────────────
    AsyncFunction("getCurrentRingtone") {
      val uri = RingtoneManager.getActualDefaultRingtoneUri(
        context, RingtoneManager.TYPE_RINGTONE
      ) ?: return@AsyncFunction null
      val ringtone = RingtoneManager.getRingtone(context, uri)
      mapOf("title" to (ringtone?.getTitle(context) ?: "Unknown"), "uri" to uri.toString())
    }

    // ─── Kiểm tra Battery Optimization ──────────────────────────────────────
    AsyncFunction("isIgnoringBatteryOptimizations") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        pm.isIgnoringBatteryOptimizations(context.packageName)
      } else {
        true
      }
    }

    // ─── Mở màn hình tắt Battery Optimization ───────────────────────────────
    Function("openBatteryOptimizationSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val intent = Intent(
          Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
        ).apply {
          data = Uri.parse("package:${context.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
      }
    }
  }

  // ─── Helper: Copy file:// URI vào MediaStore ─────────────────────────────
  private fun copyToMediaStore(fileUri: Uri): Uri {
    val fileName = fileUri.lastPathSegment ?: "ringtone.mp3"
    val values = ContentValues().apply {
      put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
      put(MediaStore.MediaColumns.MIME_TYPE, "audio/mpeg")
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        put(MediaStore.MediaColumns.RELATIVE_PATH, "Ringtones/")
        put(MediaStore.MediaColumns.IS_PENDING, 1)
      }
      put(MediaStore.Audio.Media.IS_RINGTONE, true)
    }

    val resolver = context.contentResolver
    val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
    } else {
      @Suppress("DEPRECATION")
      MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
    }

    val newUri = resolver.insert(collection, values)
      ?: throw Exception("Failed to create MediaStore entry")

    resolver.openOutputStream(newUri)?.use { out ->
      resolver.openInputStream(fileUri)?.use { it.copyTo(out) }
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      resolver.update(newUri, ContentValues().apply {
        put(MediaStore.MediaColumns.IS_PENDING, 0)
      }, null, null)
    }

    return newUri
  }
}
