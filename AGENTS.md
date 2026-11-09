# AGENTS.md — yt-queue-restore-userscript

Read the collection [`AGENTS.md`](../AGENTS.md) and [`PLAN.md`](../PLAN.md) first. Documentation
lives once in the umbrella repo at `c:\ws\docs\okf\` — do not copy it here.

## Rules for this script

1. Requires `yt-core-lib`. Never copy InnerTube or auth code here — `Ytk.addVideos` already does the
   SAPISIDHASH dance, chunking and rate limiting.
2. **OFF BY DEFAULT.** The gate is `Ytk.featureOn('queueButtons', false)`. It must stay `false`:
   this script draws a button on every card of every feed, which is exactly the noise the collection
   bans unless the user opts in.
3. **EXACTLY ONE context-menu entry**: `Settings…` calling `Ytk.openSettings({...})`.
4. Its action lives on the shared toolbar (`Ytk.mountToolbar`) as a status panel. The per-card
   `＋Q` buttons are its *feature*, not chrome: they are one button per card, revealed on hover, and
   they must never be a bar, a corner widget or a floating panel.
5. No `innerHTML` — YouTube enforces Trusted Types and the throw is silent inside handlers.
6. **Every write is confirmed first** unless the user turned `queueConfirm` off. This is the only
   destructive-ish action in the whole collection; an accidental click adds to a real account.
7. The on/off field is mirrored into `ytk.settings.features.queueButtons` in `openSettings`'s
   `onSave`, because `Ytk.featureOn` reads `settings.features`, not the flat keys. Without that
   mirror the checkbox would save and do nothing — a lie in the UI.
8. One debounced `MutationObserver` is allowed **here and only here**, because feed and search cards
   are appended as you scroll. It must stay debounced (400 ms) and must only ever add one button per
   card (`card.querySelector('.ytk-q-add')` guard).

## Verified DOM facts

- Cards: `ytd-rich-item-renderer`, `ytd-video-renderer`, `ytd-grid-video-renderer`, and the current
  `yt-lockup-view-model` shape.
- The video id comes from `a[href*="v="]` inside the card (`/[?&]v=([A-Za-z0-9_-]{11})/`), falling
  back to `card.contentId` for lockups.
- The card is set to `position: relative` only when its computed position is `static`, then the
  button is absolutely placed top-right — the same approach the old toolkit proved out.
- Click handlers must `preventDefault` **and** `stopPropagation`, or the click navigates to the video
  instead of adding it.

## Uncertain / not verified live

- Watch Later's playlist id is assumed to be `WL`. That is what the old toolkit used successfully; it
  has not been re-verified for this standalone script.
- Success is reported from the promise resolution of `addVideos`; a silently ignored add (e.g. video
  already in the playlist) still shows `✓Q`. Reporting *that* accurately would need a read-back.
- Channel pages and hashtag pages share the `queueOnFeed` toggle. If that proves wrong in use, split
  it rather than adding a fifth field beyond the 2–4 the collection allows.

## Shared toolbar caveat (core 1.2.0)

Each userscript runs in its own sandbox, so the core's `toolbarEl` module state is **per script**.
With several collection scripts installed, core 1.2.0 therefore draws one `.ytk2-bar` per script, all
at `left:16px;bottom:16px` — they overlap and only the top one is clickable. Core **1.3.0** fixes it
by reusing the bar already in the DOM (`toolbarEl = document.querySelector('.ytk2-bar')`).

This repo pins the versioned `yt-core-lib-1.2.0.js` URL on purpose (immutable require, no surprise
core changes). When the collection moves to 1.3.0 on `main`, bump the `@require` here in the same
commit as the rest — do not point at the unversioned `yt-core-lib.js`.
