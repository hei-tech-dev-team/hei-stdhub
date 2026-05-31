const http = require("http");
const https = require("https");
const { EventEmitter } = require("events");
const chai = require("chai");

const { expect } = chai;
const { buildResetUrl, sendPasswordResetEmail } = require("../services/mailer");

const originalEnv = { ...process.env };
const originalHttpsRequest = https.request;

const listen = (server) =>
  new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const close = (server) =>
  new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

describe("mailer service", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    https.request = originalHttpsRequest;
  });

  it("builds reset links from CLIENT_URL", () => {
    process.env.CLIENT_URL = "https://hei-stdhub.vercel.app/";

    expect(buildResetUrl("a token+with spaces")).to.equal(
      "https://hei-stdhub.vercel.app/reset-password?token=a%20token%2Bwith%20spaces",
    );
  });

  it("sends through Flask-Mail when the microservice is available", async () => {
    let payload;
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        payload = JSON.parse(body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      });
    });

    await listen(server);
    process.env.FLASKMAIL_URL = `http://127.0.0.1:${server.address().port}`;
    process.env.CLIENT_URL = "https://app.example.com";

    try {
      const result = await sendPasswordResetEmail({
        user: { email: "student@example.com", prenom: "Ada" },
        token: "reset-token",
      });

      expect(result.provider).to.equal("flaskmail");
      expect(result.skipped).to.equal(false);
      expect(payload).to.deep.equal({
        email: "student@example.com",
        token: "reset-token",
        prenom: "Ada",
      });
    } finally {
      await close(server);
    }
  });

  it("falls back to Resend when Flask-Mail fails and RESEND_API_KEY is set", async () => {
    const flaskServer = http.createServer((req, res) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "smtp unavailable" }));
    });
    await listen(flaskServer);

    let resendOptions;
    let resendPayload = "";
    https.request = (options, callback) => {
      resendOptions = options;
      const req = new EventEmitter();
      req.write = (chunk) => {
        resendPayload += chunk;
      };
      req.end = () => {
        process.nextTick(() => {
          const res = new EventEmitter();
          res.statusCode = 201;
          callback(res);
          res.emit("data", JSON.stringify({ id: "email_123" }));
          res.emit("end");
        });
      };
      req.destroy = () => {};
      return req;
    };

    process.env.FLASKMAIL_URL = `http://127.0.0.1:${flaskServer.address().port}`;
    process.env.CLIENT_URL = "https://app.example.com";
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM = "HEI STDhub <reset@example.com>";

    try {
      const result = await sendPasswordResetEmail({
        user: { email: "student@example.com", prenom: "Ada" },
        token: "reset-token",
      });
      const parsedPayload = JSON.parse(resendPayload);

      expect(result.provider).to.equal("resend");
      expect(result.skipped).to.equal(false);
      expect(resendOptions.hostname).to.equal("api.resend.com");
      expect(resendOptions.headers.Authorization).to.equal("Bearer re_test");
      expect(parsedPayload.from).to.equal("HEI STDhub <reset@example.com>");
      expect(parsedPayload.to).to.deep.equal(["student@example.com"]);
      expect(parsedPayload.html).to.include(
        "https://app.example.com/reset-password?token=reset-token",
      );
    } finally {
      await close(flaskServer);
    }
  });
});
