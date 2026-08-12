import fs from "node:fs";
import path from "node:path";

const recordsDir = path.resolve("src/data/records");
const indexPath = path.resolve("src/data/index.json");
const generatedPath = path.resolve("src/data/records.generated.json");

const files = fs
  .readdirSync(recordsDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

const systems = [];
const records = {};

for (const file of files) {
  const fullPath = path.join(recordsDir, file);
  const raw = fs.readFileSync(fullPath, "utf8");
  const data = JSON.parse(raw);

  if (!data.id || !data.name) {
    throw new Error(`Missing id or name in ${file}`);
  }

  systems.push({
    id: data.id,
    name: data.name,
    system_type: data.system_type,
    scoring_mode: data.scoring_mode
  });

  records[data.id] = data;
}

systems.sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(indexPath, JSON.stringify({ systems }, null, 2) + "\n");
fs.writeFileSync(generatedPath, JSON.stringify(records, null, 2) + "\n");

console.log(`✅ index.json rebuilt with ${systems.length} systems`);
console.log(`✅ records.generated.json rebuilt with ${Object.keys(records).length} records`);