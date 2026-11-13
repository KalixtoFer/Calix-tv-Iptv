# T-018 Phone design from the maintainer's mock-ups, stage 1 (bottom bar, start page, live sports)

Status: implemented; CI result and device test PENDING.

Design source: five portrait mock-ups (Start, Live TV, Movies, Series, More). The maintainer asked to add "live sports".
Stages: 1 = this task; 2 = Movies / Series (category column + poster grid); 3 = Live TV (categories + channel grid); 4 = More (account card, settings tiles).

- **Bottom bar:** Start, Live TV, Movies, Series, More (as in the mock-ups). Sports and Search moved to the "More" sheet (replaces the T-016 bar).
- **Start page:** logo centred with search at the right, big picture with kicker, title (tap = details), meta, overview and one wide "Jetzt ansehen" button;
  quick tiles and Series / Movies chips removed (not in the design). Hamburger and bell of the mock-up are not done yet.
- **Live sports block** (`PhoneSportsNow.kt`) below Live TV: games running now that one of the user's channels carries (tap = start the channel), else today's next games on the user's channels; "Alle" opens the Sports hub. Same data as the hub (`SportData`), refreshed every 2 minutes.
- Translations: `DictK.kt` ("Sport live", "Sport heute").

## Not done
Stages 2 to 4, hamburger and bell, embedded player preview on Live TV, account data (expiry, screens) on More.

## Test steps
1. Bottom bar shows five entries; Sports and Search are in "More".
2. Start: logo centred, "Ver ahora" plays; below, Live TV cards and (when a game with one of your channels is running) the sports block; tapping a card starts the channel.
3. TV mode: no change.
