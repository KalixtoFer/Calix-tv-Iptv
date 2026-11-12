# T-008 Phone login screen

Status: implemented; CI result and device test PENDING.

## Goal
After choosing "Handy / Tablet" (T-007) the login (fixed server, user + password) is a portrait screen like the approved mock-up:
logo, "VERSIÓN x • MÓVIL", USUARIO, CONTRASEÑA with show/hide, button "INGRESAR AL SERVICIO [OK]". TV keeps the old screen.

## Affected files
- New: `PhoneLogin.kt`
- Changed: `AddPlaylistScreen.kt` (one branch: fixed server + phone mode shows `PhoneLogin`, same load logic)

## Behaviour
- Fields open the keyboard with one tap (the TV `Field` needs OK first); Next moves to the password, Done submits.
- Portrait while the screen is shown, then the normal phone orientation applies again.
- User name is trimmed. Without a fixed server (non-Calix mode) phone mode still shows the old screen.
- "Recordar sesión" checkbox from the mock-up is NOT included: the app always keeps the login. Making it optional changes authentication
  (CLAUDE.md section 6) and needs a decision.

## Test steps
1. Fresh install on a phone, choose "Handy / Tablet": the login appears in portrait.
2. Tap the user field: keyboard opens at once. Next -> password. Eye icon shows/hides. Done submits.
3. Wrong login: the error is shown under the password field. Right login: the loading screen, then the app (landscape again).
4. On TV: choose "Fernseher / TV-Box": the old login screen, unchanged.
