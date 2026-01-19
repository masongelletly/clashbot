import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { once } from "node:events";
import { createGzip } from "node:zlib";
import { closeDatabase, connectToDatabase } from "../db/mongodb.js";

const envPath = fileURLToPath(new URL("../../.env", import.meta.url));
dotenv.config({ path: envPath });

const buildDefaultOutputPath = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.resolve(
    fileURLToPath(new URL(".", import.meta.url)),
    `../../backups/db-backup-${timestamp}.jsonl.gz`
  );
};

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : buildDefaultOutputPath();

const ensureDirectory = (filePath: string) => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
};

async function main() {
  ensureDirectory(outputPath);

  const db = await connectToDatabase();
  const collections = await db.listCollections().toArray();

  const gzip = createGzip({ level: 9 });
  const output = fs.createWriteStream(outputPath);
  gzip.pipe(output);

  const writeLine = (value: unknown) => {
    gzip.write(`${JSON.stringify(value)}\n`);
  };

  let totalDocs = 0;

  try {
    writeLine({
      _meta: {
        generatedAt: new Date().toISOString(),
        database: db.databaseName,
        collectionCount: collections.length,
      },
    });

    for (const { name } of collections) {
      const collection = db.collection(name);
      const cursor = collection.find({});
      for await (const doc of cursor) {
        totalDocs += 1;
        writeLine({ collection: name, doc });
      }
    }
  } finally {
    gzip.end();
    await once(output, "finish");
    await closeDatabase();
  }

  console.log("Backup complete.");
  console.log("Output:", outputPath);
  console.log("Collections:", collections.length);
  console.log("Documents:", totalDocs);
}

main().catch((error) => {
  console.error("Failed to back up database:", error);
  process.exit(1);
});
