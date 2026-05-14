/* global describe, it */
import { expect } from "chai";

function getUnreadCount(contact, unread) {
  if (contact.isGlobal) return unread?.global || 0;
  const c = unread?.contacts?.[contact.id];
  return c?.unread || 0;
}

function shouldShowBadge(contact, unread) {
  return getUnreadCount(contact, unread) > 0;
}

const globalContact = { id: "global", name: "Chat global", isGlobal: true };
const alice = { id: 1, name: "Alice" };
const bob = { id: 2, name: "Bob" };

describe("ContactList — unread badge", () => {
  describe("getUnreadCount", () => {
    it("returns 0 when unread is null", () => {
      expect(getUnreadCount(alice, null)).to.equal(0);
    });

    it("returns 0 when contact has no unread entry", () => {
      const unread = { contacts: {} };
      expect(getUnreadCount(alice, unread)).to.equal(0);
    });

    it("returns unread count for a contact with messages to read", () => {
      const unread = { contacts: { 1: { unread: 5, pending: 0 } } };
      expect(getUnreadCount(alice, unread)).to.equal(5);
    });

    it("does NOT include pending count in the return value", () => {
      const unread = { contacts: { 1: { unread: 0, pending: 3 } } };
      expect(getUnreadCount(alice, unread)).to.equal(0);
    });

    it("only returns unread even when both unread and pending exist", () => {
      const unread = { contacts: { 1: { unread: 2, pending: 7 } } };
      expect(getUnreadCount(alice, unread)).to.equal(2);
    });

    it("returns global unread count for global chat", () => {
      const unread = { global: 3, contacts: {} };
      expect(getUnreadCount(globalContact, unread)).to.equal(3);
    });

    it("returns 0 for global chat when no unread", () => {
      const unread = { global: 0, contacts: {} };
      expect(getUnreadCount(globalContact, unread)).to.equal(0);
    });
  });

  describe("shouldShowBadge", () => {
    it("shows badge when unread > 0", () => {
      const unread = { contacts: { 1: { unread: 1, pending: 0 } } };
      expect(shouldShowBadge(alice, unread)).to.be.true;
    });

    it("does NOT show badge when only pending > 0 (no unread)", () => {
      const unread = { contacts: { 1: { unread: 0, pending: 5 } } };
      expect(shouldShowBadge(alice, unread)).to.be.false;
    });

    it("does NOT show badge when unread is 0 and pending is 0", () => {
      const unread = { contacts: { 1: { unread: 0, pending: 0 } } };
      expect(shouldShowBadge(alice, unread)).to.be.false;
    });

    it("does NOT show badge when contact has no entry", () => {
      const unread = { contacts: {} };
      expect(shouldShowBadge(bob, unread)).to.be.false;
    });

    it("shows badge for global chat when unread > 0", () => {
      const unread = { global: 2, contacts: {} };
      expect(shouldShowBadge(globalContact, unread)).to.be.true;
    });

    it("does NOT show badge for global chat when unread is 0", () => {
      const unread = { global: 0, contacts: {} };
      expect(shouldShowBadge(globalContact, unread)).to.be.false;
    });

    it("shows badge when unread is large and pending is also present", () => {
      const unread = { contacts: { 2: { unread: 10, pending: 99 } } };
      expect(shouldShowBadge(bob, unread)).to.be.true;
    });
  });
});
