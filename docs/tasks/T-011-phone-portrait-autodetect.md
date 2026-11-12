# T-011 Phone portrait, system bars, automatic device detection

Status: implemented; CI result and device test PENDING.

## Changes
- Phone mode is portrait by default (rotates with the device; "Auf dem Handy im Querformat" is now off by default; users who switched it on keep it).
- The full-screen player is landscape in phone mode and the previous orientation returns when it closes (`PhonePlayerOrientation`).
- Phone mode keeps clear of the status bar and the navigation bar (`systemBarsPadding` on the root, not while playing). Before, headers were drawn under the clock/icons.
- Automatic device detection (`DeviceLogic.auto`): Leanback / Fire TV = TV; touch screen without TV hardware = phone/tablet; neither = the first-start
  question is shown. The choice is stored once (`ipvio_device`) and can be changed in Settings > General > "Gerät".
- Files: `MobilePrefs.kt`, `DeviceLogic.kt`, `DeviceMode.kt`, `MainActivity.kt`, `DeviceLogicTest.kt`.

## Known: the TV layouts in portrait
Screens are still the TV layouts; in portrait some need their own phone layout (movies/series header row, start page, detail page).
Done one screen at a time from device screenshots.

## Test steps
1. Phone: after login the app is portrait; nothing hides under the status bar; bottom bar above the navigation buttons.
2. Open a channel/movie: the player turns landscape; Back returns to portrait.
3. Fresh install on a phone: no device question (detected). On a TV / Fire TV: no question, TV UI.
4. Settings > General > Gerät still switches the mode.
