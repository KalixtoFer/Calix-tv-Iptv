# T-016 Phone: new bottom bar, Movies/Series as start-page filters, Sports overview

Status: implemented; CI result and device test PENDING.

Design source: the maintainer's reference video (start page with Series / Movies chips) and the Sports mock-up image.

- **Bottom bar (phone):** Start, Live TV, Sports, Search, More. Movies and Series are no longer bar entries: they are the chips "Serien" / "Filme" on the
  start page and also sit in the "More" sheet with the other entries (Favorites, My list, History, Settings, ...). Start stays highlighted on tabs 0 to 2.
  File: `Sidebar.kt` (`PhoneBottomBar`). Tab ids are unchanged.
- **Start page:** logo + search, chips Series / Movies (open tab 2 / 1), picture, tiles, live channels (`PhoneHome.kt`).
- **Movies / Series page:** close button (back to start), chosen kind, "Alle Gruppen" (category list), the other header entries and genres, picture, rows.
- **Sports (phone):** `PhoneSportOverview` in `SportHub.kt`: title, sport chips, featured game (live first, with the channel), "Jetzt live" and "Demnächst"
  as cards with the channel names that carry the game (`HubOverviewModel.chanNames`), popular leagues, results. By default only games with one of the
  user's channels; a chip switches to all games of the day. The first-visit "Live" default from T-015 was removed.
- Translations: `DictK.kt` (new rows).

## Not done
Search / bell in the Sports header, league cards with pictures as in the mock-up, profile entry in the bar (Settings is in "More").

## Test steps
1. Bottom bar shows 5 entries; Start is lit on Movies / Series pages; "More" has Movies and Series.
2. Start: chips "Series" and "Movies" open the page; X returns; "Alle Gruppen" opens the category list.
3. Sports: featured game with channel, live and upcoming cards with channel names, chip "Nur Spiele in meinen Sendern" toggles all games.
4. TV mode: no change.
