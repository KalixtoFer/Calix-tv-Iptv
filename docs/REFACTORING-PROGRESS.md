# Refactoring progress

Last update: 2026-11-11 (after T-001b and push). Source: refactoring audit of 2026-11-11, sections 11 and 14. Baseline: commit `b65e838` = tag `V1.3` = tag `pre-refactor`.

Rules: one task at a time, approval before implementation (CLAUDE.md sections 6 and 7). No new features during the refactoring; 1.4 starts after it.

## Phases

| Phase | Content | Code change | Status |
|---|---|---|---|
| P0 | Audit | none | done |
| P1 | Test fix, baseline, repo hygiene, documentation skeleton | tests, `.gitignore`, `CLAUDE.md`, docs | in progress (T-001, T-001b, T-003, T-005 done; T-004 in progress) |
| P2 | Comments to English (about 44 files plus manifest, Gradle, XML); check that code without comments is identical | comments only | not started |
| P3 | Security fixes, one task each: S1 `/listimport` code and size limit; S2 6-digit code, atomic lock, constant-time compare; S3 HTTP warning (new texts); S4 TLS downgrade visible; S6 `SECURITY.md`; S7 backup completeness | small, with approval | in progress (S1 done as T-002; S6 done as part of T-005; S2, S3, S4 open; S7 is T-006) |
| P4 | Names (stage 2): test names, then `Round*` files, then remaining identifiers after an inventory | broad | not started |
| P5 | Split large files: `SettingsHub`, `LiveTab`, `HomeScreen`/`HomeParts`, `PlaylistStore`, `PlayerScreen` last. Detach `PlayerLogic` from Media3 first | large, with tests | not started |
| P6 | Repository documents to English and up to date | docs only | not started |
| later | R8 again, Media3/FFmpeg versions, CI hardening, package structure, backup gaps | open | not started |

S5 (Google fields) is dropped: the fields stay for 1.4.

## Tasks

Task IDs follow audit section 14. They replace the IDs in the table of section 11.

| ID | Task | Files | Status |
|---|---|---|---|
| T-001 | Fix the red test: expectation for 10 languages | `PhoneImportTest.kt` | done |
| T-001b | `org.json` as test dependency (`Round25Test.parsesTraktJsonTolerantly` was red) | `app/build.gradle.kts`, `Round25Test.kt` | done (commit `75e1892`) |
| T-002 | S1: `/listimport` needs the access code; upload limit 16 MiB | `PhoneImport.kt`, `RemoteLogic.kt`, tests | done (commit `a804180`, pushed); device test PENDING |
| T-003 | Repo hygiene: `*.apk` in `.gitignore`; correct CLAUDE.md | `.gitignore`, `CLAUDE.md` | done (commit hash PENDING) |
| T-004 | Quality baseline | `docs/quality/baseline-2026-11-11.md` | in progress (values PENDING) |
| T-005 | Documentation skeleton and CHANGELOG 1.2/1.3 | docs, `CHANGELOG.md`, `CLAUDE.md` section 15 | done (CHANGELOG content PENDING) |
| T-006 | Add five missing stores to the backup `NAMES` | `Backup.kt` | open (approved) |
| T-007 ff. | P2, P3 S2/S3/S4, P4, P5 | | open, one approval each |
| 1.4 | Google Drive as LiveSync, rebuilt from the `V1.1` code | | after the refactoring |
