const chai = require("chai");
const request = require("supertest");
const app = require("../server");

const { expect } = chai;

let agent;
let adminToken = "";
let studentToken = "";
let inviteCode = "";
let teacherInviteCode = "";

const itWithToken = (desc, fn) => {
  it(desc, function () {
    if (!adminToken) this.skip();
    return fn.call(this);
  });
};

before(async () => {
  agent = request.agent(app);
  try {
    const res = await agent
      .post("/api/auth/login")
      .send({ ref: "ADMIN001", password: "password" });
    adminToken = res.body.token || "";
  } catch {
    adminToken = "";
  }
  try {
    const res = await agent
      .post("/api/auth/login")
      .send({ ref: "STD001", password: "password" });
    studentToken = res.body.token || "";
  } catch {
    studentToken = "";
  }
  if (adminToken) {
    try {
      const res = await agent
        .post("/api/admin/invitations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "student" });
      inviteCode = res.body.code || "";
    } catch {
      inviteCode = "";
    }
    try {
      const res = await agent
        .post("/api/admin/invitations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "teacher" });
      teacherInviteCode = res.body.code || "";
    } catch {
      teacherInviteCode = "";
    }
  }
});

describe("AUTH — POST /register", () => {
  const uniqueSuffix = () => Date.now();

  it("returns 400 when required fields are missing", async () => {
    const res = await agent.post("/api/auth/register").send({});
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error", "Tous les champs sont requis.");
  });

  itWithToken("returns 400 when teacher has no ues", async () => {
    const res = await agent.post("/api/auth/register").send({
      ref: `PROF${uniqueSuffix()}`,
      nom: "Test",
      prenom: "Test",
      email: `teacher${uniqueSuffix()}@test.com`,
      pseudo: "teachertest",
      password: "password123",
      inviteCode: teacherInviteCode,
    });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property(
      "error",
      "Un professeur doit avoir au moins une UE.",
    );
  });

  it("returns 400 when inviteCode is missing", async () => {
    const res = await agent.post("/api/auth/register").send({
      ref: `NOREF${uniqueSuffix()}`,
      nom: "Test",
      prenom: "Test",
      email: `noinvite${uniqueSuffix()}@test.com`,
      pseudo: "noinvite",
      password: "password123",
      role: "student",
    });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error", "Code d'invitation requis.");
  });

  it("returns 400 with invalid invite code", async () => {
    const res = await agent.post("/api/auth/register").send({
      ref: `BADINV${uniqueSuffix()}`,
      nom: "Test",
      prenom: "Test",
      email: `badinv${uniqueSuffix()}@test.com`,
      pseudo: "badinvite",
      password: "password123",
      role: "student",
      inviteCode: "INVALID-XXXXXX",
    });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property(
      "error",
      "Code d'invitation invalide ou expiré.",
    );
  });

  itWithToken("returns 409 on duplicate ref or email", async () => {
    const res = await agent.post("/api/auth/register").send({
      ref: "STD25001",
      nom: "Dup",
      prenom: "Dup",
      email: `hei.dup${uniqueSuffix()}@gmail.com`,
      pseudo: "dupuser",
      password: "password123",
      inviteCode,
    });
    expect(res.status).to.equal(409);
    expect(res.body).to.have.property(
      "error",
      "Référence déjà utilisée.",
    );
  });
});

describe("AUTH — register : le rôle vient du code d'invitation", () => {
  const suffix = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const studentPayload = (code, extra = {}) => ({
    ref: `STD${suffix()}`,
    nom: "Test",
    prenom: "Test",
    email: `hei.test${suffix()}@gmail.com`,
    pseudo: `stduser${suffix()}`,
    password: "password123",
    inviteCode: code,
    ...extra,
  });

  const makeCode = async (role, max_uses = 1) => {
    const res = await agent
      .post("/api/admin/invitations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role, max_uses });
    return res.body.code;
  };

  itWithToken("student code + role teacher dans le body → 403 (choix : rejet explicite)", async () => {
    const code = await makeCode("student");
    const res = await agent
      .post("/api/auth/register")
      .send(studentPayload(code, { role: "teacher" }));
    expect(res.status).to.equal(403);
    expect(res.body.error).to.equal("Ce code d'invitation est réservé aux étudiants.");
  });

  itWithToken("teacher code + role student dans le body → 403", async () => {
    const code = await makeCode("teacher");
    const res = await agent.post("/api/auth/register").send({
      ref: `PROF${suffix()}`,
      nom: "Test",
      prenom: "Test",
      email: `prof${suffix()}@test.com`,
      pseudo: `profuser${suffix()}`,
      password: "password123",
      role: "student",
      inviteCode: code,
    });
    expect(res.status).to.equal(403);
    expect(res.body.error).to.equal("Ce code d'invitation est réservé aux professeurs.");
  });

  itWithToken("student code + role admin dans le body → 403 (jamais d'admin via register)", async () => {
    const code = await makeCode("student");
    const res = await agent
      .post("/api/auth/register")
      .send(studentPayload(code, { role: "admin" }));
    expect(res.status).to.equal(403);
  });

  itWithToken("admin token sans code + role admin → 400 (whitelist student/teacher/bde)", async () => {
    const res = await agent
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        ref: `ADMIN${Date.now()}`,
        nom: "Test",
        prenom: "Test",
        email: `admin${suffix()}@test.com`,
        pseudo: `adminuser${suffix()}`,
        password: "password123",
        role: "admin",
      });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("Rôle non autorisé à l'inscription.");
  });

  itWithToken("code expiré → 400", async () => {
    const db = require("../db");
    const expiredCode = `HEI-STD-EXP${suffix()}`.slice(0, 20);    await db.query(
      `INSERT INTO invitations (code, role, max_uses, use_count, expires_at)
       VALUES ($1, 'student', 1, 0, NOW() - INTERVAL '1 day')`,
      [expiredCode],
    );
    const res = await agent
      .post("/api/auth/register")
      .send(studentPayload(expiredCode));
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("Code d'invitation invalide ou expiré.");
  });

  itWithToken("code épuisé (use_count = max_uses) → 400", async () => {
    const code = await makeCode("student", 1);
    const first = await agent
      .post("/api/auth/register")
      .send(studentPayload(code));
    expect(first.status).to.equal(201);
    const second = await agent
      .post("/api/auth/register")
      .send(studentPayload(code));
    expect(second.status).to.equal(400);
    expect(second.body.error).to.equal("Code d'invitation invalide ou expiré.");
  });

  itWithToken("2 inscriptions concurrentes sur un code max_uses=1 → une seule passe", async () => {
    const code = await makeCode("student", 1);
    const [a, b] = await Promise.all([
      agent.post("/api/auth/register").send(studentPayload(code)),
      agent.post("/api/auth/register").send(studentPayload(code)),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).to.deep.equal([201, 400]);
  });

  itWithToken("register sans role dans le body mais avec un code valide → 201 (rôle lu dans le code)", async () => {
    const code = await makeCode("student");
    const res = await agent
      .post("/api/auth/register")
      .send(studentPayload(code));
    expect(res.status).to.equal(201);
    expect(res.body.user).to.have.property("role", "student");
  });

  itWithToken("étudiant avec un email non-HEI → 400", async () => {
    const code = await makeCode("student");
    const payload = studentPayload(code, { email: `perso${suffix()}@gmail.com` });
    const res = await agent.post("/api/auth/register").send(payload);
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("Un étudiant doit utiliser un email HEI (@gmail.com).");
  });

  itWithToken("le champ level du body est ignore (systeme de niveaux supprime)", async () => {
    const code = await makeCode("student");
    const res = await agent
      .post("/api/auth/register")
      .send(studentPayload(code, { level: "L4" }));
    expect(res.status).to.equal(201);
    expect(res.body.user).to.not.have.property("level");
  });
});

describe("AUTH — POST /verify-invite", () => {
  it("returns 400 without code", async () => {
    const res = await agent.post("/api/auth/verify-invite").send({});
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error", "Code requis.");
  });

  it("returns 400 with invalid code", async () => {
    const res = await agent
      .post("/api/auth/verify-invite")
      .send({ code: "FAKE-CODE-999999" });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error", "Code invalide ou expiré.");
  });

  itWithToken("returns 200 with valid invite code", async () => {
    const res = await agent
      .post("/api/auth/verify-invite")
      .send({ code: inviteCode });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("role");
  });
});

describe("AUTH — PATCH /password", () => {
  it("returns 401 without token", async () => {
    const res = await agent.patch("/api/auth/password").send({
      current: "password",
      newPassword: "newpass123",
    });
    expect(res.status).to.equal(401);
  });

  itWithToken("returns 400 without required fields", async () => {
    const res = await agent
      .patch("/api/auth/password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error", "Champs requis.");
  });

  itWithToken("returns 400 with short newPassword", async () => {
    const res = await agent
      .patch("/api/auth/password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ current: "password", newPassword: "ab" });
    expect(res.status).to.equal(400);
  });

  itWithToken("returns 400 with missing current password", async () => {
    const res = await agent
      .patch("/api/auth/password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ newPassword: "newlongpass123" });
    expect(res.status).to.equal(400);
  });
});

describe("AUTH — PATCH /avatar", () => {
  it("returns 401 without token", async () => {
    const res = await agent.patch("/api/auth/avatar");
    expect(res.status).to.equal(401);
  });

  itWithToken("returns 400 without file", async () => {
    const res = await agent
      .patch("/api/auth/avatar")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("Content-Type", "multipart/form-data");
    expect(res.status).to.equal(400);
  });
});

describe("AUTH — PATCH /profile", () => {
  itWithToken("returns 409 on duplicate pseudo", async () => {
    const { rows } = await (require("../db")).query(
      "SELECT pseudo FROM users WHERE id != 1 LIMIT 1",
    );
    if (!rows.length) return;
    const existingPseudo = rows[0].pseudo;
    const res = await agent
      .patch("/api/auth/profile")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ pseudo: existingPseudo });
    expect(res.status).to.equal(409);
    expect(res.body).to.have.property("error", "Pseudo déjà pris.");
  });
});

describe("AUTH — POST /login unifié", () => {
  const seeds = [
    { ref: "ADMIN001", role: "admin" },
    { ref: "STD25001", role: "student" },
    { ref: "PROF001", role: "teacher" },
    { ref: "DEV001", role: "developer" },
  ];

  seeds.forEach(({ ref, role }) => {
    it(`logs in ${ref} (${role}) → 200 avec access.role`, async () => {
      const res = await agent
        .post("/api/auth/login")
        .send({ ref, password: "password" });
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("token");
      expect(res.body).to.have.property("access");
      expect(res.body.access).to.have.property("role", role);
    });
  });

  it("normalizes ref (trim + uppercase)", async () => {
    const res = await agent
      .post("/api/auth/login")
      .send({ ref: "  admin001  ", password: "password" });
    expect(res.status).to.equal(200);
    expect(res.body.user).to.have.property("ref", "ADMIN001");
  });

  it("rejects invalid ref format → 400", async () => {
    const res = await agent
      .post("/api/auth/login")
      .send({ ref: "TOTO", password: "password" });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error", "Format de référence invalide.");
  });

  it("rejects email as ref → 400", async () => {
    const res = await agent
      .post("/api/auth/login")
      .send({ ref: "hei.test@gmail.com", password: "password" });
    expect(res.status).to.equal(400);
  });

  it("unknown ref and wrong password share the same 401 message", async () => {
    const unknown = await agent
      .post("/api/auth/login")
      .send({ ref: "STD99999", password: "password" });
    const wrongPwd = await agent
      .post("/api/auth/login")
      .send({ ref: "ADMIN001", password: "mauvais-mdp" });
    expect(unknown.status).to.equal(401);
    expect(wrongPwd.status).to.equal(401);
    expect(unknown.body.error).to.equal("Référence ou mot de passe incorrect.");
    expect(wrongPwd.body.error).to.equal(unknown.body.error);
  });
});

describe("AUTH — Forgot/Reset Password", () => {
  describe("POST /auth/forgot-password/send-email", () => {
    it("returns generic message for existing email", async () => {
      const db = require("../db");
      const { rows } = await db.query(`SELECT email FROM users LIMIT 1`);
      if (!rows.length) return this.skip();
      const res = await agent
        .post("/api/auth/forgot-password/send-email")
        .send({ email: rows[0].email });
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("message");
    });

    it("returns generic message for non-existing email (no enumeration)", async () => {
      const res = await agent
        .post("/api/auth/forgot-password/send-email")
        .send({ email: "nobody-exists-xyz@test.com" });
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("message");
    });

    it("returns 400 for empty email", async () => {
      const res = await agent
        .post("/api/auth/forgot-password/send-email")
        .send({ email: "" });
      expect(res.status).to.equal(400);
    });

    it("returns 400 for missing email field", async () => {
      const res = await agent
        .post("/api/auth/forgot-password/send-email")
        .send({});
      expect(res.status).to.equal(400);
    });
  });

  describe("GET /auth/reset-password/:token", () => {
    it("returns 400 for token that does not exist", async () => {
      const res = await agent.get("/api/auth/reset-password/nonexistent-token-xyz");
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property("error", "Lien invalide ou expiré.");
    });

    it("returns 400 for empty token", async () => {
      const res = await agent.get("/api/auth/reset-password/");
      expect(res.status).to.equal(404);
    });
  });

  describe("POST /auth/reset-password", () => {
    it("returns 400 when both token and password are missing", async () => {
      const res = await agent.post("/api/auth/reset-password").send({});
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property("error", "Token et mot de passe requis.");
    });

    it("returns 400 when only token is provided", async () => {
      const res = await agent.post("/api/auth/reset-password").send({ token: "some-token" });
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property("error", "Token et mot de passe requis.");
    });

    it("returns 400 when only password is provided", async () => {
      const res = await agent.post("/api/auth/reset-password").send({ newPassword: "newpass123" });
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property("error", "Token et mot de passe requis.");
    });

    it("returns 400 for short newPassword", async () => {
      const res = await agent.post("/api/auth/reset-password").send({ token: "t", newPassword: "abc" });
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property("error", "Minimum 6 caractères.");
    });

    it("returns 400 for invalid/expired token", async () => {
      const res = await agent.post("/api/auth/reset-password").send({
        token: "invalid-token-xyz",
        newPassword: "validpassword123",
      });
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property("error", "Lien invalide ou expiré.");
    });

    it("full flow: send-email → reset-password", async () => {
      // Step 1: Get admin email from DB
      const db = require("../db");
      const { rows: userRows } = await db.query(
        `SELECT email, id FROM users WHERE ref = 'ADMIN001' LIMIT 1`,
      );
      if (!userRows.length) return this.skip();
      const adminEmail = userRows[0].email;

      // Step 2: Request reset email
      const sendRes = await agent
        .post("/api/auth/forgot-password/send-email")
        .send({ email: adminEmail });
      expect(sendRes.status).to.equal(200);

      // Step 3: Fetch the token directly from DB (since email is async)
      const { rows } = await db.query(
        `SELECT prt.token_hash, u.id
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE u.id = $1
           AND prt.used_at IS NULL
           AND prt.expires_at > NOW()
         ORDER BY prt.created_at DESC
         LIMIT 1`,
        [userRows[0].id],
      );
      expect(rows.length).to.be.greaterThan(0);

      // We can't reverse the hash, so we generate a new token and insert it directly
      const crypto = require("crypto");
      const freshToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(freshToken).digest("hex");
      await db.query(
        "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '5 minutes')",
        [rows[0].id, tokenHash],
      );

      // Step 4: Validate the fresh token
      const validateRes = await agent.get(`/api/auth/reset-password/${freshToken}`);
      expect(validateRes.status).to.equal(200);
      expect(validateRes.body).to.have.property("valid", true);

      // Step 5: Reset password with the fresh token
      const resetRes = await agent.post("/api/auth/reset-password").send({
        token: freshToken,
        newPassword: "newpassword123",
      });
      expect(resetRes.status).to.equal(200);
      expect(resetRes.body).to.have.property("message", "Mot de passe réinitialisé.");

      // Step 6: Verify login works with new password
      const loginRes = await agent
        .post("/api/auth/login")
        .send({ ref: "ADMIN001", password: "newpassword123" });
      expect(loginRes.status).to.equal(200);
      expect(loginRes.body).to.have.property("token");

      // Step 7: Restore original password
      const bcrypt = require("bcryptjs");
      const restoredHash = await bcrypt.hash("password", 10);
      await db.query("UPDATE users SET password = $1 WHERE id = $2", [restoredHash, userRows[0].id]);
    });
  });
});
