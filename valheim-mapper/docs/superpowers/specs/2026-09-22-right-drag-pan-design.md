# Right-drag pans everywhere

## Goal

Panning should never require switching tools. Holding the right mouse button and dragging pans the map in every tool. The Pan tool, `H`, Space+drag and middle-drag all stay.

## Change

- `isPanGesture` in `web/main.js` also returns true for `e.button === 2`. The shared dispatcher in `web/tools.js` already returns early for pan gestures, so no tool sees a right button press.
- Right-click branches in tools become dead code and are removed: the `secondary` branch in `rasterBrushTool`, the `erasing` trigger in `inkTool`, the `button === 2` guard in the Pin tool.
- Alt+drag erase is removed from Paint and Ink at the same time.
- The paste-ghost intercept still runs before the pan check, unchanged.

## Erase

- Terrain: the palette's existing None swatch is the eraser. No change.
- Fog swatch: the secondary "reveal" action is dropped; painting any biome already reveals.
- Ink: a new Erase button at the start of the colour row toggles `tools.options.inkErase`. While on, a left drag removes strokes under the cursor with the same hit tolerance and undo command as right-drag did today. Picking a colour swatch or the custom colour turns it off. The cursor shows a small square instead of the width dot while erasing.

## Docs

README camera line gains "Right-drag: pan". Ink line describes the Erase button. Source comments on the affected tools are updated.

## Verification

`npm test` stays green. Manual check with `npm run dev`: right-drag pans in Paint, Ink, Pin, Select, Log and Measure without editing; Ink Erase removes strokes and undo restores them; None swatch still clears terrain.
