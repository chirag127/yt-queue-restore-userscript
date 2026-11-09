# AGENTS.md — YT Queue Restore

Read the collection rules first: [`../AGENTS.md`](../AGENTS.md). Documentation lives once in
`c:\ws\docs\okf\` — do not create an `okf/` copy here.

## What this repo is

One userscript, one job: put a video from a feed or search card into Watch Later in one click.
Off by default. This is the only script in the collection that writes to YouTube.

## Non-negotiables

1. **Exactly one context-menu entry**, `Settings…`, calling `Ytk.openSettings` — nothing else.
2. **No `innerHTML`.** The panel uses `Ytk.kv`, `Ytk.note` and `Ytk.h`; the one stylesheet is built
   with `textContent`.
3. **Shared toolbar only:** `Ytk.mountToolbar([{ label: 'Queue', run: openQueue }])`. The per-card
   button is not a bar or a floating widget — it belongs to the card it acts on.
4. **The gate is sacred:** `if (!Ytk.featureOn('queueButtons', false)) return;` runs before anything
   is drawn or observed. Never flip that default to `true`, and never re-register the menu entry
   above the gate.
5. **One write, and only one:** `Ytk.addVideos('WL', [videoId])`. No removal, no reorder, no
   `removeVideos`, no playlist creation.
6. **Core is required, pinned:** `@require …/yt-core-lib-1.3.0.js`. Auth and InnerTube belong to
   `Ytk.addVideos`; do not re-implement SAPISIDHASH here.

## Why the code looks the way it does

- **The flag lives in `settings.features`, the checkbox in `settings.queueButtons`.** `featureOn`
  reads `ytk.settings.features.queueButtons`, so `onSave` mirrors the checkbox into the flag —
  otherwise ticking it would change nothing. The merge keeps every other key intact, because core
  1.3.0's save path rebuilds `ytk.settings` from its own defaults.
- **Visibility is a stylesheet rule, not an inline style.** An inline `opacity` would beat the
  `.ytk-qhost:hover` rule and leave the button stuck on screen. Hidden buttons are also
  `pointer-events:none` so they cannot steal a click from the thumbnail underneath.
- **The id is read at click time.** YouTube recycles card elements while scrolling; an id captured
  when the button was attached can point at a different video when it is pressed.
- **`mousedown` is cancelled as well as `click`.** The button sits inside the thumbnail anchor, so
  without it a press starts a link drag and the click navigates.
- **`MouseEvent`-free hover.** No per-card `mouseenter`/`mouseleave` listeners; one rule on one
  injected stylesheet does the work, and it survives cards being re-rendered.
- **The observer is debounced.** A `MutationObserver` on the body schedules at most one rescan per
  300 ms, and `attach()` exits after a single `querySelector('.ytk-qbtn')` on cards it has already
  handled.
- **Front-end copy is honest about failure.** A missing SAPISID is reported as "Sign in to YouTube
  first" and the raw reason goes to the console, not into a silent no-op.
- **The AI grants stay.** The settings popup renders the shared AI section, which calls
  `GM_xmlhttpRequest`; without `@grant GM_xmlhttpRequest` + `@connect *` its test fails.

## Verification before claiming a change works

```bash
node --check yt-queue-restore.user.js
grep -c "GM_registerMenuCommand('Settings…', settingsPopup);" yt-queue-restore.user.js   # 1
grep -c "innerHTML" yt-queue-restore.user.js                                            # 0
grep -c "featureOn('queueButtons', false)" yt-queue-restore.user.js                     # 1
```

Then check it live on a signed-in session: with the flag off, confirm nothing is drawn; switch it
on and reload; hover a feed card and confirm **+Q** appears in the chosen corner; click it and
confirm the video is now first in Watch Later; repeat from a search result; scroll a long feed and
confirm the buttons follow the recycled cards to the right videos. Static checks alone are not a
live test.
