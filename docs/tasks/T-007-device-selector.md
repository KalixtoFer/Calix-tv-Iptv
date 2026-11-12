# T-007 Device selector (phone/tablet or TV/TV box)

Status: implemented, not compiled locally (no Gradle here). CI result: see GitHub Actions.

## Goal
On the first start ask "Which device will you use the app on?" (Phone / Tablet or TV / TV box). TV keeps today's UI.
Phone mode is the base for the later phone redesign (Netflix-like layout, Live TV navigation, easier remote entry).

## Affected files
- New: `DeviceLogic.kt` (pure logic), `DeviceMode.kt` (storage + `DevicePicker` screen), `DeviceLogicTest.kt`
- Changed: `MobilePrefs.kt` (`isMobile` now follows the choice, `hardwareMobile` keeps the old detection; leaving phone mode gives the rotation back),
  `MainActivity.kt` (picker before the profile picker), `SettingsHub.kt` ("Gerät" row under "Bedienung"), `DictK.kt` (8 rows, 10 languages)

## Behaviour
- No stored choice: picker is shown once, the card matching the hardware has the focus (works with touch and remote).
- Choice stored in new SharedPreferences file `ipvio_device`, key `mode` (`phone` / `tv`). Not part of the backup on purpose (device-specific).
- Changeable later: Settings > General > "Gerät".
- Existing installs (also TV) see the picker once after the update.

## Acceptance criteria
1. First start shows the picker; choosing TV leaves the UI unchanged.
2. Choosing Phone on a phone keeps the previous behaviour (landscape toggle available).
3. The choice survives a restart; Settings shows it and can change it.
4. Existing preferences files are untouched.

## Risks
- Existing users get one extra screen after the update.
- Phone mode is only a flag for now; the phone layout is a later task.

## Test steps (maintainer)
1. Fresh install (or clear data) on a phone: picker appears, "Handy / Tablet" focused. Tap it: app loads in landscape.
2. Settings > General > Gerät: switch to TV box, rotate the phone: rotation is free again. Switch back.
3. Restart the app: no picker, choice kept.
4. On TV / Fire TV: picker appears, OK on "Fernseher / TV-Box", app looks as before. Check D-pad focus on the two cards.
5. Change app language (e.g. Spanish): picker and Settings row are translated.

## Test results
Not run locally: no Gradle / Android SDK in this environment. Checked by hand: 10 columns per new dictionary row, no references broken.
Unit tests added (`DeviceLogicTest`): to be run by CI.
