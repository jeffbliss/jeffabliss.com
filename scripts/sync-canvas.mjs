import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

// Design documents live in Obsidian, not in this repo. This script keeps a
// private copy of the canvas and the notes it links to in .vault-snapshot/
// (gitignored) so each session can report what changed since the last one.

const vaultDir = process.argv[2] ?? "C:/Obsidian/Jeff's Vault";
const canvasName = "jeffabliss.com.canvas";
const vaultCanvas = join(vaultDir, canvasName);
const snapshotDir = ".vault-snapshot";
const snapshotCanvas = join(snapshotDir, canvasName);

const statusColors = {
  idea: "3",
  planning: "2",
  decided: "5",
  draft: "6",
  built: "4",
  bug: "1",
};

if (!existsSync(vaultCanvas)) process.exit(0);

const canvas = JSON.parse(readFileSync(vaultCanvas, "utf8"));
const warnings = updateSiteMapCards(canvas);
const canvasText = formatCanvas(canvas);
if (canvasText !== readFileSync(vaultCanvas, "utf8")) {
  writeFileSync(vaultCanvas, canvasText);
}

const noteNames = notesOn(canvas);

if (!existsSync(snapshotDir)) {
  writeSnapshot(canvasText, noteNames);
  console.log(
    `Created the vault snapshot in ${snapshotDir}/. Future sessions will report what changed since the last one.`,
  );
  printWarnings(warnings);
  process.exit(0);
}

const canvasChanges = describeChanges(
  JSON.parse(readFileSync(snapshotCanvas, "utf8")),
  canvas,
);
const noteChanges = describeNoteChanges(noteNames);
writeSnapshot(canvasText, noteNames);

if (canvasChanges.length === 0 && noteChanges.length === 0 && warnings.length === 0) {
  process.exit(0);
}

if (canvasChanges.length > 0 || noteChanges.length > 0) {
  console.log("The Obsidian vault changed since the last session.");
  console.log(
    "Tell Jeff exactly what changed, then pause and wait for him before implementing anything.",
  );
}
if (canvasChanges.length > 0) {
  console.log("");
  console.log("Canvas:");
  for (const change of canvasChanges) console.log(`- ${change}`);
}
if (noteChanges.length > 0) {
  console.log("");
  console.log("Notes:");
  for (const change of noteChanges) console.log(`- ${change}`);
}
printWarnings(warnings);

function printWarnings(warnings) {
  if (warnings.length === 0) return;
  console.log("");
  console.log("Canvas warnings to pass on to Jeff:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

// --- Site map cards -------------------------------------------------------

function updateSiteMapCards(canvas) {
  const warnings = [];

  for (const card of canvas.nodes ?? []) {
    if (card.type !== "text") continue;
    const link = wikilinkIn(card.text);
    if (!link) continue;

    const notePath = join(vaultDir, `${link}.md`);
    if (!existsSync(notePath)) {
      warnings.push(`Card "${labelOf(card)}" links to a note that does not exist: [[${link}]]`);
      continue;
    }
    const note = readFileSync(notePath, "utf8");
    const frontmatter = parseFrontmatter(note);
    const name = firstHeading(note) ?? labelOf(card);
    const url = frontmatter.url ?? "";
    const status = frontmatter.status ?? "";

    if (!(status in statusColors)) {
      warnings.push(
        `${link}.md has status "${status}". Allowed: ${Object.keys(statusColors).join(", ")}. Card left unchanged.`,
      );
      continue;
    }

    card.text = `**${name}**\n${url}\nstatus: ${status}\n[[${link}]]`;
    card.color = statusColors[status];
  }

  return warnings;
}

function wikilinkIn(text) {
  const match = (text ?? "").match(/\[\[([^\]|#]+)/);
  return match ? match[1].trim().replace(/\.md$/, "") : null;
}

function parseFrontmatter(note) {
  const match = note.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    result[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return result;
}

function firstHeading(note) {
  const match = note.match(/^#{1,6} (.+)$/m);
  return match ? match[1].trim() : null;
}

function formatCanvas(canvas) {
  const list = (items) =>
    (items ?? []).map((item) => `\t\t${JSON.stringify(item)}`).join(",\n");
  return `{\n\t"nodes":[\n${list(canvas.nodes)}\n\t],\n\t"edges":[\n${list(canvas.edges)}\n\t]\n}`;
}

// --- Notes ----------------------------------------------------------------

// Every note the canvas points at: file cards name theirs in `file`,
// site map cards name theirs in a wikilink. Names are vault-relative,
// without the .md extension.
function notesOn(canvas) {
  const names = new Set();
  for (const node of canvas.nodes ?? []) {
    if (node.type === "file" && node.file?.endsWith(".md")) {
      names.add(node.file.slice(0, -3));
    }
    if (node.type === "text") {
      const link = wikilinkIn(node.text);
      if (link) names.add(link);
    }
  }
  return [...names].sort();
}

function describeNoteChanges(noteNames) {
  const changes = [];

  for (const name of noteNames) {
    const vaultPath = join(vaultDir, `${name}.md`);
    const snapshotPath = join(snapshotDir, `${name}.md`);
    if (!existsSync(vaultPath)) continue; // already warned about above

    const note = readFileSync(vaultPath, "utf8");
    const status = parseFrontmatter(note).status ?? "";

    if (!existsSync(snapshotPath)) {
      changes.push(
        describeNoteChange({
          name,
          kind: "added",
          status,
          previousStatus: "",
          added: lineCount(note),
          removed: 0,
        }),
      );
      continue;
    }

    const old = readFileSync(snapshotPath, "utf8");
    if (old === note) continue;
    changes.push(
      describeNoteChange({
        name,
        kind: "edited",
        status,
        previousStatus: parseFrontmatter(old).status ?? "",
        ...numstat(snapshotPath, vaultPath),
      }),
    );
  }

  for (const file of snapshotNoteFiles()) {
    const name = file.slice(0, -3);
    if (noteNames.includes(name)) continue;
    const old = readFileSync(join(snapshotDir, file), "utf8");
    changes.push(
      describeNoteChange({
        name,
        kind: "removed",
        status: "",
        previousStatus: parseFrontmatter(old).status ?? "",
        added: 0,
        removed: lineCount(old),
      }),
    );
  }

  return changes;
}

// Turns one note's change into the single line printed at session start.
//
// change.name           note name, e.g. "jeffabliss.com about page"
// change.kind           "added" (new on the canvas), "edited", or
//                       "removed" (no longer on the canvas)
// change.status         status now, "" when removed
// change.previousStatus status in the snapshot, "" when added
// change.added          lines added since the snapshot
// change.removed        lines removed since the snapshot
function describeNoteChange(change) {
  return `${change.name} has changed.`;
}

// Line counts from git, which can diff any two files with --no-index.
// It exits 1 when the files differ, so the output arrives via the error.
function numstat(oldPath, newPath) {
  let output;
  try {
    output = execFileSync(
      "git",
      ["diff", "--no-index", "--numstat", "--", oldPath, newPath],
      { encoding: "utf8" },
    );
  } catch (error) {
    output = error.stdout ?? "";
  }
  const [added, removed] = output.trim().split("\t");
  return { added: Number(added) || 0, removed: Number(removed) || 0 };
}

function lineCount(text) {
  return text.split(/\r?\n/).filter((line) => line !== "").length;
}

// --- Snapshot -------------------------------------------------------------

function snapshotNoteFiles() {
  if (!existsSync(snapshotDir)) return [];
  return readdirSync(snapshotDir).filter((file) => file.endsWith(".md"));
}

function writeSnapshot(canvasText, noteNames) {
  mkdirSync(snapshotDir, { recursive: true });
  writeFileSync(snapshotCanvas, canvasText);

  for (const name of noteNames) {
    const vaultPath = join(vaultDir, `${name}.md`);
    if (!existsSync(vaultPath)) continue;
    writeFileSync(join(snapshotDir, `${name}.md`), readFileSync(vaultPath, "utf8"));
  }
  for (const file of snapshotNoteFiles()) {
    if (!noteNames.includes(file.slice(0, -3))) rmSync(join(snapshotDir, file));
  }
}

// --- Canvas diff ----------------------------------------------------------

function describeChanges(before, after) {
  const changes = [];
  const beforeNodes = byId(before.nodes);
  const afterNodes = byId(after.nodes);

  for (const [id, node] of afterNodes) {
    const old = beforeNodes.get(id);
    if (!old) {
      changes.push(`Added ${describeNode(node)}`);
      continue;
    }
    if (contentOf(old) !== contentOf(node)) {
      changes.push(`Edited ${describeNode(node)}`);
    }
    if (old.x !== node.x || old.y !== node.y) {
      changes.push(`Moved ${describeNode(node)}`);
    }
    if (old.width !== node.width || old.height !== node.height) {
      changes.push(`Resized ${describeNode(node)}`);
    }
    if (old.color !== node.color) {
      changes.push(`Recolored ${describeNode(node)}`);
    }
  }
  for (const [id, node] of beforeNodes) {
    if (!afterNodes.has(id)) changes.push(`Removed ${describeNode(node)}`);
  }

  const beforeEdges = byId(before.edges);
  const afterEdges = byId(after.edges);
  for (const [id, edge] of afterEdges) {
    if (!beforeEdges.has(id)) {
      changes.push(`Added arrow ${describeEdge(edge, afterNodes)}`);
    }
  }
  for (const [id, edge] of beforeEdges) {
    if (!afterEdges.has(id)) {
      changes.push(`Removed arrow ${describeEdge(edge, beforeNodes)}`);
    }
  }

  return changes;
}

function byId(items) {
  return new Map((items ?? []).map((item) => [item.id, item]));
}

function contentOf(node) {
  return node.text ?? node.file ?? node.url ?? node.label ?? "";
}

function describeNode(node) {
  return `${node.type} card "${labelOf(node)}"`;
}

function labelOf(node) {
  if (node.type === "text") {
    return (node.text ?? "")
      .split("\n")[0]
      .replace(/[#*_`]/g, "")
      .trim();
  }
  return node.file ?? node.url ?? node.label ?? node.id;
}

function describeEdge(edge, nodes) {
  const from = nodes.get(edge.fromNode);
  const to = nodes.get(edge.toNode);
  const fromLabel = from ? labelOf(from) : edge.fromNode;
  const toLabel = to ? labelOf(to) : edge.toNode;
  const label = edge.label ? ` labeled "${edge.label}"` : "";
  return `from "${fromLabel}" to "${toLabel}"${label}`;
}
