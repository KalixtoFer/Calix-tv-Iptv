# Work state

Last update: 2026-11-12. Read `CLAUDE.md` first, then this file.

## Current task

**T-014** (`docs/tasks/T-014-phone-vod-live-sport.md`): phone Movies/Series header, TV-guide channel rows, design scale floor for Sports. CI and device test PENDING. T-013 (phone start page) pushed and CI green. Next: guide screen with date and Now/Later/All chips, poster carousel for Movies; open questions to the maintainer: "Recordar sesión" and permanent signing secrets.

Earlier note:

None active. **T-005** (documentation skeleton, CHANGELOG headings for 1.2 and 1.3, `CLAUDE.md` section 15) and **T-001b** (`org.json` test dependency, commit `75e1892`) are done and pushed. T-005 touched documents only.

## Completed steps

- Read audit sections 3-6, 8-11 and 14, `CLAUDE.md` sections 11-15, `CHANGELOG.md`, `docs/GOOGLE_DRIVE.md`, the baseline draft and the T-002 note.
- Created `docs/ARCHITECTURE.md`, `DIAGRAMS.md`, `adr/0001` to `0003`, `FEATURES.md`, `SECURITY.md`, `TESTING.md`, `TECH-DEBT.md`, `REFACTORING-PROGRESS.md` and this file.
- Marked `docs/GOOGLE_DRIVE.md` as removed in 1.2 and planned for 1.4. The rest is unchanged.
- Added headings for 1.2 and 1.3 to `CHANGELOG.md`. The content is a placeholder.
- Replaced the outdated text in `CLAUDE.md` section 15.

## Changed files

New: `docs/ARCHITECTURE.md`, `docs/DIAGRAMS.md`, `docs/adr/0001-no-r8-for-now.md`, `docs/adr/0002-german-text-as-i18n-key.md`, `docs/adr/0003-shared-prefs-no-database.md`, `docs/FEATURES.md`, `docs/SECURITY.md`, `docs/TESTING.md`, `docs/TECH-DEBT.md`, `docs/REFACTORING-PROGRESS.md`, `docs/tasks/WORK_STATE.md`.

Changed: `docs/GOOGLE_DRIVE.md` (first line), `CHANGELOG.md`, `CLAUDE.md` (section 15).

## Test results

None run. This task changes documents only. Mermaid diagrams in `docs/DIAGRAMS.md` have not been rendered; check the preview on GitHub.

## Open problems

- `CHANGELOG.md`: content of 1.2 and 1.3 is `[PENDING: Änderung eintragen]`. Only the removal of Google Drive in 1.2 is documented (audit section 14).
- T-001b: exact Gradle totals after the fix are PENDING.
- T-004: baseline values are PENDING (Gradle totals, remaining 6 lint errors, hash of the T-003 commit, CI status).
- T-002: device test on TV or Fire TV.
- CI status on GitHub (Actions tab): PENDING.
- Documents contain TODO and PENDING markers for facts the audit did not cover (see the end of the T-005 report).
- `CLAUDE.md` section 3 still mentions `npm test` for the licence server, and section 13 still says that `docs/tasks/WORK_STATE.md` and `docs/REFACTORING-PROGRESS.md` do not exist yet. Both are outside T-005 scope; proposed for the next `CLAUDE.md` update.

## Next step

1. Fill in the PENDING values (CI status, Gradle totals, CHANGELOG content, T-003 commit hash) and finish T-004.
2. T-006: backup `NAMES` (`Backup.kt`), with a test step.
3. Then P3 tasks S2, S3, S4, each with its own approval.
