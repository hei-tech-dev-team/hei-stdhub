/* global describe, it, beforeEach */
import { expect } from "chai";
import {
  INSTALL_DISMISSED_KEY,
  isStandaloneMode,
  isIOSSafari,
  isInstallDismissed,
  dismissInstall,
  clearInstallDismissal,
} from "./install.js";

// Minimal in-memory storage stub used to exercise dismissal helpers without
// relying on a browser-localStorage implementation in the test environment.
function createStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

describe("pwa/install helpers", () => {
  describe("isStandaloneMode", () => {
    it("returns false when no window is provided", () => {
      expect(isStandaloneMode(undefined)).to.equal(false);
    });

    it("detects standalone display mode via matchMedia", () => {
      const win = {
        matchMedia: () => ({ matches: true }),
        navigator: {},
      };
      expect(isStandaloneMode(win)).to.equal(true);
    });

    it("detects iOS home-screen mode via navigator.standalone", () => {
      const win = {
        matchMedia: () => ({ matches: false }),
        navigator: { standalone: true },
      };
      expect(isStandaloneMode(win)).to.equal(true);
    });

    it("returns false for a regular browser tab", () => {
      const win = {
        matchMedia: () => ({ matches: false }),
        navigator: { standalone: false },
      };
      expect(isStandaloneMode(win)).to.equal(false);
    });

    it("falls back safely when matchMedia throws", () => {
      const win = {
        matchMedia: () => {
          throw new Error("unsupported");
        },
        navigator: { standalone: true },
      };
      expect(isStandaloneMode(win)).to.equal(true);
    });
  });

  describe("isIOSSafari", () => {
    it("detects Safari on iPhone", () => {
      const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
      expect(isIOSSafari(ua, "iPhone", 5)).to.equal(true);
    });

    it("detects Safari on iPadOS (Macintosh UA with touch)", () => {
      const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
      expect(isIOSSafari(ua, "MacIntel", 5)).to.equal(true);
    });

    it("returns false for Chrome on iOS (CriOS)", () => {
      const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1";
      expect(isIOSSafari(ua, "iPhone", 5)).to.equal(false);
    });

    it("returns false for desktop browsers", () => {
      const ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      expect(isIOSSafari(ua, "Linux x86_64", 0)).to.equal(false);
    });
  });

  describe("dismissal persistence", () => {
    let storage;

    beforeEach(() => {
      storage = createStorage();
    });

    it("reports not dismissed by default", () => {
      expect(isInstallDismissed(storage)).to.equal(false);
    });

    it("persists and reads a dismissal", () => {
      dismissInstall(storage);
      expect(storage.getItem(INSTALL_DISMISSED_KEY)).to.equal("1");
      expect(isInstallDismissed(storage)).to.equal(true);
    });

    it("clears a dismissal", () => {
      dismissInstall(storage);
      clearInstallDismissal(storage);
      expect(isInstallDismissed(storage)).to.equal(false);
    });

    it("handles missing storage gracefully", () => {
      expect(isInstallDismissed(undefined)).to.equal(false);
      expect(() => dismissInstall(undefined)).to.not.throw();
      expect(() => clearInstallDismissal(undefined)).to.not.throw();
    });
  });
});
