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
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val TAG = "ExpoRingtone"

class ExpoRingtoneModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is null" }

  override fun definition() = ModuleDefinition {
    Name("ExpoRingtone")

    // ─── Set ringtone từ URI (content:// hoặc file://) ──────────────────────
    AsyncFunction("setSystemRingtone") { uriString: String ->
      Log.d(TAG, "=== setSystemRingtone called ===")
      Log.d(TAG, "  URI: $uriString")
      Log.d(TAG, "  Android SDK: ${Build.VERSION.SDK_INT}  (Android 16 = 36)")
      Log.d(TAG, "  Device: ${Build.MANUFACTURER} ${Build.MODEL}")

      // Bước 1: Kiểm tra quyền WRITE_SETTINGS
      val canWrite = Settings.System.canWrite(context)
      Log.d(TAG, "  canWrite(WRITE_SETTINGS): $canWrite")
      if (!canWrite) {
        Log.w(TAG, "  ❌ WRITE_SETTINGS permission NOT granted — returning false")
        return@AsyncFunction false
      }

      try {
        val uri = Uri.parse(uriString)
        Log.d(TAG, "  Parsed URI scheme: ${uri.scheme}")

        // Bước 2: Xác định URI cuối cùng để set
        // RingtoneManager.setActualDefaultRingtoneUri() CHỈ chấp nhận content://media/ URI.
        // Bất kỳ URI nào khác (file://, content://com.android.fileexplorer.documents/..., v.v.)
        // đều bị Android silently reject mà không throw exception.
        val ringtoneUri = if (uriString.startsWith("content://media/")) {
          Log.d(TAG, "  URI is already MediaStore (content://media/) → using directly")
          uri
        } else {
          // file:// hoặc external content:// (document picker, file manager, v.v.)
          // → phải copy vào MediaStore trước
          Log.d(TAG, "  URI is NOT MediaStore (scheme=${uri.scheme}, authority=${uri.authority})")
          Log.d(TAG, "  → copying to MediaStore first...")
          try {
            val result = copyToMediaStore(uri)
            Log.d(TAG, "  copyToMediaStore result: $result")
            result
          } catch (e: Exception) {
            Log.e(TAG, "  ❌ copyToMediaStore FAILED: ${e.javaClass.simpleName}: ${e.message}", e)
            return@AsyncFunction false
          }
        }

        Log.d(TAG, "  Final ringtoneUri: $ringtoneUri")

        // Bước 3: Gọi RingtoneManager.setActualDefaultRingtoneUri
        Log.d(TAG, "  Calling RingtoneManager.setActualDefaultRingtoneUri...")
        try {
          RingtoneManager.setActualDefaultRingtoneUri(
            context, RingtoneManager.TYPE_RINGTONE, ringtoneUri
          )
          Log.d(TAG, "  RingtoneManager call completed (no exception thrown)")
        } catch (e: SecurityException) {
          Log.e(TAG, "  ❌ SecurityException in setActualDefaultRingtoneUri: ${e.message}", e)
          return@AsyncFunction false
        } catch (e: Exception) {
          Log.e(TAG, "  ❌ Exception in setActualDefaultRingtoneUri: ${e.javaClass.simpleName}: ${e.message}", e)
          return@AsyncFunction false
        }

        // Bước 4: Verify bằng cách đọc lại ringtone hiện tại
        val verifyUri = RingtoneManager.getActualDefaultRingtoneUri(
          context, RingtoneManager.TYPE_RINGTONE
        )
        Log.d(TAG, "  Verify — current ringtone after set: $verifyUri")

        val success = verifyUri?.toString() == ringtoneUri.toString()
        if (success) {
          Log.d(TAG, "  ✅ Ringtone set and VERIFIED successfully!")
        } else {
          Log.w(TAG, "  ⚠️ setActualDefaultRingtoneUri ran without exception, but verify FAILED")
          Log.w(TAG, "     Expected: $ringtoneUri")
          Log.w(TAG, "     Actual:   $verifyUri")
          Log.w(TAG, "     This may be a Xiaomi/MIUI system restriction")
        }

        return@AsyncFunction success
      } catch (e: Exception) {
        Log.e(TAG, "  ❌ Unexpected error: ${e.javaClass.simpleName}: ${e.message}", e)
        e.printStackTrace()
        false
      }
    }

    // ─── Kiểm tra quyền WRITE_SETTINGS ──────────────────────────────────────
    AsyncFunction("checkWriteSettingsPermission") {
      val result = Settings.System.canWrite(context)
      Log.d(TAG, "checkWriteSettingsPermission: $result")
      result
    }

    // ─── Mở màn hình cấp quyền WRITE_SETTINGS ───────────────────────────────
    Function("openWriteSettingsScreen") {
      Log.d(TAG, "openWriteSettingsScreen called")
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
      ) ?: run {
        Log.d(TAG, "getCurrentRingtone: null (no ringtone set)")
        return@AsyncFunction null
      }
      val ringtone = RingtoneManager.getRingtone(context, uri)
      val title = ringtone?.getTitle(context) ?: "Unknown"
      Log.d(TAG, "getCurrentRingtone: title=$title uri=$uri")
      mapOf("title" to title, "uri" to uri.toString())
    }

    // ─── Kiểm tra Battery Optimization ──────────────────────────────────────
    AsyncFunction("isIgnoringBatteryOptimizations") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val result = pm.isIgnoringBatteryOptimizations(context.packageName)
        Log.d(TAG, "isIgnoringBatteryOptimizations: $result")
        result
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

  // ─── Helper: Copy file:// hoặc document URI vào MediaStore ─────────────────
  private fun copyToMediaStore(fileUri: Uri): Uri {
    val fileName = extractFileName(fileUri)
    Log.d(TAG, "  copyToMediaStore: fileName=$fileName")

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

    Log.d(TAG, "  Inserting into MediaStore collection: $collection")
    val newUri = resolver.insert(collection, values)
      ?: throw Exception("Failed to create MediaStore entry — resolver.insert returned null")

    Log.d(TAG, "  MediaStore entry created: $newUri")

    val bytesWritten = resolver.openOutputStream(newUri)?.use { out ->
      openInputStreamSafe(fileUri)?.use { input ->
        input.copyTo(out)
      } ?: run {
        Log.e(TAG, "  ❌ openInputStreamSafe returned null for: $fileUri")
        0L
      }
    } ?: run {
      Log.e(TAG, "  ❌ openOutputStream returned null for: $newUri")
      0L
    }

    Log.d(TAG, "  Bytes written: $bytesWritten")

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      resolver.update(newUri, ContentValues().apply {
        put(MediaStore.MediaColumns.IS_PENDING, 0)
      }, null, null)
      Log.d(TAG, "  IS_PENDING cleared")
    }

    return newUri
  }

  // ─── Helper: Mở InputStream an toàn cho mọi loại URI ────────────────────────
  // Document Provider URI (content://com.android.fileexplorer.documents/...)
  // cần URI permission grant từ Activity. Khi gọi từ background/native module,
  // Android từ chối truy cập → ta extract đường dẫn thật và dùng FileInputStream.
  private fun openInputStreamSafe(uri: Uri): java.io.InputStream? {
    return try {
      val stream = context.contentResolver.openInputStream(uri)
      Log.d(TAG, "  openInputStreamSafe: contentResolver succeeded for $uri")
      stream
    } catch (e: SecurityException) {
      Log.w(TAG, "  openInputStreamSafe: SecurityException, trying file path extraction")
      val filePath = extractRealFilePath(uri)
      if (filePath != null) {
        Log.d(TAG, "  openInputStreamSafe: fallback to FileInputStream($filePath)")
        java.io.FileInputStream(filePath)
      } else {
        Log.e(TAG, "  openInputStreamSafe: cannot extract file path from $uri")
        throw e
      }
    }
  }

  // ─── Helper: Extract tên file từ URI ────────────────────────────────────────
  private fun extractFileName(uri: Uri): String {
    // Document URI: lastPathSegment = "primary:/storage/.../file.mp3" (URL encoded)
    val segment = uri.lastPathSegment ?: return "ringtone.mp3"
    val decoded = java.net.URLDecoder.decode(segment, "UTF-8")
    // Lấy phần sau dấu "/" cuối cùng
    return decoded.substringAfterLast("/").ifBlank { "ringtone.mp3" }
  }

  // ─── Helper: Lấy đường dẫn file thật từ Document Provider URI ───────────────
  // content://com.android.fileexplorer.documents/document/primary%3A%2Fstorage%2Femulated%2F0%2FMusic%2Ffile.mp3
  // document ID sau decode = "primary:/storage/emulated/0/Music/file.mp3"
  // → strip "primary:" → "/storage/emulated/0/Music/file.mp3"
  private fun extractRealFilePath(uri: Uri): String? {
    return try {
      val segment = uri.lastPathSegment ?: return null
      val decoded = java.net.URLDecoder.decode(segment, "UTF-8")
      Log.d(TAG, "  extractRealFilePath: decoded segment = $decoded")
      when {
        decoded.startsWith("primary:") -> {
          val path = decoded.removePrefix("primary:")
          // Nếu path bắt đầu bằng "/" thì OK, nếu không thêm /storage/emulated/0/
          if (path.startsWith("/")) path else "/storage/emulated/0/$path"
        }
        decoded.startsWith("/") -> decoded
        else -> {
          Log.w(TAG, "  extractRealFilePath: unrecognized format: $decoded")
          null
        }
      }
    } catch (e: Exception) {
      Log.e(TAG, "  extractRealFilePath: error: ${e.message}")
      null
    }
  }
}
