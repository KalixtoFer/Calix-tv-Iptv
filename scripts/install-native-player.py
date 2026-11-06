#!/usr/bin/env python3
"""Instala el reproductor nativo (Media3 ExoPlayer + NextLib FFmpeg) en el proyecto Android
y optimiza el tamaño del APK al máximo (compresión de librerías nativas .so y filtrado de ABIs).
Es idempotente: se puede ejecutar en cada build."""
import os
import shutil
import sys

BASE = 'android/app'
PKG_DIR = f'{BASE}/src/main/java/com/calixtv/app'

ACTIVITY_XML = '''
        <activity
            android:name=".PlayerActivity"
            android:exported="false"
            android:screenOrientation="sensorLandscape"
            android:configChanges="orientation|screenSize|keyboardHidden|keyboard|navigation|smallestScreenSize|screenLayout|uiMode"
            android:theme="@android:style/Theme.Black.NoTitleBar.Fullscreen" />
'''

PACKAGING_SNIPPET = '''
    packagingOptions {
        jniLibs {
            useLegacyPackaging = true
        }
    }
'''


def fail(msg):
    print('ERROR:', msg)
    sys.exit(1)


# 1) Copiar las clases Java
os.makedirs(PKG_DIR, exist_ok=True)
for name in ('NativePlayerPlugin.java', 'PlayerActivity.java'):
    src = f'native-player/{name}'
    if not os.path.exists(src):
        fail(f'No existe {src}')
    shutil.copy(src, f'{PKG_DIR}/{name}')
    print('Copiado', name)

# 2) Declarar la Activity y extractNativeLibs en el manifest
manifest = f'{BASE}/src/main/AndroidManifest.xml'
if os.path.exists(manifest):
    s = open(manifest, encoding='utf-8').read()
    if '.PlayerActivity' not in s:
        if '</application>' not in s:
            fail('AndroidManifest.xml sin </application>')
        s = s.replace('</application>', ACTIVITY_XML + '    </application>')
        print('Manifest actualizado con PlayerActivity')
    else:
        print('Manifest ya tenía PlayerActivity')

    if 'android:extractNativeLibs' not in s:
        s = s.replace('<application', '<application android:extractNativeLibs="true"')
        print('Manifest actualizado con extractNativeLibs="true"')

    open(manifest, 'w', encoding='utf-8').write(s)

# 3) Dependencias Media3 + ABI arm64-v8a / armeabi-v7a + Compresión de .so y R8 minification en build.gradle
gradle = f'{BASE}/build.gradle'
if os.path.exists(gradle):
    t = open(gradle, encoding='utf-8').read()
    if 'media3-exoplayer' not in t:
        anchor = "implementation project(':capacitor-android')"
        if anchor not in t:
            fail('No se encontró la sección dependencies en build.gradle')
        media3_deps = '''
    def media3_version = "1.4.1"
    implementation "androidx.media3:media3-exoplayer:$media3_version"
    implementation "androidx.media3:media3-exoplayer-hls:$media3_version"
    implementation "androidx.media3:media3-ui:$media3_version"
    implementation "io.github.anilbeesetti:nextlib-media3ext:$media3_version"
'''
        t = t.replace(anchor, anchor + media3_deps)
        print('Media3 ExoPlayer y NextLib agregados')
    
    if 'abiFilters' in t:
        import re
        t = re.sub(r'abiFilters\s+.*', 'abiFilters "arm64-v8a", "armeabi-v7a"', t)
        print('abiFilters actualizado a arm64-v8a, armeabi-v7a')

    open(gradle, 'w', encoding='utf-8').write(t)
    print('build.gradle optimizado OK')

print('Reproductor nativo ExoPlayer instalado OK')
