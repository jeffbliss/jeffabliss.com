import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renameCommand, statusText } from '../web/ui.js';

test('statusText spells out the offline state', () => {
  assert.equal(statusText('offline'), 'offline — reload to sign in again');
  assert.equal(statusText('connected', { name: 'bo' }), 'connected as bo');
});

test('renameCommand returns null when unchanged and an undoable command otherwise', () => {
  const pin = { name: 'a' };
  assert.equal(renameCommand(pin, 'a', 'a'), null);
  const cmd = renameCommand(pin, 'a', 'b');
  assert.equal(pin.name, 'b'); assert.equal(cmd.label, 'rename');
  cmd.undo(); assert.equal(pin.name, 'a'); cmd.redo(); assert.equal(pin.name, 'b');
});
