# Web panel (admin)

The panel is one HTML page (`admin/index.html`, Firebase Auth + Firestore, no extra libraries) published with GitHub Pages
from this repository (workflow `.github/workflows/panel.yml`, only the `admin/` folder). The app only reads; the panel writes.
`admin/github.html` is the older panel that edits `remote/*.json` through a GitHub token (kept as fallback).

## Data (do not change the structure)
Every section is one document `config/<id>` with the fields `json` (settings as JSON text), `prevJson`, `version`, `updatedAt`.
Changes are also written to `log` (who, which section, when). The app writes its own row `devices/<id>`: `version`, `mode` (`tv` / `mobile`), `lastError`, `ts`.

| Section | Fields | Read by the app |
|---|---|---|
| `brand` | `name` | `RemoteConfig.serviceName` |
| `servers` | `main`, `backup`, `useBackup`, `allowCustomSources` | `RemoteConfig.serverUrl`, `allowCustomSources` |
| `notices` | `active`, `id`, `title`, `text`, `expires`, `banners` | `RemoteConfig` announcement and banners |
| `update` | `versionName`, `apkUrl`, `notes` | `AppUpdate` (bell and start dialog) |

Code: `PanelLogic.kt` (pure, unit-tested), `PanelRemote.kt` (HTTPS client), hooks in `RemoteConfig.refresh` and `AppUpdate.check`.
Order of sources: panel (Firebase) > `remote/config.json` on GitHub > last saved copy > `calix.properties`. If `firebase=` in `calix.properties` is empty the panel is not used.

## Setup (once)
1. Firebase console: create a project, enable **Authentication > Email/Password**, create your admin user and verify its email, create **Firestore** (production mode).
2. Firestore > Rules: paste `admin/firestore.rules`, replace `TU_EMAIL_ADMIN@gmail.com` with your admin email **in the console** (do not commit your email), publish.
3. Firebase > Project settings > Your apps > Web: copy the config into `cfg` in `admin/index.html` (it is not secret).
4. GitHub repo > Settings > Pages > Source: **GitHub Actions**. Then run the workflow "Calix Panel - Publicar" (or push a change in `admin/`).
   The panel is at `https://<user>.github.io/<repo>/`.
5. Firebase Auth > Settings > Authorized domains: add `<user>.github.io`.
6. In `calix.properties` set `firebase=<project id>` and push. The next APK reads the panel.
7. In the panel fill Servicio, Servidores, Avisos, Actualización.

## Updates from the app
Every build publishes a GitHub Release with `Calix-TV.apk` (fixed name): `https://github.com/KalixtoFer/Calix-tv-Iptv/releases/latest/download/Calix-TV.apk`.
In the panel (Actualización) set the new version (e.g. `1.3.13`) and that link; the app shows "update available" and installs after one confirmation by Android.
All APKs must be signed with the same key (see `docs/RELEASE.md`).

## Security
- `config` is readable by everyone: never put passwords or keys there.
- Only the admin email (verified) can write; `devices` accepts only validated rows.
- Not done yet: draft / publish step, per-setting locks for the app's Settings screens, API keys, EPG and player defaults.
