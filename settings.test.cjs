const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, 'yt-queue-restore.user.js'), 'utf8');

function popup(initial = {}) {
  let stored = structuredClone(initial);
  let menu;
  let options;
  const context = {
    console,
    location: { pathname: '/' },
    GM_registerMenuCommand(label, callback) {
      assert.equal(label, 'Settings…');
      assert.equal(menu, undefined, 'only one menu entry');
      menu = callback;
    },
    Ytk: {
      featureOn: () => false,
      storeGet: () => stored,
      storeSet: (key, value) => { assert.equal(key, 'settings'); stored = value; },
      openSettings: (value) => { options = value; },
    },
  };
  // No document or observer: disabled startup must not touch page UI.
  vm.runInNewContext(source, context);
  assert.equal(typeof menu, 'function');
  menu();
  return {
    save(patch) {
      // Core 1.4.0 persists the draft, then passes only its DEFAULTS view.
      stored = { ...stored, ...patch };
      options.onSave({ theme: 'dark' });
      return JSON.parse(JSON.stringify(stored));
    },
  };
}

test('first enable reads the checkbox persisted before onSave', () => {
  const result = popup().save({ queueButtons: true });
  assert.equal(result.queueButtons, true);
  assert.equal(result.features.queueButtons, true);
});

test('unchecking an enabled checkbox disables its feature flag', () => {
  const result = popup({ queueButtons: true, features: { queueButtons: true } })
    .save({ queueButtons: false });
  assert.equal(result.queueButtons, false);
  assert.equal(result.features.queueButtons, false);
});

test('saving preserves current unrelated settings and feature flags', () => {
  const result = popup({ queueButtons: false, features: { queueButtons: false, other: true }, custom: 'old' })
    .save({ queueButtons: true, queueConfirm: true, queuePosition: 'top-left', custom: 'new', features: { other: false, added: true } });
  assert.deepEqual(result, {
    queueButtons: true,
    features: { other: false, added: true, queueButtons: true },
    custom: 'new',
    queueConfirm: true,
    queuePosition: 'top-left',
  });
});

test('missing checkbox remains disabled by default', () => {
  const result = popup().save({});
  assert.equal(result.queueButtons, false);
  assert.equal(result.features.queueButtons, false);
});
