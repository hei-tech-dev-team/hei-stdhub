#!/usr/bin/env node
"use strict";

/**
 * Secret rotation helper for the credentials exposed by issue #127 / audit C-02.
 *
 *   node scripts/rotate-secrets.js                  # print a new JWT + VAPID pair
 *   node scripts/rotate-secrets.js --write-env .env # update an ignored local env file
 *   node scripts/rotate-secrets.js --check .env     # fail if a known leaked value remains
 *
 * Production values must be stored in Render's environment (and in the GitHub
 * `Production` environment for CI), never in a tracked file.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const BACKEND_MODULES = path.join(ROOT, "backend", "node_modules");

function loadBackendModule(name) {
  try {
    return require(path.join(BACKEND_MODULES, name));
  } catch {
    console.error(`Missing backend dependency "${name}". Run: npm ci --prefix backend`);
    process.exit(1);
  }
}

const { findLeakedSecrets } = require("../backend/services/leakedSecrets");

/** Minimal dotenv parser so --check works without installing backend deps. */
function parseEnvFile(content) {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if (value.startsWith('"')) {
      const end = value.indexOf('"', 1);
      if (end !== -1) value = value.slice(1, end);
    } else if (value.startsWith("'")) {
      const end = value.indexOf("'", 1);
      if (end !== -1) value = value.slice(1, end);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    values[match[1]] = value;
  }
  return values;
}

function usage() {
  console.log(`Usage:
  node scripts/rotate-secrets.js                  Print new JWT_SECRET + VAPID keys
  node scripts/rotate-secrets.js --write-env FILE Update an ignored local env file
  node scripts/rotate-secrets.js --check FILE     Check a file against leaked fingerprints

The printed values are secrets. Store them only in the hosting provider and in
GitHub Environments, never in a tracked file, issue, PR or chat message.
See docs/SECRET_ROTATION.md.`);
}

function generateSecrets() {
  const webpush = loadBackendModule("web-push");
  const vapid = webpush.generateVAPIDKeys();
  return {
    JWT_SECRET: crypto.randomBytes(32).toString("hex"),
    VAPID_PUBLIC_KEY: vapid.publicKey,
    VAPID_PRIVATE_KEY: vapid.privateKey,
  };
}

function printSecrets(secrets) {
  console.log("# Generated replacement secrets. Do not commit or paste them in chat.");
  console.log("# Set them in Render → Environment before deploying the backend.");
  console.log("# Store the same values in GitHub → Settings → Environments → Production.");
  console.log(`# Generated: ${new Date().toISOString()}`);
  for (const [key, value] of Object.entries(secrets)) {
    console.log(`${key}=${value}`);
  }
}

function resolveEnvFile(file) {
  const absolute = path.resolve(process.cwd(), file);
  if (!fs.existsSync(absolute)) {
    console.error(`Env file not found: ${absolute}`);
    process.exit(1);
  }
  return absolute;
}

function assertWritableEnvFile(absolute) {
  const relative = path.relative(ROOT, absolute);
  if (relative.startsWith("..")) {
    console.error(`Refusing to touch a file outside the repository: ${absolute}`);
    process.exit(1);
  }

  const tracked = spawnSync("git", ["ls-files", "--error-unmatch", relative], { cwd: ROOT });
  if (tracked.status === 0) {
    console.error(
      `Refusing to write secrets to tracked file "${relative}". ` +
        "Only ignored local env files are allowed.",
    );
    process.exit(1);
  }

  const ignored = spawnSync("git", ["check-ignore", "-q", relative], { cwd: ROOT });
  if (ignored.status !== 0) {
    console.error(
      `Refusing to write secrets to "${relative}": it is not ignored by git. ` +
        "Add it to .gitignore first.",
    );
    process.exit(1);
  }
}

function setEnvValue(content, key, value) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const line = new RegExp(`^#?\\s*${escaped}=.*$`, "m");
  if (line.test(content)) return content.replace(line, `${key}=${value}`);
  return `${content.replace(/\s*$/, "")}\n${key}=${value}\n`;
}

function writeEnvFile(file) {
  const absolute = resolveEnvFile(file);
  assertWritableEnvFile(absolute);
  const secrets = generateSecrets();
  let content = fs.readFileSync(absolute, "utf8");

  for (const [key, value] of Object.entries(secrets)) {
    content = setEnvValue(content, key, value);
  }

  fs.writeFileSync(absolute, content, { mode: 0o600 });
  fs.chmodSync(absolute, 0o600);

  console.log(`Updated ${path.relative(ROOT, absolute)} (mode 600).`);
  console.log(`Rotated: ${Object.keys(secrets).join(", ")}.`);
  console.log("No secret value was printed. Set the same values in the production host.");
}

function checkEnvFile(file) {
  const absolute = resolveEnvFile(file);
  const parsed = parseEnvFile(fs.readFileSync(absolute, "utf8"));
  const leaked = findLeakedSecrets(parsed);

  if (leaked.length === 0) {
    console.log(`No known leaked value found in ${path.relative(ROOT, absolute)}.`);
    return 0;
  }

  console.error(
    `Leaked value(s) still configured in ${path.relative(ROOT, absolute)}: ${leaked.join(", ")}`,
  );
  console.error("Rotate them before deploying. See docs/SECRET_ROTATION.md.");
  return 1;
}

function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    usage();
    return 0;
  }

  const writeIndex = argv.indexOf("--write-env");
  if (writeIndex !== -1) {
    const file = argv[writeIndex + 1];
    if (!file) {
      console.error("--write-env requires a file path (for example: --write-env .env)");
      return 1;
    }
    writeEnvFile(file);
    return 0;
  }

  const checkIndex = argv.indexOf("--check");
  if (checkIndex !== -1) {
    return checkEnvFile(argv[checkIndex + 1] || ".env");
  }

  if (argv.length > 0) {
    console.error(`Unknown argument(s): ${argv.join(" ")}\n`);
    usage();
    return 1;
  }

  printSecrets(generateSecrets());
  return 0;
}

process.exitCode = main(process.argv.slice(2));
