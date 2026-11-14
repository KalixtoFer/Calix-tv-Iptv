# T-020 TV start page from the mock-up

- **Goal:** TV start page follows the maintainer's landscape mock-up: top bar (logo, date, time, search, bell, settings), big featured picture, "Featured movies" 2x2, five big tiles (Live TV, Movies, Series, Anime, Specials).
- **Affected files:** `TvHome.kt` (new), `HomeScreen.kt` (tab-0 branch for TV, `bbTab`), `Header.kt` (`BellButton` internal), `DictK.kt`.
- **Acceptance:** D-pad reaches banner, posters, tiles, search, bell and settings; OK on a tile opens its area; rows of the old start page still follow below. Phone untouched.
- **Risks:** "Anime" and "Specials" tiles open the titles whose category name contains `anime` / `especial|special`; if none, they fall back to Series / Favorites (assumption, to confirm). Profile button is not in the new top bar (profiles stay in Settings). Banner uses the existing featured titles, not custom art. Layout checked by CI compile only.
- **Login:** TV already uses `PhoneLogin` (same composable as the phone) when the server is fixed; nothing changed. Needs a TV screenshot to see what differs.
- **Status:** implemented, awaiting CI and TV test.
