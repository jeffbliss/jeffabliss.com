# Game UI look

## Goal

Make the mapper look like Valheim's own map screen: the game's wood panels, buttons, tabs, text fields, checkboxes, cursor, fonts and edge vignette, laid out the way the game lays out its map. Behaviour and controls are unchanged in this step; the game's map gestures come later as their own step.

## Assets

`scripts/extract_assets.py` also pulls `Assets/UI/textures/small/`, `Assets/UI/textures/large/gui_blur.png` and `Assets/UI/textures/cursor.png`. `scripts/copy_assets.mjs` copies a fixed list of about twenty GUI sprites to `web/assets/gui/` (wood panel 512, panel interior, button + highlight + pressed, button_tab + selected + hover, text_field + highlight, checkbox + marker, selection_frame, darken_blob, BraidLine, cursor). Everything under `web/assets/` stays gitignored.

## Layout

- Map full-bleed; `#vignette` overlays the darken blob stretched to the viewport, pointer-events none.
- Toolbar top-left on a nine-sliced wood panel. Tool buttons are tab sprites (selected tab for the active tool); Edit/Done, Undo, Redo, Fit, Export are button sprites. Status text sits inside the panel.
- Sidebar top-right on a wood panel; content areas (leg textarea, measure table, layers list) on the dark panel interior sprite. Headings Norse bold with the game's shadow.
- Pin type bar moves out of the sidebar to a fixed strip at the bottom centre: icons on a dark interior panel, selection frame around the chosen type. Shown only while the Pin tool is active.
- Zoom, Fit and the scale bar bottom-left on a small wood panel.
- Hotkey legend bottom-right, plain shadowed text like the game's: one list for View (drag pan, wheel zoom, double-click recentre, click a pin, E edit) and one for Edit (right-drag pan, tool keys, [ ] size, Cmd/Ctrl+Z undo, Esc done), switched by `body.editing`.
- Pin popup on a wood panel with the text field sprite for the name and button sprites for actions.
- Toast is centred top, Norse, shadowed, no box.
- Page cursor is the game cursor; canvas keeps grab/crosshair as its state cursors through the same sprite with a fallback.

## Code

CSS-only styling in `web/style.css` using `border-image` slices; `web/index.html` gains `#vignette`, `#pinbar` and `#hotkeys`; `web/ui.js` toggles `#pinbar` with the Pin tool instead of `#pin-opts`. No behaviour changes, tests unchanged.

## Verification

Screenshots in View and Edit at desktop width and at 390 px; corners of every panel checked for slice seams; `npm test` still 105 passing.
