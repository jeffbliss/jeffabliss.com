# Game pin gestures

## Goal

Pins work the way Valheim's map screen works, in every mode: double-click places a pin of the type chosen in the bottom bar and opens its name box, a click on a pin toggles its cross, a right-click on a pin removes it, and double-clicking a pin opens its popup. The Pin tool goes away. Painting, ink, select and log stay behind Edit.

## Rules

- **Double-click on empty map** in View or with the Select tool: place a pin at the point, select it, focus the name box. Other tools keep their own click handling, so no pin is placed while painting or drawing.
- **Click on a pin** in View (press and release within 4 px): toggle checked. Click on empty map deselects.
- **Right-click on a pin** (press and release without moving) in any mode: remove it, with a toast offering undo. The start pin cannot be removed. Right-drag still pans.
- **Double-click on a pin**: select it and open the popup with the name focused.
- **Double-click recentre is gone**; `0` and Fit remain.
- **Pins are live in View**: the popup allows rename, check and delete in both modes. Correct stays Edit-only because it moves terrain.
- **Pin bar** at the bottom is always visible. `P` no longer does anything.

## Code

- `web/pins.js`: `pinActions(app)` returns `place`, `toggleChecked`, `remove`, each one synced undoable command. `pinKeys` and the popup use it. `pinTool` is deleted.
- `web/main.js`: `cameraControls` gains the click and double-click gestures using `app.pinActions`; `app.pinActions` is created after `app`.
- `web/tools.js`: `pin` leaves `HOTKEYS` and `EDIT_TOOLS`.
- `web/ui.js`: popup no longer gates rename and delete on Edit; pin bar toggle removed.
- `web/index.html`: Pin button removed, pin bar not hidden, hotkey legend updated. README Controls updated.

## Verification

Dev server: in View, double-click places a pin with the name box focused, click toggles its cross, right-click removes it and Cmd/Ctrl+Z brings it back, right-drag still pans, double-click on the start pin opens its popup. In Edit with Paint active, double-click paints and places nothing. Tests unchanged.
