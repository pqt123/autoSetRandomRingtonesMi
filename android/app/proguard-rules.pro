# ─── React Native New Architecture / Hermes / Reanimated / Worklets ──────────
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Giữ metadata Kotlin cho Expo Modules DSL reflection
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations, Signature, InnerClasses, EnclosingMethod
-keep class kotlin.Metadata { *; }

# Giữ cầu nối JNI C++ bảo mật
-keep class expo.modules.ringtone.DeviceSecurity {
    private static native <methods>;
}

# ─── Tăng cường làm rối mã nguồn (Obfuscation) & Xóa dấu vết Debug ──────────
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable

# Loại bỏ hoàn toàn Log.v / Log.d / Log.i khỏi bản Release APK để chống dò luồng qua logcat
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
