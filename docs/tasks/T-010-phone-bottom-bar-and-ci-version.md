# T-010 Phone bottom bar + CI versioning

Status: implemented; CI result and device test PENDING.

## Part 1: bottom bar in phone mode
- In phone mode the sidebar is a touch bar at the bottom (icon + label per entry; slides sideways if it does not fit). Search is always included.
- Implemented inside `Sidebar.kt` (`PhoneBottomBar`); `SidebarPrefs.align()`, `sidebarPad()` and `SideStart` follow `DeviceMode.phoneNow`.
  The stored sidebar position (left/right/top) is untouched and still used on the TV.
- Files: `Sidebar.kt`, `DeviceMode.kt` (`phoneNow`).

## Part 2: CI versioning and no "test" build
- Before: the workflow built `assembleDebug` = app id `com.calixtv.app.test`, name "Calix TV (test)", versionCode 4, and a new random debug key on every run
  (Android refuses to update over an APK with a different signature).
- Now: `assembleRelease`, app id `com.calixtv.app`, name "Calix TV". `versionCode = 100 + run number`, `versionName = 1.3.<run number>` (shown in the phone login).
  APK is attached to the run as `Calix-TV-1.3.<run>.apk`.
- Signing: with the 4 secrets (`KEYSTORE_B64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) the real key is used (recommended, permanent).
  Without them the debug key is cached (`actions/cache`, key `calix-debug-keystore-v1`) so every build uses the same key.
  If GitHub evicts the cache (unused for 7 days) the key changes once and the app has to be reinstalled.
- Local builds keep `versionCode 4` / `1.3` (no GITHUB_RUN_NUMBER).
- Files: `app/build.gradle.kts`, `.github/workflows/build.yml`.
- The old "test" app (`com.calixtv.app.test`) is a different app: uninstall it; data is not shared.

## Test steps
1. Phone mode: bottom bar on Start, Filme, Serien, Live TV; tap switches tabs; content is not hidden behind the bar.
2. TV mode: sidebar exactly as before.
3. Install the new APK: icon name "Calix TV" (no "test"). Install the next build over it: it updates without uninstalling, data kept.
