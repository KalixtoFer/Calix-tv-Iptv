#!/usr/bin/env python3
"""Instala el reproductor nativo (libVLC) en el proyecto Android generado por Capacitor.
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

# 2) Declarar la Activity en el manifest
manifest = f'{BASE}/src/main/AndroidManifest.xml'
s = open(manifest, encoding='utf-8').read()
if '.PlayerActivity' not in s:
    if '</application>' not in s:
        fail('AndroidManifest.xml sin </application>')
    s = s.replace('</application>', ACTIVITY_XML + '    </application>')
    open(manifest, 'w', encoding='utf-8').write(s)
    print('Manifest actualizado')
else:
    print('Manifest ya tenía PlayerActivity')

# 3) Dependencia libVLC + ABIs
gradle = f'{BASE}/build.gradle'
t = open(gradle, encoding='utf-8').read()
if 'libvlc-all' not in t:
    anchor = "implementation project(':capacitor-android')"
    if anchor not in t:
        fail('No se encontró la sección dependencies en build.gradle')
    t = t.replace(anchor, anchor + f"\n    implementation '{LIBVLC}'")
    print('libVLC agregado')
if 'abiFilters' not in t:
    anchor = 'versionName "1.0"'
    if anchor not in t:
        fail('No se encontró versionName en build.gradle')
    t = t.replace(anchor, anchor + '\n        ndk {\n            abiFilters "arm64-v8a", "armeabi-v7a"\n        }')
    print('abiFilters agregado')
open(gradle, 'w', encoding='utf-8').write(t)
print('Reproductor nativo instalado OK')
