# Capacitor rules
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    public <methods>;
}

# Native Player and libVLC rules
-keep class com.calixtv.app.** { *; }
-keep class org.videolan.libvlc.** { *; }
-keep class org.videolan.medialibrary.** { *; }

# Keep Webview & Annotations
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable

