# T-012 Logo on the phone login, bottom bar with "More"

Status: implemented; CI result and device test PENDING.

- New logo `res/drawable-nodpi/calix_logo.png` (the supplied PNG, outer black background made transparent) and `BrandLogo` (`Brand.kt`).
  Used on the phone login. The launcher icon and the TV screens still use the old assets.
- Phone bottom bar like the design draft: Start, Live TV, Movies, Series, "Mehr" (More).
  "Mehr" opens a sheet with the other entries (Search, Sports, EPG, Favorites, My list, History, Settings; the ones hidden from the TV menu stay hidden,
  Search and Settings are always there). Files: `Sidebar.kt`, `DictK.kt` (key "Mehr"), `Brand.kt`, `PhoneLogin.kt`.

## Next (from the design draft, one screen per task)
1. Phone start page: hero banner, shortcut tiles (Live TV, Movies, Series, Favorites, My list), Live TV cards.
2. Movies / Series: category list on the left + poster grid (3 columns), search field and filters on top.
3. Header with logo, search and notifications (replaces the long row of buttons).

## Test steps
1. Phone login shows the full logo (not cut off).
2. Bottom bar: 5 entries; "Mehr" opens the sheet; tapping an entry switches the tab and closes the sheet; tapping outside closes it.
3. TV: nothing changes.
