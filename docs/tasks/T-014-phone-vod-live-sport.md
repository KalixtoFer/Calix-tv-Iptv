# T-014 Phone: Movies/Series header, TV-guide channel rows, readable Sports

Status: implemented; CI result and device test PENDING.

- **Sports cut-off text (root cause):** the design scale `Design.k` is screen width / 1658. On a portrait phone (about 360 dp) it is 0.22, so fixed
  design heights (`dpx(42)` for pills, rows, chips) become about 9 dp while the text keeps its 13 sp minimum, so the text overflows the pill.
  Fix: `DeviceLogic.designScale(widthDp, designWidth, phone)` never goes below `PHONE_MIN_SCALE` (0.6) in phone mode. TV is unchanged.
  Side effect: all screens that use `dpx()` (Movies/Series rows, Sports, Settings) are larger on the phone and scroll sideways where needed.
- **Live TV (phone):** `PhoneChannelRow` in `LiveTabPhone.kt` is now a TV-guide row: logo box, running program (or channel name), time range and channel,
  LIVE badge and progress bar.
- **Movies / Series (phone):** `PhoneVodTop` in `PhoneHome.kt`: title + search, chip row (Categories, Top rated, New, All, then the genres), featured picture.
  Rows below stay as they are (`HomeScreen.kt`, branch `1, 2`).
- Test: `DeviceLogicTest.phoneDesignScaleHasAFloor` (pure Kotlin; not run locally, no Gradle here).

## Not done
Guide screen with date selector and Now / Later / All chips (needs a decision: new EPG view), poster carousel on top of Movies.

## Test steps
1. Phone, portrait, Sports tab: pills ("Ver en directo", "Mostrar todo") show their text completely, cards readable.
2. Live TV: rows show program, time, LIVE badge, progress bar; tap plays, long press opens the menu.
3. Movies and Series: title, chips (genre chips open that genre), big picture, rows below.
4. TV mode: no visible change.
