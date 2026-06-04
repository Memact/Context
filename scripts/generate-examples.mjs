import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeReadingActivity, generateWikiEntries } from "../src/categories/news-articles.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rawPath = join(__dirname, "../examples/news-articles/raw-app-activity.json");
const normPath = join(__dirname, "../examples/news-articles/normalized-context.json");
const wikiPath = join(__dirname, "../examples/news-articles/wiki-entries.json");

async function main() {
  const rawData = JSON.parse(await readFile(rawPath, "utf8"));
  
  // Normalize
  const normalized = normalizeReadingActivity(rawData);
  await writeFile(normPath, JSON.stringify(normalized, null, 2), "utf8");
  console.log(`Generated: ${normPath}`);

  // Wiki entries
  const wikiEntries = generateWikiEntries(normalized);
  await writeFile(wikiPath, JSON.stringify(wikiEntries, null, 2), "utf8");
  console.log(`Generated: ${wikiPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
