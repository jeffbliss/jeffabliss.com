import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";

const vaultDir = process.argv[2] ?? "C:/Obsidian/Jeff's Vault";
const vaultCanvas = join(vaultDir, "jeffabliss.com.canvas");
const repoCanvas = "design/jeffabliss.com.canvas";

const statusColors = {
  idea: "3",
  planning: "2",
  decided: "5",
  built: "4",
  bug: "1",
};

if (!existsSync(vaultCanvas)) process.exit(0);

const canvas = JSON.parse(readFileSync(vaultCanvas, "utf8"));
const warnings = updateSiteMapCards(canvas);
const vaultText = formatCanvas(canvas);
if (vaultText !== readFileSync(vaultCanvas, "utf8")) {
  writeFileSync(vaultCanvas, vaultText);
}

const repoText = existsSync(repoCanvas)
  ? readFileSync(repoCanvas, "utf8")
  : '{"nodes":[],"edges":[]}';
const changes = describeChanges(JSON.parse(repoText), canvas);

if (changes.length > 0) {
  mkdirSync(dirname(repoCanvas), { recursive: true });
  writeFileSync(repoCanvas, vaultText);
  execSync(`git add "${repoCanvas}"`);
  execSync('git commit -q -m "updated obsidian canvas"');
}

if (changes.length === 0 && warnings.length === 0) process.exit(0);

if (changes.length > 0) {
  console.log(
    "The Obsidian canvas changed and was committed to design/jeffabliss.com.canvas.",
  );
  console.log(
    "Tell Jeff exactly what changed, then pause and wait for him before implementing anything.",
  );
  console.log("");
  for (const change of changes) console.log(`- ${change}`);
}
if (warnings.length > 0) {
  console.log("");
  console.log("Canvas warnings to pass on to Jeff:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

function updateSiteMapCards(canvas) {
  const warnings = [];
  const nodes = byId(canvas.nodes);

  for (const edge of canvas.edges ?? []) {
    if (edge.label !== "content") continue;
    const card = nodes.get(edge.fromNode);
    const noteCard = nodes.get(edge.toNode);
    if (card?.type !== "text" || noteCard?.type !== "file") continue;

    const notePath = join(vaultDir, noteCard.file);
    if (!existsSync(notePath)) {
      warnings.push(`Note not found: ${noteCard.file}`);
      continue;
    }
    const note = readFileSync(notePath, "utf8");
    const frontmatter = parseFrontmatter(note);
    const name = firstHeading(note) ?? labelOf(card);
    const url = frontmatter.url ?? "";
    const status = frontmatter.status ?? "";

    if (!(status in statusColors)) {
      warnings.push(
        `${noteCard.file} has status "${status}". Allowed: ${Object.keys(statusColors).join(", ")}. Card left unchanged.`,
      );
      continue;
    }

    card.text = `**${name}**\n${url}\nstatus: ${status}`;
    card.color = statusColors[status];
  }

  return warnings;
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
  const match = note.match(/^# (.+)$/m);
  return match ? match[1].trim() : null;
}

function formatCanvas(canvas) {
  const list = (items) =>
    (items ?? []).map((item) => `\t\t${JSON.stringify(item)}`).join(",\n");
  return `{\n\t"nodes":[\n${list(canvas.nodes)}\n\t],\n\t"edges":[\n${list(canvas.edges)}\n\t]\n}`;
}

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
