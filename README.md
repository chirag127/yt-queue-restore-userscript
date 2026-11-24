# YT Queue Restore

A hover **+Q** button on feed and search video cards that puts the video straight into Watch Later,
without opening the card's menu.

**Off by default, on purpose.** With the feature switched off the script draws no queue UI and
attaches no page listeners. The gate is `Ytk.featureOn('queueButtons', false)`.

To configure it, open this script's **Settings…** entry in your userscript manager on YouTube.
The menu entry is available even while the hover buttons are off. Use **Enable the hover +Q
buttons**, then **Save** and reload the page after changing the switch.

## What it does

- Hovers over a card show **+Q** in the top-right corner of the thumbnail (top-left if you prefer).
- Click adds that video to Watch Later with `Ytk.addVideos('WL', [videoId])`, which is the core's
  InnerTube call: it needs the signed-in account that owns the list.
- **Ask before adding a video** turns the click into a confirmation dialog.
- The **Queue** button on the shared toolbar opens a panel listing the cards on this page with an
  **Add** button each — the same action without hovering, which is easier on a trackpad or a touch
  screen.

This script writes exactly one thing to YouTube: an add to Watch Later. It never removes, reorders,
likes or plays anything.

## Where it runs

- the home feed, `/results` searches, `/feed/…`, channel pages, and `/subscriptions`

Not on the watch page, and not on a playlist page.

## Settings

One entry — **Settings…** — calls `Ytk.openSettings` from
[yt-core-lib](https://github.com/chirag127/yt-core-lib) to open the shared settings popup.

| Field | Key | Default | Purpose |
|---|---|---|---|
| Enable the hover +Q buttons | `queueButtons` | off | the script's own on/off switch, mirrored into the shared feature flag |
| Ask before adding a video | `queueConfirm` | off | a confirmation dialog on every click |
| Corner the button sits in | `queuePosition` | `top-right` | `top-right` or `top-left`; reload to move existing buttons |

## Notes

- The button is click-through while hidden, so it never steals a click from the thumbnail.
- The card is read again at click time. YouTube recycles card elements while you scroll, and an id
  captured when the button was attached can belong to a different video by the time you press it.
- Every add reports back: a success toast, or the reason it failed (usually "not signed in").

## Install

Follow the [install guide](https://github.com/chirag127/userscript-install-guide). The script
`@require`s [yt-core-lib](https://github.com/chirag127/yt-core-lib), which is never installed on
its own.

## Docs

Collection documentation is single-sourced in the workspace bundle: `c:\ws\docs\okf\`.
