# T-019 Phone Live TV, Movies and Series from the mock-ups

- **Goal:** phone screens for Live TV, Movies and Series follow the maintainer's mock-ups (title, chips, search, category column on the left, grid on the right). Home is out of scope (maintainer will simplify it).
- **Affected files:** `PhoneCatalog.kt` (new), `LiveTabPhone.kt` (rewritten), `HomeScreen.kt` (one `when` branch), `DictK.kt` (new rows), `CatalogLogicTest.kt` (new), `PhoneHome.kt` (`PhoneLogoBar` internal).
- **Acceptance:** Movies/Series show a category column with counts, a 3-column poster grid, sort chip and search; Live TV shows category column, number/name search, 2-column channel cards with number, quality badge, logo, name and running program. TV UI unchanged.
- **Risks:** layout only checked by CI compile; no device test. Picture-in-picture preview from the mock-up is not included (`PlayerScreen.kt` is protected).
- **Documentation:** CHANGELOG entry.
- **Test results:** pure-Kotlin `CatalogLogicTest` runs in CI (result: see Actions). Visual checks PENDING on device.
- **Status:** implemented, awaiting CI and device test.

## Follow-up (2026-11-14)

Maintainer prefers the simple row view for phone Movies/Series: the `PhoneCatalog` branch in `HomeScreen.kt` was removed (file kept, its helpers are used by Live TV) and phone posters are smaller (about 3.5 per screen width).
