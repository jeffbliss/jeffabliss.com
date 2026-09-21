import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renameCommand } from '../web/ui.js';

test('renameCommand returns null when unchanged and an undoable command otherwise', () => {
  const pin = { name: 'a' };
  assert.equal(renameCommand(pin, 'a', 'a'), null);
  const cmd = renameCommand(pin, 'a', 'b');
  assert.equal(pin.name, 'b'); assert.equal(cmd.label, 'rename');
  cmd.undo(); assert.equal(pin.name, 'a'); cmd.redo(); assert.equal(pin.name, 'b');
});
