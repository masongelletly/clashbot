import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Options = {
  inputPath: string;
  outDir: string;
  date: string;
  caseInsensitive: boolean;
  minCount: number;
};

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const DEFAULT_INPUT_PATH = path.resolve(
  SCRIPT_DIR,
  "../../backups/search/metrics.txt"
);
const DEFAULT_OUT_DIR = path.resolve(SCRIPT_DIR, "../../backups/search");

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseArgs = (argv: string[]): Options => {
  let inputPath: string | null = null;
  let outDir: string | null = null;
  let date: string | null = null;
  let caseInsensitive = false;
  let minCount = 2;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--ci" || arg === "--case-insensitive") {
      caseInsensitive = true;
      continue;
    }
    if (arg === "--min") {
      const value = argv[i + 1];
      if (!value || Number.isNaN(Number(value))) {
        throw new Error("--min requires a numeric value");
      }
      minCount = Number(value);
      i += 1;
      continue;
    }
    if (arg === "--input") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--input requires a file path");
      }
      inputPath = value;
      i += 1;
      continue;
    }
    if (arg === "--out-dir") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--out-dir requires a directory path");
      }
      outDir = value;
      i += 1;
      continue;
    }
    if (arg === "--date") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--date requires YYYY-MM-DD");
      }
      date = value;
      i += 1;
      continue;
    }
    if (!inputPath && !arg.startsWith("-")) {
      inputPath = arg;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    inputPath: path.resolve(inputPath ?? DEFAULT_INPUT_PATH),
    outDir: path.resolve(outDir ?? DEFAULT_OUT_DIR),
    date: date ?? getLocalDateString(),
    caseInsensitive,
    minCount,
  };
};

const printHelp = () => {
  const help = `Usage: tsx src/scripts/backup-search-metrics.ts [metrics.txt] [options]

Options:
  --input <file>            Input metrics file (default: backups/search/metrics.txt)
  --out-dir <dir>           Output directory (default: backups/search)
  --date <YYYY-MM-DD>       Output date for filename (default: local date)
  --ci, --case-insensitive  Treat names/tags as case-insensitive
  --min <n>                 Minimum repeat count to show (default: 2)
  -h, --help                Show help
`;
  process.stdout.write(help);
};

const normalizeKey = (value: string, caseInsensitive: boolean) => {
  return caseInsensitive ? value.toLowerCase() : value;
};

const ensureDirectory = (dirPath: string) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const buildReport = (raw: string, caseInsensitive: boolean, minCount: number) => {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

  let tagCount = 0;
  let nameCount = 0;
  let otherCount = 0;
  let parsedCount = 0;

  const counts = new Map<string, number>();
  const canonical = new Map<string, string>();

  const lineRegex = /^\[search\]\s+\S+\s+(\S+)\s+"(.*)"\s*$/;

  for (const line of lines) {
    const match = line.match(lineRegex);
    if (!match) {
      continue;
    }
    parsedCount += 1;

    const rawType = match[1];
    const query = match[2];

    if (rawType === "tag") {
      tagCount += 1;
    } else if (rawType.startsWith("name")) {
      nameCount += 1;
    } else {
      otherCount += 1;
    }

    const key = normalizeKey(query, caseInsensitive);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!canonical.has(key)) {
      canonical.set(key, query);
    }
  }

  const ratio = nameCount === 0 ? null : tagCount / nameCount;
  const totalLines = lines.length;
  const skipped = totalLines - parsedCount;

  const repeats = Array.from(counts.entries())
    .filter(([, count]) => count >= minCount)
    .map(([key, count]) => ({
      name: canonical.get(key) ?? key,
      count,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

  return {
    totals: {
      totalLines,
      parsedSearchLines: parsedCount,
      skippedLines: skipped,
      tagSearches: tagCount,
      nameSearches: nameCount,
      otherSearches: otherCount,
    },
    ratio: ratio === null ? null : { tag: tagCount, name: nameCount, value: ratio },
    uniquePlayers: counts.size,
    repeatedSearches: repeats,
  };
};

const main = () => {
  const options = parseArgs(process.argv);

  if (!fs.existsSync(options.inputPath)) {
    throw new Error(`Input file not found: ${options.inputPath}`);
  }

  const raw = fs.readFileSync(options.inputPath, "utf8");
  const report = buildReport(raw, options.caseInsensitive, options.minCount);

  ensureDirectory(options.outDir);
  const outputPath = path.join(options.outDir, `${options.date}.json`);

  const output = {
    file: path.basename(options.inputPath),
    options: {
      caseInsensitive: options.caseInsensitive,
      minCount: options.minCount,
    },
    ...report,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  const relativeOut = path.relative(process.cwd(), outputPath);
  console.log("Wrote search metrics report to", relativeOut);
};

try {
  main();
} catch (error) {
  console.error("Failed to build search metrics report:", error);
  process.exit(1);
}
