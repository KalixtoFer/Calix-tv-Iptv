# T-015 Phone: search screen, Sports opens on Live, match cards

Status: implemented; CI result and device test PENDING.

- **Search did not work on the phone:** the TV search (own on-screen keyboard, built for a remote) was used. New `PhoneSearch.kt`: text field with the device
  keyboard, filter chips, hits as a 3-column poster grid (movies, series) and rows (channels). Same index and `SearchState` as the TV screen; `SearchScreen.kt`
  delegates when `DeviceMode.phoneNow`.
- **Sports:** on the phone the first visit of the hub opens on "Live" (`HubMemory.opened`, `SportHub.kt`). `MatchRow` shows `PhoneMatchCard` on the phone
  (`SportPhone.kt`): LIVE badge + minute, one line per team with logo, name and score; channel and favorite icons.
- No storage, manifest or string changes (existing German keys reused).

## Not done
Guide screen for Live TV (date selector, Now / Later / All), richer Sports overview for the phone.

## Test steps
1. Phone: Search tab, type a title: results appear (movies, series, channels); tapping a poster opens the detail page; chips filter.
2. Sports: first entry opens on Live with cards; tap opens the match page.
3. TV mode: search and sports look as before.
