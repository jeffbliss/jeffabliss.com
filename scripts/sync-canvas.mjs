import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname } from "node:path";

const vaultCanvas = "C:/Obsidian/Jeff's Vault/jeffabliss.com.canvas";
const repoCanvas = "design/jeffabliss.com.canvas";

if (!existsSync(vaultCanvas)) process.exit(0);

const vaultText = readFileSync(vaultCanvas, "utf8");
const repoText = existsSync(repoCanvas)
  ? readFileSync(repoCanvas, "utf8")
  : '{"nodes":[],"edges":[]}';

const changes = describeChanges(JSON.parse(repoText), JSON.parse(vaultText));
if (changes.length === 0) process.exit(0);

mkdirSync(dirname(repoCanvas), { recursive: true });
writeFileSync(repoCanvas, vaultText);
execSync(`git add "${repoCanvas}"`);
execSync('git commit -q -m "updated obsidian canvas"');

console.log(
  "The Obsidian canvas changed and was committed to design/jeffabliss.com.canvas.",
);
console.log(
  "Tell Jeff exactly what changed, then pause and wait for him before implementing anything.",
);
console.log("");
for (const change of changes) console.log(`- ${change}`);

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
