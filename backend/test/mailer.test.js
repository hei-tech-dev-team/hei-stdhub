const chai = require("chai");
const { buildResetUrl, sendPasswordResetEmail } = require("../services/mailer");

const { expect } = chai;

describe("📧 MAILER — buildResetUrl", () => {
  const ORIGINAL_URL = process.env.CLIENT_URL;

  afterEach(() => {
    process.env.CLIENT_URL = ORIGINAL_URL;
  });

  it("builds a correct reset URL", () => {
    process.env.CLIENT_URL = "https://hei-stdhub.vercel.app";
    const url = buildResetUrl("abc123");
    expect(url).to.equal(
      "https://hei-stdhub.vercel.app/reset-password?token=abc123",
    );
  });

  it("URL-encodes special characters in the token", () => {
    process.env.CLIENT_URL = "https://example.com";
    const url = buildResetUrl("abc 123/def+ghi");
    expect(url).to.equal(
      "https://example.com/reset-password?token=abc%20123%2Fdef%2Bghi",
    );
  });

  it("strips trailing slash from CLIENT_URL", () => {
    process.env.CLIENT_URL = "https://example.com/";
    const url = buildResetUrl("tok");
    expect(url).to.equal("https://example.com/reset-password?token=tok");
  });

  it("falls back to FRONTEND_URL when CLIENT_URL is missing", () => {
    delete process.env.CLIENT_URL;
    process.env.FRONTEND_URL = "https://frontend.test";
    const url = buildResetUrl("tok");
    expect(url).to.equal("https://frontend.test/reset-password?token=tok");
  });

  it("falls back to default localhost when no URL is set", () => {
    delete process.env.CLIENT_URL;
    delete process.env.FRONTEND_URL;
    const url = buildResetUrl("tok");
    expect(url).to.equal(
      "http://localhost:5173/reset-password?token=tok",
    );
  });
});

describe("📧 MAILER — sendPasswordResetEmail validation", () => {
  it("throws when user is undefined", async () => {
    try {
      await sendPasswordResetEmail({ token: "x" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.message).to.equal("User email is required");
    }
  });

  it("throws when user.email is missing", async () => {
    try {
      await sendPasswordResetEmail({ user: { prenom: "Test" }, token: "x" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.message).to.equal("User email is required");
    }
  });

  it("throws when user.email is empty", async () => {
    try {
      await sendPasswordResetEmail({ user: { email: "" }, token: "x" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.message).to.equal("User email is required");
    }
  });

  it("throws when user.email is only whitespace", async () => {
    try {
      await sendPasswordResetEmail({ user: { email: "   " }, token: "x" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.message).to.equal("User email is required");
    }
  });
});

describe("📧 MAILER — sendPasswordResetEmail with SMTP", () => {
  const ORIGINAL_ENV = { ...process.env };
  const nodemailer = require("nodemailer");
  const originalCreateTransport = nodemailer.createTransport.bind(nodemailer);

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    process.env.SMTP_HOST = "smtp.test.local";
    process.env.SMTP_USER = "user@test.com";
    process.env.SMTP_PASS = "pass";
    process.env.CLIENT_URL = "https://test.example.com";
    nodemailer.createTransport = () => ({
      sendMail: async (opts) => {
        expect(opts.to).to.equal("smtp-test@example.com");
        expect(opts.subject).to.equal(
          "Réinitialisation de votre mot de passe HEI STDhub",
        );
        return { accepted: [opts.to] };
      },
    });
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    nodemailer.createTransport = originalCreateTransport;
  });

  it("sends email via SMTP when configured (no Resend)", async () => {
    const result = await sendPasswordResetEmail({
      user: { email: "smtp-test@example.com", prenom: "SMTP" },
      token: "smtp-token",
    });

    expect(result.skipped).to.be.false;
    expect(result.resetUrl).to.include("smtp-token");
  });
});

describe("📧 MAILER — sendPasswordResetEmail fallback", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.EMAIL_HOST;
    process.env.CLIENT_URL = "https://test.example.com";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns skipped=true when no mailing provider is configured", async () => {
    const result = await sendPasswordResetEmail({
      user: { email: "test@example.com", prenom: "Test" },
      token: "mytoken",
    });

    expect(result.skipped).to.be.true;
    expect(result.resetUrl).to.include("mytoken");
  });

  it("returns a valid resetUrl in the result", async () => {
    const result = await sendPasswordResetEmail({
      user: { email: "test@example.com" },
      token: "token123",
    });

    expect(result.resetUrl).to.equal(
      "https://test.example.com/reset-password?token=token123",
    );
  });
});

describe("📧 MAILER — sendPasswordResetEmail with Resend", () => {
  const ORIGINAL_FETCH = global.fetch;
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_testkey123";
    process.env.CLIENT_URL = "https://test.example.com";
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    process.env = { ...ORIGINAL_ENV };
  });

  it("sends email via Resend on success", async () => {
    global.fetch = async (url, options) => {
      expect(url).to.equal("https://api.resend.com/emails");
      expect(options.method).to.equal("POST");
      expect(options.headers.Authorization).to.equal("Bearer re_testkey123");

      const body = JSON.parse(options.body);
      expect(body.to).to.equal("test@example.com");
      expect(body.subject).to.equal(
        "Réinitialisation de votre mot de passe HEI STDhub",
      );
      expect(body.html).to.include("Bonjour Fatratra,");
      expect(body.text).to.include("Bonjour Fatratra,");

      return {
        ok: true,
        json: async () => ({ id: "email_12345" }),
        text: async () => "",
      };
    };

    const result = await sendPasswordResetEmail({
      user: { email: "test@example.com", prenom: "Fatratra" },
      token: "tok",
    });

    expect(result.skipped).to.be.false;
    expect(result.provider).to.equal("resend");
    expect(result.result.id).to.equal("email_12345");
  });

  it("throwS when Resend returns a non-ok status", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 403,
      text: async () =>
        JSON.stringify({
          statusCode: 403,
          message: "Forbidden",
        }),
      json: async () => ({}),
    });

    try {
      await sendPasswordResetEmail({
        user: { email: "test@example.com" },
        token: "tok",
      });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.message).to.include("Resend email failed (403)");
      expect(err.message).to.include("Forbidden");
    }
  });
});


