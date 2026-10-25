# jeffabliss.com

A personal website. Something to have fun with and be proud of.

Started from scratch on 2026-10-25. The previous Hugo site and all of its
history were deleted. Nothing from it carries over unless Jeff says so.

GitHub: jeffbliss/jeffabliss.com. Default branch: master.

## Responsibilities

- Jeff is the sole creator and designer. Jeff makes every choice: content,
  design, features, technology, structure.
- Claude is the developer. Claude implements the choices Jeff has made.
- If Claude is about to make a decision Jeff has not made, Claude stops and
  checks in first. No creative license without asking. Suggestions are
  welcome, but as questions, not as changes.

## Technology

- Astro, static output. Node LTS installed via winget.
- Standard Astro layout: src/pages/ is the site map (one file = one URL),
  src/layouts/ for page shells, src/components/ for reusable pieces,
  public/ for files copied as-is. Folders are created when first needed,
  not ahead of time.
- Build with npm run build; output goes to dist/ as plain HTML.
- Keep it easy to understand and easy to develop. Prefer plain, readable
  approaches over clever or heavy ones.

## Deployment

- Cloudflare Pages, connected to the GitHub repo. Every push to master
  builds and deploys on Cloudflare's side. No deploy config lives in the
  repo.
- Cloudflare build settings: framework Astro, build command npm run build,
  output directory dist, root directory empty.

## Readability

- Jeff does not need to scrutinize every line, but must be able to
  understand the flow of the code and trace through it when needed.
- Good organization matters: the folder structure should tell you where
  things live, and each file should do one obvious thing.
- Keep changes small and focused. One idea per change.
- Report what was changed and why in plain language, listing the files
  touched.
- Prefer explicit code over clever code. Nothing hidden behind magic.

## Obsidian canvas

- The site is designed on an Obsidian canvas at
  C:\Obsidian\Jeff's Vault\jeffabliss.com.canvas. It is the source of
  truth for what pages exist, how they connect, and what the site looks
  like. Page copy lives in vault notes the canvas cards point to.
- The canvas has three regions. Site map: one small card per page, arrows
  are the nav. Content: one file card per page showing its note. Design:
  site-wide decisions such as colors, fonts, and layout rules.
- A site map card is linked to its note by a wikilink on the card, such
  as [[jeffabliss.com about page]]. No arrows between regions.
- A SessionStart hook runs scripts/sync-canvas.mjs once per session. It
  first rewrites each site map card that has a wikilink from that note
  (name from the note's first heading, url and status from frontmatter,
  color from status, wikilink kept). Then, if the canvas differs from the
  repo copy, it copies it to design/, commits with the message "updated
  obsidian canvas", and prints what changed.
- Site map cards with a wikilink are generated. Edit the note, not the
  card. A card without a wikilink is left alone.
- When the hook prints changes: tell Jeff what changed, then stop. Do not
  implement anything from the canvas until Jeff says to. If a card is
  missing something needed to build it, ask.

## Page status

Every page note has a status in its frontmatter. Allowed values and the
canvas card color each one gets:

| status   | meaning                                      | color  |
|----------|----------------------------------------------|--------|
| idea     | nothing exists but the basic scaffolding     | yellow |
| planning | working out the details                      | orange |
| decided  | ready to implement                           | cyan   |
| built    | it has been built                            | green  |
| bug      | built but something is wrong                 | red    |

Any other value makes the hook print a warning and leave the card alone.

## Testing

- Jeff is explicit about every test that gets written. Claude does not add
  tests on its own.
- Claude may suggest tests. Jeff decides whether they are written.

## Workflow

- Normal workflow: feature branch, open a PR, tests must pass on the PR,
  merge into master, then tag the version.
- While getting things up and running, work directly on master. Jeff will
  say when to switch to the normal workflow.

## Open decisions

These are Jeff's to make. Claude does not pick them.

- What the site is about and what pages it has
- Design: look, feel, typography, color
- Test runner and what to test
- Version tagging scheme
