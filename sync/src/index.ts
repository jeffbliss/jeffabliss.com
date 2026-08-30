import { mkdir, writeFile } from "node:fs/promises";
import { authenticate } from "./auth.js";
import { fetchAllTitles, fetchGameTrophies } from "./fetch.js";
import { buildGameFile, dedupeSlugs, serializeGame, serializeSummary } from "./serialize.js";
import { buildSummary } from "./summary.js";
import type { GameFile } from "./types.js";

const OUT_DIR = new URL("../../site/data/psn/", import.meta.url);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const npsso = process.env.NPSSO;
  if (!npsso) throw new Error("NPSSO environment variable is not set");

  const auth = await authenticate(npsso);
  const titles = await fetchAllTitles(auth);
  console.log(`Fetched ${titles.length} titles`);

  const games: GameFile[] = [];
  for (const title of titles) {
    const trophies = await fetchGameTrophies(auth, title);
    games.push(buildGameFile(title, trophies));
    await sleep(300);
  }

  const deduped = dedupeSlugs(games);
  await mkdir(OUT_DIR, { recursive: true });
  for (const game of deduped) {
    await writeFile(new URL(`${game.gameId}.json`, OUT_DIR), serializeGame(game));
  }
  await writeFile(new URL("summary.json", OUT_DIR), serializeSummary(buildSummary(deduped)));
  console.log(`Wrote ${deduped.length} game files and summary.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
