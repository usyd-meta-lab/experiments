import { promises as fs } from "fs";
import { glob } from "glob";
import YAML from "yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

async function main() {
  const schema = JSON.parse(await fs.readFile("scripts/schema.json", "utf8"));
  const validate = ajv.compile(schema);

  const files = await glob("experiments/**/metadata.yml");
  const records = [];
  const errors = [];

  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const data = YAML.parse(raw);
    const ok = validate(data);
    if (!ok) {
      errors.push({ file, errors: validate.errors });
    } else {
      // infer some nice defaults
      const base = file.replace(/\/metadata\.yml$/, "/");
      records.push({
        ...data,
        paths: {
          root: base,
          metadata: file
        }
      });
    }
  }

  if (errors.length) {
    console.error("Metadata validation failed:", JSON.stringify(errors, null, 2));
    process.exit(1);
  }

  // Sort newest first
  records.sort((a, b) => (b.date_created || "").localeCompare(a.date_created || ""));

  await fs.mkdir("public", { recursive: true });
  await fs.writeFile("public/experiments.json", JSON.stringify(records, null, 2));
  console.log(`Wrote public/experiments.json with ${records.length} records.`);
}

main().catch(e => { console.error(e); process.exit(1); });