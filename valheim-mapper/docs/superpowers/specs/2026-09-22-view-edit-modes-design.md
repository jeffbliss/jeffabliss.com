# View and Edit modes

## Goal

The map opens read-only, like a published web map. Editing is a deliberate step behind an Edit button, so nobody paints or drops a pin by accident. The Pan tool goes away: in View mode every drag pans, and in Edit mode right-drag pans.

## Modes

- **View** (default on every load, never remembered): left, right and middle drag and Space+drag all pan. The toolbar shows Edit, Measure, Fit and Export. Clicking a pin selects it and opens its popup read-only: the name is shown but not editable, Delete is hidden, Check still toggles and syncs, `X` still works. Enter, Delete and Backspace on a pin do nothing. Paint, Ink, Pin, Select and Log hotkeys and Cmd/Ctrl+V do nothing. Measure works exactly as today.
- **Edit** (Edit button or `E`; Edit again or `Esc` leaves): the toolbar expands with Paint, Ink, Pin, Select, Log, Undo and Redo. It reopens on the last edit tool used, Paint the first time. Right, middle and Space drag pan. Everything else is today's behaviour.

`Esc` leaves Edit only when nothing else claims it: a pending paste, an active Measure route and a focused text field keep their current Esc behaviour. Undo history survives mode changes.

## Code

- `tools.editing` (boolean) and `tools.setEditing(on)` on the tools object in `web/tools.js`. `tools.current` is `'view'` in View mode (no handler, like `'pan'` today); Measure is allowed in both modes and toggles back to the mode's resting tool when clicked again.
- `panGesture(e, { editing, tool, spaceDown })` is a pure exported function used by `isPanGesture`, tested in `tests/tools.test.js`.
- `cameraControls` in `web/main.js` selects a pin on a click (press and release within 4 px) in View mode, and deselects on a click on empty map. Double-click recentre is unchanged.
- The Edit button and per-mode toolbar visibility live in `web/ui.js` (`data-edit` on edit-only buttons, toggled from `tools.onChange`). Body gets a `view`/`edit` class for the popup styling.
- `wirePinPopup` and `pinKeys` read `app.tools.editing` to gate rename and delete.
- `clipboard.js` ignores paste when not editing.
- README: Controls section rewritten around the two modes.

## Verification

`npm test` green including the new `panGesture` cases. In the dev server: load opens in View with a grab cursor and only Edit, Measure, Fit, Export visible; left-drag pans; clicking a pin shows the read-only popup and Check works; `B` does nothing; Edit reveals the tools and Paint draws; right-drag pans in Paint; Esc returns to View.
