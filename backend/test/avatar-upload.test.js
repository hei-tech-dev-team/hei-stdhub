const chai = require("chai");
const request = require("supertest");
const app = require("../server");

const { expect } = chai;

// Minimal valid 1x1 PNG.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

describe("AUTH — PATCH /avatar only accepts images", () => {
  let token;

  before(async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ ref: "STD25001", password: "password" });
    token = res.body.token;
  });

  const upload = (buffer, filename, contentType) =>
    request(app)
      .patch("/api/auth/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("avatar", buffer, { filename, contentType });

  it("rejects an HTML file (stored XSS)", async () => {
    const res = await upload(Buffer.from("<script>alert(1)</script>"), "avatar.html", "text/html");
    expect(res.status).to.equal(400);
  });

  it("rejects an SVG file", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const res = await upload(Buffer.from(svg), "avatar.svg", "image/svg+xml");
    expect(res.status).to.equal(400);
  });

  it("accepts a PNG and stores it with a server-chosen extension", async () => {
    const res = await upload(PNG_1X1, "avatar.html", "image/png");
    expect(res.status).to.equal(200);
    expect(res.body.avatar).to.match(/\/uploads\/avatars\/[0-9a-f]{32}\.png$/);
  });

  it("serves uploads with nosniff and a sandbox CSP", async () => {
    const up = await upload(PNG_1X1, "a.png", "image/png");
    const path = new URL(up.body.avatar).pathname;
    const res = await request(app).get(path);
    expect(res.status).to.equal(200);
    expect(res.headers["x-content-type-options"]).to.equal("nosniff");
    expect(res.headers["content-security-policy"]).to.include("sandbox");
  });
});
