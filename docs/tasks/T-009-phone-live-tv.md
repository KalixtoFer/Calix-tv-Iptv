# T-009 Live TV for phone mode

Status: first version implemented; CI result and device test PENDING.

## Goal
Make Live TV usable with touch: change categories with one tap, Netflix-like start page, easy search.

## Affected files
- New: `LiveTabPhone.kt`
- Changed: `HomeScreen.kt` (one line: phone mode shows `LiveTabPhone`, otherwise `LiveTab` as before)
- TV screen (`LiveTab.kt`) is untouched.

## Behaviour (phone mode)
- Top row of chips (swipe sideways): Start, Favorites, All channels, genres, provider categories (favorite categories first, hidden ones skipped).
- "Start": rows of channel cards (last watched, favorites, one row per genre). Tap = watch.
- Other chips: vertical channel list with logo, name, "now on" and progress bar. Tap = watch, long press = channel menu (favorite etc.).
- "Sender suchen": search field, normal keyboard opens with one tap, results update while typing.
- The last chosen chip is remembered (same storage key as the TV screen).

## Not in this version (use the TV screen or settings)
Own channel lists, multi view, recordings, playlist switcher with several playlists, quality variants bundling.
The left sidebar of the app is still the TV one; a touch bottom bar is a separate task.

## Test steps
1. Phone mode, tab "Live TV": chips on top, start page with rows.
2. Tap a chip (e.g. a category): list changes at once. Swipe the chips sideways.
3. Tap a channel: plays; Back returns to the same chip.
4. Long press a channel: menu opens; add to favorites, then check the "Favoriten" chip.
5. "Sender suchen": one tap opens the keyboard; type: results filter; "Abbrechen" closes.
6. TV mode: Live TV looks exactly as before.
