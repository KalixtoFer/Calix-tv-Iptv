# Calix TV (versión nativa Android)

Reproductor IPTV para **Android TV, Fire TV, TV Box, celulares y tablets**, hecho en Kotlin + Jetpack Compose + Media3/ExoPlayer.
Basado en [IPVIO Stream](https://github.com/Emrodev/IPVIO-Stream) (licencia **GPL-3.0**), con la marca y el panel de Calix TV.

Incluye: TV en vivo con guía, películas y series, perfiles, favoritos, control parental, reproductor ExoPlayer (HLS/DASH/TS), actualización desde la app.

## Pasos para tener tu APK

1. **Subí esta carpeta a tu repositorio de GitHub** (el repo debe ser **público**: la app lee `remote/config.json` desde ahí).
2. Abrí `calix.properties` y poné tu `repo` (ej. `miusuario/Calix-tv-Iptv`). Ahí también está el servidor por defecto.
3. En GitHub: pestaña **Actions → "Calix TV - Compilar APK" → Run workflow**. Al terminar, bajá el APK en *Artifacts*.
4. **APK firmado (recomendado):** creá un keystore y cargá estos secretos en *Settings → Secrets and variables → Actions*:
   `KEYSTORE_B64` (el archivo .keystore en base64), `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
   **Guardá ese keystore para siempre**: todas las versiones futuras deben firmarse con la misma clave o Android no deja actualizar.

## Panel de administración

Abrí `admin/index.html` en tu navegador (doble clic, o publicalo con GitHub Pages).
Con un token de GitHub (permiso *Contents: Read and write* solo sobre este repo) podés cambiar:
servidor, nombre, anuncio, banners y aviso de actualización. Se guarda en `remote/config.json` y `remote/update.json`.

- **Nueva versión:** subí el APK como *Release*, y en el panel poné código de versión (mayor al anterior), nombre, enlace directo al APK y novedades.
- Los usuarios solo escriben **usuario y contraseña**; el servidor sale del panel.

## Importante
- No pongas contraseñas ni claves en el repositorio (`remote/` es público).
- Calix TV es solo un reproductor: usá únicamente contenido que tengas derecho a distribuir.
- Al ser GPL-3.0, si repartís el APK tenés que mantener este código fuente disponible (este repositorio) y la licencia (`LICENSE`).
