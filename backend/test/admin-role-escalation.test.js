const chai = require("chai");
const request = require("supertest");
const app = require("../server");

const { expect } = chai;

const login = async (ref) => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ ref, password: "password" });
  return res.body.token || "";
};

const patchRole = (token, id, role) =>
  request(app)
    .patch(`/api/admin/users/${id}/role`)
    .set("Authorization", `Bearer ${token}`)
    .send({ role });

describe("ADMIN — developer role can only be managed by a developer", () => {
  let adminToken;
  let devToken;

  before(async () => {
    [adminToken, devToken] = await Promise.all([
      login("ADMIN001"),
      login("DEV001"),
    ]);
  });

  it("forbids an admin from promoting themselves to developer", async () => {
    const res = await patchRole(adminToken, 1, "developer");
    expect(res.status).to.equal(403);
  });

  it("forbids an admin from promoting another user to developer", async () => {
    const res = await patchRole(adminToken, 2, "developer");
    expect(res.status).to.equal(403);
  });

  it("forbids an admin from changing an existing developer", async () => {
    const res = await patchRole(adminToken, 4, "student");
    expect(res.status).to.equal(403);
  });

  it("still lets an admin manage non-developer roles", async () => {
    const res = await patchRole(adminToken, 2, "bde");
    expect(res.status).to.equal(200);
    expect(res.body.role).to.equal("bde");

    const back = await patchRole(adminToken, 2, "student");
    expect(back.status).to.equal(200);
    expect(back.body.role).to.equal("student");
  });

  it("still lets a developer manage roles", async () => {
    const res = await patchRole(devToken, 2, "bde");
    expect(res.status).to.equal(200);
    expect(res.body.role).to.equal("bde");

    const back = await patchRole(devToken, 2, "student");
    expect(back.status).to.equal(200);
    expect(back.body.role).to.equal("student");
  });

  it("still forbids a developer from changing their own role", async () => {
    const res = await patchRole(devToken, 4, "student");
    expect(res.status).to.equal(403);
  });

  it("returns 404 for an unknown user", async () => {
    const res = await patchRole(adminToken, 999999, "student");
    expect(res.status).to.equal(404);
  });
});
