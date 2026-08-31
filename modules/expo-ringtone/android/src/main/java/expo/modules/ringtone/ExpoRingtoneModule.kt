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
        val ringtoneUri = if (uriString.startsWith("content://media/")) {
          Log.d(TAG, "  URI is already MediaStore (content://media/) → using directly")
          uri
        } else {
          // 1. Thử tìm trong MediaStore xem file này đã được hệ thống Android index chưa
          val existingUri = findExistingMediaStoreUri(uri)
          if (existingUri != null) {
            Log.d(TAG, "  Found existing MediaStore entry: $existingUri")
            existingUri
          } else {
            // 2. Nếu chưa có trong MediaStore (ví dụ: file từ cache), copy vào MediaStore
            Log.d(TAG, "  URI is NOT MediaStore & not found in MediaStore → copying to MediaStore...")
            try {
              val result = copyToMediaStore(uri)
              Log.d(TAG, "  copyToMediaStore result: $result")
              result
            } catch (e: Exception) {
              Log.e(TAG, "  ❌ copyToMediaStore FAILED: ${e.javaClass.simpleName}: ${e.message}", e)
              return@AsyncFunction false
            }
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

        val matchPath = verifyUri != null && ringtoneUri.path != null && verifyUri.path == ringtoneUri.path
        val matchId = verifyUri != null && ringtoneUri.lastPathSegment != null && verifyUri.lastPathSegment == ringtoneUri.lastPathSegment
        val matchPrefix = verifyUri != null && verifyUri.toString().startsWith(ringtoneUri.toString())
        val success = matchPath || matchId || matchPrefix

        if (success) {
          Log.d(TAG, "  ✅ Ringtone set and VERIFIED successfully! (matchPath=$matchPath, matchId=$matchId, matchPrefix=$matchPrefix)")
        } else {
          Log.w(TAG, "  ⚠️ setActualDefaultRingtoneUri completed, verify check details:")
          Log.w(TAG, "     Expected base: $ringtoneUri")
          Log.w(TAG, "     Actual:        $verifyUri")
        }

        // Return true if setActualDefaultRingtoneUri completed without exception and verify Uri is non-null
        return@AsyncFunction (verifyUri != null)
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
  private fun openInputStreamSafe(uri: Uri): java.io.InputStream? {
    return try {
      val stream = context.contentResolver.openInputStream(uri)
      Log.d(TAG, "  openInputStreamSafe: contentResolver succeeded for $uri")
      stream
    } catch (e: Exception) {
      Log.w(TAG, "  openInputStreamSafe: contentResolver failed (${e.message}), trying fallback")
      val filePath = if (uri.scheme == "file") uri.path else extractRealFilePath(uri)
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
    if (uri.scheme == "file") {
      val path = uri.path ?: return "ringtone.mp3"
      return path.substringAfterLast("/").ifBlank { "ringtone.mp3" }
    }
    val segment = uri.lastPathSegment ?: return "ringtone.mp3"
    val decoded = java.net.URLDecoder.decode(segment, "UTF-8")
    return decoded.substringAfterLast("/").ifBlank { "ringtone.mp3" }
  }

  // ─── Helper: Lấy đường dẫn file thật từ Document Provider URI ───────────────
  private fun extractRealFilePath(uri: Uri): String? {
    return try {
      val segment = uri.lastPathSegment ?: return null
      val decoded = java.net.URLDecoder.decode(segment, "UTF-8")
      Log.d(TAG, "  extractRealFilePath: decoded segment = $decoded")
      when {
        decoded.startsWith("primary:") -> {
          val path = decoded.removePrefix("primary:")
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

  // ─── Helper: Tìm MediaStore URI của file đã có sẵn trong hệ thống ──────────
  private fun findExistingMediaStoreUri(uri: Uri): Uri? {
    val fileName = extractFileName(uri)
    val titleName = fileName.substringBeforeLast(".")
    val filePath = if (uri.scheme == "file") uri.path else extractRealFilePath(uri)
    Log.d(TAG, "  findExistingMediaStoreUri search: fileName=$fileName, titleName=$titleName, filePath=$filePath")

    val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
    } else {
      @Suppress("DEPRECATION")
      MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
    }

    val projection = arrayOf(MediaStore.Audio.Media._ID)
    val selection = "${MediaStore.Audio.Media.DISPLAY_NAME} = ? OR ${MediaStore.Audio.Media.TITLE} = ? OR ${MediaStore.Audio.Media.DATA} LIKE ?"
    val selectionArgs = arrayOf(fileName, titleName, "%$fileName")

    return try {
      context.contentResolver.query(collection, projection, selection, selectionArgs, null)?.use { cursor ->
        if (cursor.moveToFirst()) {
          val idIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
          val id = cursor.getLong(idIndex)
          val existingUri = android.content.ContentUris.withAppendedId(collection, id)
          Log.d(TAG, "  findExistingMediaStoreUri FOUND: $existingUri")
          existingUri
        } else {
          Log.d(TAG, "  findExistingMediaStoreUri: NOT found in MediaStore query")
          null
        }
      }
    } catch (e: Exception) {
      Log.w(TAG, "  findExistingMediaStoreUri query failed: ${e.message}")
      null
    }
  }
}
