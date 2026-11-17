/* global describe, it */
import { expect } from "chai";
import { resolveSameOriginNotificationUrl } from "./notification-url.js";

const ORIGIN = "https://hei-stdhub.vercel.app";

describe("resolveSameOriginNotificationUrl", () => {
  it("keeps relative paths on the app origin", () => {
    expect(resolveSameOriginNotificationUrl("/chat", ORIGIN)).to.equal(
      "https://hei-stdhub.vercel.app/chat",
    );
  });

  it("keeps absolute same-origin URLs", () => {
    expect(
      resolveSameOriginNotificationUrl("https://hei-stdhub.vercel.app/archives?ue=WEB1", ORIGIN),
    ).to.equal("https://hei-stdhub.vercel.app/archives?ue=WEB1");
  });

  it("falls back to root for cross-origin URLs", () => {
    expect(resolveSameOriginNotificationUrl("https://evil.example/phish", ORIGIN)).to.equal("/");
  });

  it("falls back to root for protocol-relative URLs", () => {
    expect(resolveSameOriginNotificationUrl("//evil.example/phish", ORIGIN)).to.equal("/");
  });

  it("falls back to root for non-HTTP schemes", () => {
    expect(resolveSameOriginNotificationUrl("javascript:alert(1)", ORIGIN)).to.equal("/");
  });

  it("falls back to root for malformed input", () => {
    expect(resolveSameOriginNotificationUrl("http://[", ORIGIN)).to.equal("/");
  });

  it("uses the app root for an empty payload URL", () => {
    expect(resolveSameOriginNotificationUrl("", ORIGIN)).to.equal(
      "https://hei-stdhub.vercel.app/",
    );
  });

  it("returns root when no origin is provided", () => {
    expect(resolveSameOriginNotificationUrl("/chat", "")).to.equal("/");
  });
});
