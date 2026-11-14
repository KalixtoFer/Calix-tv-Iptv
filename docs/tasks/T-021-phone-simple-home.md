# T-021 Phone: simple start page, readable folders and settings

- **Goal:** phone start page = logo/search, sports agenda, recently added movies, recently added series; nothing else. Live TV folders readable; Settings readable.
- **Affected files:** `PhoneAgenda.kt` (new), `AgendaLogicTest.kt` (new), `HomeScreen.kt` (phone tab-0 blocks), `SettingsHub.kt` (1 column on phone), `LiveTabPhone.kt` (wider folder column, list by default), `PhoneCatalog.kt` (`CatSideList` 2 lines), `DictK.kt`.
- **Agenda rule (assumption):** events = channels of the live folders whose name contains "event" (e.g. "EVENTOS DEPORTIVOS"); a time `HH:MM` in the title sorts and labels it; no time = "LIVE". The playlist is assumed to hold only today's events. The old ESPN-based block is no longer shown on the start page.
- **Not done:** slowness not diagnosed; TV start page unchanged.
- **Test results:** `AgendaLogicTest` runs in CI; visual checks PENDING on device.
- **Status:** implemented, awaiting CI and device test.
