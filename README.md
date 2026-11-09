# YT Queue Restore

Hover a card on a feed, search or channel page and click **＋Q** to add that video to **Watch Later**.

**Off by default.** Enable it in **Settings…** first — nothing is drawn while it is off.

## Where it runs

Home, `/feed/…`, `/results` (search), `/@handle`, `/c/…`, `/channel/…`, `/user/…` and `/hashtag/…`.
Not the watch page and not the playlist page.

## Install

Read the [install guide](https://github.com/chirag127/userscript-install-guide), then:

```
https://github.com/chirag127/yt-queue-restore-userscript/raw/main/yt-queue-restore.user.js
```

Requires [`yt-core-lib`](https://github.com/chirag127/yt-core-lib), pulled in with `@require`.
You do not install the core yourself.

## Settings

Exactly one context-menu entry, called **Settings…**:

| Setting | Default | Meaning |
|---|---|---|
| Enable the ＋Q hover buttons | **off** | the master switch; off means the script returns before drawing anything |
| Show them on home, feed and channel pages | on | |
| Show them on search results | on | |
| Ask before adding a video to Watch Later | on | a confirmation prompt before every write |

Saving in the popup reloads the page, which re-injects the buttons with the new settings.

## How the write works

`Ytk.addVideos('WL', [videoId])` from the core — one InnerTube `browse/edit_playlist` call signed with
SAPISIDHASH from your own cookies. Nothing is scraped from the UI menus, and nothing is queued in the
background: one click, one add.

## Storage

None of its own. It reads the shared `ytk.settings` (`queueButtons`, `queueOnFeed`, `queueOnSearch`,
`queueConfirm`) and mirrors the master switch into `ytk.settings.features.queueButtons`, which is what
`Ytk.featureOn` reads.

## What it does NOT do

- It never removes anything from Watch Later, and has no bulk mode — one card per click.
- It does not touch the default watch queue, only Watch Later (`WL`).
- It does not add videos on the watch page's own "up next" panel.

## Why it is off by default

It injects a button into every card on every feed, which is page chrome the user did not ask for. The
old all-in-one toolkit shipped it on and the user hit exactly that. Off by default is the rule for
anything that draws on surfaces you did not open for it.

## License

MIT
