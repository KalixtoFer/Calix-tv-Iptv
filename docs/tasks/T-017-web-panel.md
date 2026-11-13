# T-017 Web panel connection (Firebase), Releases, working GitHub config

Status: implemented; CI result and device test PENDING. Needs the maintainer's setup steps in `docs/PANEL.md`.

- `calix.properties`: `repo` was still the placeholder (`TU_USUARIO/TU_REPOSITORIO`), so the app never fetched `remote/*.json` and never checked for updates. Now `KalixtoFer/Calix-tv-Iptv`; new key `firebase=` (empty until the project id is known).
  `remote/config.json`: welcome announcement switched off (the panel owns announcements); `remote/update.json`: link points to the Release asset.
- New `PanelLogic.kt` (pure), `PanelRemote.kt`, `PanelLogicTest.kt`; hooks in `RemoteConfig.refresh` (panel first, GitHub file as fallback, heartbeat after) and `AppUpdate.check` (panel section `update`, only when the user has no own address).
- `build.gradle.kts`: `CALIX_FIREBASE_PROJECT` BuildConfig field.
- CI `build.yml` (approved by the maintainer): Release per build with fixed asset `Calix-TV.apk`. New `panel.yml` publishes `admin/` to GitHub Pages.
- Panel: new `admin/index.html` (sections Servicio, Servidores, Avisos, Actualización, Diagnóstico with change log), `admin/firestore.rules` (stricter), old panel kept as `admin/github.html`.

## Risks
- `RemoteConfig` now can take `serverUrl` from the panel (it already could from GitHub). A wrong server URL in the panel affects every login: the panel validates http(s) and keeps the previous version for rollback.
- One Release per push (list grows). Delete old ones by hand if wanted.

## Test steps
1. Without `firebase=` set: the app behaves as before (GitHub file / defaults).
2. After setup: change "Nombre del servicio" or an announcement in the panel, restart the app: change visible. Panel > Diagnóstico shows the device (version, Celular / TV).
3. Panel > Actualización: set a version higher than the installed one and the Release link: the bell shows the update, the install asks Android's confirmation once.
