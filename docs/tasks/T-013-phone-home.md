# T-013 Phone start page (Netflix-style, portrait)

Status: implemented; CI result and device test PENDING.

Goal: the start tab in phone mode looks like the design draft. TV mode is unchanged.

- New `PhoneHome.kt`: `PhoneHomeTop` (hero with logo, search button, title, info, overview, "Jetzt ansehen" / "Mehr Infos"; quick tiles 3 per row)
  and `PhoneLiveGrid` (Live TV channel cards, 2 per row, with the running program time).
- `HomeScreen.kt`: `phone = DeviceMode.phoneNow`; in phone mode the TV hero and the tile row are replaced by `PhoneHomeTop`,
  the "chnow" block uses `PhoneLiveGrid`, and the billboard overlay is off (`bbTab`). Other rows are untouched.
- No new strings (existing German keys reused), no storage or manifest changes.

## Not done yet
Movies / Series screen (category list, filter chips, 3-column grid), header bell / menu.

## Test steps
1. Phone, portrait: start tab shows logo + search on top of the big picture, buttons work (play / details).
2. Tiles (Live TV, Filme, Serien, Favoriten, ...) open their tabs; Live TV block shows 2 cards per row; "Alle Sender" opens Live TV.
3. Rows below still scroll sideways by touch.
4. TV mode: start page identical to before.
