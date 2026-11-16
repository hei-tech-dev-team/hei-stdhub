const chai = require("chai");
const crypto = require("crypto");
const {
  extractDatabasePassword,
  findLeakedSecrets,
  sha256,
} = require("../services/leakedSecrets");

const { expect } = chai;

describe("SECURITY — leaked secret fingerprints (#127)", () => {
  it("ignores fresh secrets", () => {
    const fresh = {
      JWT_SECRET: crypto.randomBytes(32).toString("hex"),
      VAPID_PRIVATE_KEY: crypto.randomBytes(32).toString("base64url"),
      CLOUDINARY_API_SECRET: crypto.randomBytes(24).toString("hex"),
      SMTP_PASS: crypto.randomBytes(16).toString("hex"),
      RESEND_API_KEY: `re_${crypto.randomBytes(24).toString("hex")}`,
      DATABASE_URL: `postgresql://user:${crypto.randomBytes(18).toString("hex")}@db.example.com/hei`,
    };

    expect(findLeakedSecrets(fresh)).to.deep.equal([]);
  });

  it("detects a value matching a known fingerprint", () => {
    const value = "old-jwt-secret";
    const fingerprints = { JWT_SECRET: [sha256(value)] };

    expect(findLeakedSecrets({ JWT_SECRET: value }, fingerprints)).to.deep.equal(["JWT_SECRET"]);
  });

  it("detects a leaked database password inside DATABASE_URL", () => {
    const password = "old-db-password";
    const fingerprints = { DATABASE_PASSWORD: [sha256(password)] };
    const env = {
      DATABASE_URL: `postgresql://hei:${password}@db.example.com:5432/hei_stdhub`,
    };

    expect(findLeakedSecrets(env, fingerprints)).to.deep.equal(["DATABASE_PASSWORD"]);
  });

  it("decodes percent-encoded database passwords", () => {
    expect(extractDatabasePassword("postgresql://hei:p%40ss%3Aword@db.example.com/hei")).to.equal(
      "p@ss:word",
    );
    expect(extractDatabasePassword("postgresql://hei@/hei_stdhub?host=/var/run/postgresql")).to.equal(
      "",
    );
  });

  it("checks PGPASSWORD as well as DATABASE_URL", () => {
    const password = "old-db-password";
    const fingerprints = { PGPASSWORD: [sha256(password)] };

    expect(findLeakedSecrets({ PGPASSWORD: password }, fingerprints)).to.deep.equal(["PGPASSWORD"]);
  });
});
