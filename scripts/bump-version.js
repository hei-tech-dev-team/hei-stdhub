const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const packages = [
  { path: path.join(ROOT, "backend", "package.json"), name: "backend" },
  { path: path.join(ROOT, "frontend", "package.json"), name: "frontend" },
];

function bump(type) {
  const valid = ["major", "minor", "patch"];
  if (!valid.includes(type)) {
    console.error(`Usage: node scripts/bump-version.js <${valid.join("|")}>`);
    process.exit(1);
  }

  const versions = packages.map((pkg) => {
    const raw = fs.readFileSync(pkg.path, "utf8");
    const json = JSON.parse(raw);
    return { ...pkg, json, raw };
  });

  const [front, back] = versions;
  const current = front.json.version;
  const parts = current.split(".").map(Number);

  if (type === "major") {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === "minor") {
    parts[1] += 1;
    parts[2] = 0;
  } else if (type === "patch") {
    parts[2] += 1;
  }

  const next = parts.join(".");

  versions.forEach(({ path: p, json, raw }) => {
    json.version = next;
    fs.writeFileSync(p, JSON.stringify(raw ? JSON.parse(raw) : json, null, 2) + "\n");
    // write properly
    const obj = JSON.parse(fs.readFileSync(p, "utf8"));
    obj.version = next;
    fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
  });

  console.log(`${current} → ${next} (${type})`);
}

bump(process.argv[2]);
