// ==UserScript==
// @name         YT Queue Restore
// @namespace    https://github.com/chirag127
// @version      1.0.2
// @description  A hover +Q button on feed and search video cards that adds the video to Watch Later in one click. Off by default.
// @author       chirag127
// @license      MIT
// @match        https://www.youtube.com/*
// @require      https://raw.githubusercontent.com/chirag127/yt-core-lib/main/yt-core-lib-1.4.0.js
// @downloadURL  https://raw.githubusercontent.com/chirag127/yt-queue-restore-userscript/main/yt-queue-restore.user.js
// @updateURL    https://raw.githubusercontent.com/chirag127/yt-queue-restore-userscript/main/yt-queue-restore.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      *
// @noframes
// @run-at       document-idle
// ==/UserScript==

/*
 * OFF BY DEFAULT. `Ytk.featureOn('queueButtons', false)` is the gate: with the feature
 * switched off nothing is drawn and no listener is attached at all.
 *
 * This is the one script in the collection that writes to YouTube, and it writes exactly
 * one thing: `Ytk.addVideos('WL', [videoId])` — add to Watch Later. It never removes,
 * reorders or plays anything.
 *
 * ONE menu entry: `Settings…` opens the shared settings popup. The panel offered by the
 * toolbar button is the same action without hovering.
 */

(function () {
  'use strict';

  if (typeof Ytk === 'undefined') { console.error('[yt-queue-restore] core did not load'); return; }
  // These gate the UI only. Gating the menu entry made the popup unreachable while
  // the feature was off — the only way to turn it on is that popup.
  const ENABLED = Ytk.featureOn('queueButtons', false);
  const ON_SURFACE = ['/', '/results', '/feed', '/@', '/c/', '/channel/', '/user/', '/subscriptions']
    .some(function (prefix) { return location.pathname.indexOf(prefix) === 0; });

  const CARD_SEL = 'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer';
  const ID_RE = /[?&]v=([A-Za-z0-9_-]{11})/;
  // Layout and look only. Visibility is a stylesheet rule, because an inline `opacity`
  // would beat the hover rule and leave the button stuck on screen.
  const BTN = 'position:absolute;z-index:5;font:600 11px/1 system-ui,sans-serif;padding:4px 8px;'
    + 'border:0;border-radius:7px;cursor:pointer;background:rgba(0,0,0,.8);color:#fff';

  function raw() { return Ytk.storeGet('settings', {}) || {}; }

  const CSS_ID = 'ytk-queue-css';

  /** The hover rule lives in one stylesheet, so nothing depends on mouse listeners. */
  function ensureCss() {
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = [
      '.ytk-qhost{position:relative}',
      // Hidden until the card is hovered, and click-through while hidden so it never
      // steals a click from the thumbnail underneath it.
      '.ytk-qbtn{opacity:0;pointer-events:none;transition:opacity .12s ease}',
      '.ytk-qhost:hover .ytk-qbtn,.ytk-qbtn:focus-visible{opacity:1;pointer-events:auto}'
    ].join('');
    (document.head || document.documentElement).appendChild(style);
  }

  function cardId(card) {
    const anchors = card.querySelectorAll('a[href*="v="]');
    for (let i = 0; i < anchors.length; i++) {
      const match = (anchors[i].getAttribute('href') || '').match(ID_RE);
      if (match) return match[1];
    }
    return null;
  }

  function cardTitle(card) {
    const el = card.querySelector('#video-title, a#video-title-link, yt-formatted-string#video-title');
    return el ? (el.getAttribute('title') || el.textContent || '').trim() : '';
  }

  /** Put the button on the thumbnail when the card has one, so it tracks the image. */
  function buttonHost(card) {
    return card.querySelector('#thumbnail, yt-thumbnail-view-model, a#thumbnail') || card;
  }

  function addToWatchLater(id, title, button) {
    if (raw().queueConfirm === true) {
      if (!confirm('Add “' + (title || id) + '” to Watch Later?')) return;
    }
    if (button) { button.disabled = true; button.textContent = '…'; }
    Ytk.addVideos('WL', [id]).then(function (count) {
      Ytk.toast(count ? 'Added to Watch Later' : 'Watch Later did not accept it');
      if (!button) return;
      button.textContent = '✓';
      setTimeout(function () { button.textContent = '+Q'; button.disabled = false; }, 1400);
    }).catch(function (err) {
      const message = String((err && err.message) || err);
      console.error('[yt-queue-restore] Watch Later add failed:', message);
      Ytk.toast(/SAPISID|signed in/i.test(message) ? 'Sign in to YouTube first' : 'Watch Later add failed');
      if (button) { button.textContent = '+Q'; button.disabled = false; }
    });
  }

  function attach(card) {
    if (!card || card.querySelector('.ytk-qbtn')) return;
    if (!cardId(card)) return;
    const host = buttonHost(card);
    if (!host) return;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.classList.add('ytk-qhost');

    const corner = raw().queuePosition === 'top-left' ? 'top:6px;left:6px' : 'top:6px;right:6px';
    const button = Ytk.h('button', {
      class: 'ytk-qbtn',
      text: '+Q',
      title: 'Add this video to Watch Later',
      style: BTN + ';' + corner
    });
    // The thumbnail is a link: stop the press from navigating or starting a drag.
    button.addEventListener('mousedown', function (event) { event.preventDefault(); event.stopPropagation(); });
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      // Read the card again on click: YouTube recycles card elements while scrolling,
      // so an id captured when the button was attached can point at a different video.
      const id = cardId(card);
      if (!id) { Ytk.toast('Could not read this card’s video id'); return; }
      addToWatchLater(id, cardTitle(card), button);
    });
    host.appendChild(button);
  }

  function scan() {
    ensureCss();
    const cards = document.querySelectorAll(CARD_SEL);
    for (let i = 0; i < cards.length; i++) {
      try { attach(cards[i]); } catch (e) { /* a card was replaced mid-scan */ }
    }
  }

  let scanTimer = null;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(function () { scanTimer = null; scan(); }, 300);
  }

  // ---------------------------------------------------------------- panel

  function openQueue() {
    const cards = Array.from(document.querySelectorAll(CARD_SEL)).filter(function (card) { return !!cardId(card); });
    if (!cards.length) { Ytk.toast('No video cards on this page'); return; }

    Ytk.panel('Watch Later', function (body) {
      Ytk.kv(body, 'Videos on this page', cards.length);
      Ytk.note(body, 'Hovering a card shows a +Q button. This list does the same thing without hovering, which helps on a trackpad or a touch screen.');
      body.appendChild(Ytk.h('div', { style: 'height:6px' }));

      const limited = cards.slice(0, 40);
      limited.forEach(function (card) {
        const button = Ytk.h('button', {
          text: 'Add',
          style: 'font:inherit;font-size:11.5px;padding:4px 9px;border-radius:8px;cursor:pointer;'
            + 'border:1px solid #3a3a3a;background:#262626;color:#eaeaea;flex:0 0 auto'
        });
        const id = cardId(card);
        button.addEventListener('click', function () { addToWatchLater(id, cardTitle(card), button); });
        body.appendChild(Ytk.h('div', { class: 'ytk2-row' },
          Ytk.h('span', { class: 'grow', text: cardTitle(card) || id }),
          button
        ));
      });
      if (cards.length > limited.length) {
        Ytk.note(body, 'Showing the first ' + limited.length + ' of ' + cards.length + '. Scroll for more and reopen this panel.');
      }
      Ytk.note(body, 'Adding needs the signed-in account that owns the Watch Later list.');
    });
  }

  // ---------------------------------------------------------------- settings

  function settingsPopup() {
    const before = raw();
    Ytk.openSettings({
      title: 'YT Queue Restore',
      subtitle: 'The hover buttons are off by default. Turn them on when you want them.',
      sectionTitle: 'Hover buttons',
      fields: [
        {
          key: 'queueButtons',
          label: 'Enable the hover +Q buttons',
          type: 'checkbox',
          def: Ytk.featureOn('queueButtons', false),
          hint: 'This is the on/off switch for the script itself. Reload the page after changing it.'
        },
        {
          key: 'queueConfirm',
          label: 'Ask before adding a video',
          type: 'checkbox',
          def: raw().queueConfirm === true
        },
        {
          key: 'queuePosition',
          label: 'Corner the button sits in',
          type: 'select',
          options: ['top-right', 'top-left'],
          def: raw().queuePosition === 'top-left' ? 'top-left' : 'top-right',
          hint: 'Applies to newly drawn buttons; reload to move the existing ones.'
        }
      ],
      actions: [
        { label: 'Open the Watch Later list for this page', run: openQueue }
      ],
      onSave: function (next) {
        // Core 1.3.0 drops keys it does not know, so merge back, then keep the feature
        // flag in step with the checkbox that turns this script on.
        const merged = Object.assign({}, before, next);
        const on = merged.queueButtons === undefined ? Ytk.featureOn('queueButtons', false) : merged.queueButtons === true;
        merged.queueButtons = on;
        merged.features = Object.assign({}, before.features || {}, { queueButtons: on });
        Ytk.storeSet('settings', merged);
      }
    });
  }

  GM_registerMenuCommand('Settings…', settingsPopup);

  if (ENABLED && ON_SURFACE) {
    Ytk.mountToolbar([{ label: 'Queue', run: openQueue }]);
    scan();
    document.addEventListener('yt-navigate-finish', scheduleScan);
    new MutationObserver(scheduleScan).observe(document.body || document.documentElement, { childList: true, subtree: true });
  }
})();
