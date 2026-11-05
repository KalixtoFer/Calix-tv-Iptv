#!/usr/bin/env python3
"""Instala el reproductor nativo (libVLC) en el proyecto Android generado por Capacitor
y optimiza el tamaño del APK al máximo (compresión de librerías nativas .so y filtrado de ABIs).
Es idempotente: se puede ejecutar en cada build."""
import os
import shutil
import sys

BASE = 'android/app'
PKG_DIR = f'{BASE}/src/main/java/com/calixtv/app'
LIBVLC = "org.videolan.android:libvlc-all:3.6.0"

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

# 3) Dependencia libVLC + ABI arm64-v8a + Compresión de .so y R8 minification en build.gradle
gradle = f'{BASE}/build.gradle'
if os.path.exists(gradle):
    t = open(gradle, encoding='utf-8').read()
    if 'libvlc-all' not in t:
        anchor = "implementation project(':capacitor-android')"
        if anchor not in t:
            fail('No se encontró la sección dependencies en build.gradle')
        t = t.replace(anchor, anchor + f"\n    implementation '{LIBVLC}'")
        print('libVLC agregado')
    
    # Asegurar ABI arm64-v8a ultra-liviana (reduce tamaño al 50%)
    if 'abiFilters' in t:
        import re
        t = re.sub(r'abiFilters\s+.*', 'abiFilters "arm64-v8a"', t)
        print('abiFilters actualizado a arm64-v8a')
    else:
        anchor = 'versionName "1.0"'
        if anchor in t:
            t = t.replace(anchor, anchor + '\n        ndk {\n            abiFilters "arm64-v8a"\n        }')
            print('abiFilters arm64-v8a agregado')

    # Configurar minificación R8 y compresión de .so
    if 'useLegacyPackaging' not in t:
        anchor_android = 'buildTypes {'
        if anchor_android in t:
            t = t.replace(anchor_android, PACKAGING_SNIPPET + '\n    ' + anchor_android)
            print('packagingOptions (useLegacyPackaging = true) agregado para comprimir .so')

    if 'minifyEnabled false' in t:
        t = t.replace(
            'minifyEnabled false',
            'minifyEnabled true\n            shrinkResources true\n            signingConfig signingConfigs.debug'
        )
        print('R8 minificación y reducción de recursos activados')

    open(gradle, 'w', encoding='utf-8').write(t)
    print('build.gradle optimizado para APK ultra-liviano OK')

print('Reproductor nativo instalado y APK optimizado para mínimo tamaño OK')
