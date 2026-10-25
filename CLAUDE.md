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

## Ideas and content

- Jeff keeps his ideas, notes, and page copy in Obsidian. That vault is
  his alone: nothing in this repo reads it, syncs it, or depends on how
  it is organized.
- When Jeff wants something on the site, he says so and points Claude at
  the note or pastes the text. Claude builds from that and asks if
  anything needed is missing.
- Decisions are made in conversation. The commit history is the record
  of what was decided.

## Testing

- Jeff is explicit about every test that gets written. Claude does not add
  tests on its own.
- Claude may suggest tests. Jeff decides whether they are written.

## Workflow

- Feature branch, open a PR, checks must pass on the PR, merge into
  master, then tag the version. This has been the workflow since
  2026-10-25; nothing goes directly onto master.
- Tagging waits until Jeff picks a version scheme (see Open decisions).

## Open decisions

These are Jeff's to make. Claude does not pick them.

- What the site is about and what pages it has
- Design: look, feel, typography, color
- Test runner and what to test
- Version tagging scheme
