import { expect } from "chai";
import {
  isSameDay,
  getDayDiff,
  formatTime,
  formatDateLabel,
  formatMessageTime,
  formatTooltipDate,
  isFileMessage,
  parseFileContent,
  shouldGroup,
  GROUP_GAP,
  DAY,
} from "./chat-utils.js";

// ── isSameDay ──
describe("isSameDay", () => {
  it("returns true for identical dates", () => {
    const a = new Date(2025, 5, 15, 10, 0);
    const b = new Date(2025, 5, 15, 23, 59);
    expect(isSameDay(a, b)).to.be.true;
  });

  it("returns false for different days", () => {
    const a = new Date(2025, 5, 15);
    const b = new Date(2025, 5, 16);
    expect(isSameDay(a, b)).to.be.false;
  });

  it("returns false for different months", () => {
    const a = new Date(2025, 5, 15);
    const b = new Date(2025, 6, 15);
    expect(isSameDay(a, b)).to.be.false;
  });

  it("returns false for different years", () => {
    const a = new Date(2025, 5, 15);
    const b = new Date(2026, 5, 15);
    expect(isSameDay(a, b)).to.be.false;
  });
});

// ── getDayDiff ──
describe("getDayDiff", () => {
  it("returns 0 for the same day", () => {
    const now = new Date();
    expect(getDayDiff(now, now)).to.equal(0);
  });

  it("returns 1 for yesterday", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    expect(getDayDiff(today, yesterday)).to.equal(1);
  });

  it("returns -1 for tomorrow", () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(getDayDiff(today, tomorrow)).to.equal(-1);
  });
});

// ── formatTime ──
describe("formatTime", () => {
  it("formats time as HH:MM in French locale", () => {
    const d = new Date(2025, 0, 1, 14, 5, 0);
    expect(formatTime(d)).to.equal("14:05");
  });

  it("pads single digits", () => {
    const d = new Date(2025, 0, 1, 9, 3, 0);
    expect(formatTime(d)).to.equal("09:03");
  });
});

// ── formatDateLabel ──
describe("formatDateLabel", () => {
  it("returns 'Aujourd'hui' for today", () => {
    expect(formatDateLabel(new Date())).to.equal("Aujourd'hui");
  });

  it("returns 'Hier' for yesterday", () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expect(formatDateLabel(d)).to.equal("Hier");
  });

  it("returns weekday for date within current week", () => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    const result = formatDateLabel(d);
    const weekdays = [
      "dimanche", "lundi", "mardi", "mercredi",
      "jeudi", "vendredi", "samedi",
    ];
    expect(weekdays).to.include(result.toLowerCase());
  });

  it("returns month + day for older dates this year", () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    const result = formatDateLabel(d);
    expect(result).not.to.include("Hier");
    expect(result).not.to.include("Aujourd'hui");
    expect(result.length).to.be.above(2);
  });

  it("returns full date for previous years", () => {
    const d = new Date(2023, 5, 15);
    const result = formatDateLabel(d);
    expect(result).to.include("2023");
    expect(result).to.include("15");
  });
});

// ── formatMessageTime ──
describe("formatMessageTime", () => {
  it("returns only time for today", () => {
    const d = new Date();
    const result = formatMessageTime(d);
    expect(result).to.match(/^\d{2}:\d{2}$/);
  });

  it("includes 'Hier' prefix for yesterday", () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const result = formatMessageTime(d);
    expect(result).to.include("Hier");
  });
});

// ── formatTooltipDate ──
describe("formatTooltipDate", () => {
  it("includes weekday, date and time", () => {
    const d = new Date(2025, 0, 15, 14, 30);
    const result = formatTooltipDate(d);
    expect(result).to.include("mercredi");
    expect(result).to.include("15");
    expect(result).to.include("janvier");
    expect(result).to.include("2025");
    expect(result).to.include("14:30");
  });
});

// ── isFileMessage ──
describe("isFileMessage", () => {
  it("returns true for new format file messages", () => {
    expect(isFileMessage("[FILE:img.png:https://url.com/img:img]")).to.be.true;
  });

  it("returns true for old format file messages", () => {
    expect(isFileMessage("[FILE:doc.pdf:https://url.com/doc]")).to.be.true;
  });

  it("returns false for plain text", () => {
    expect(isFileMessage("Bonjour")).to.be.false;
  });

  it("returns false for empty string", () => {
    expect(isFileMessage("")).to.be.false;
  });
});

// ── parseFileContent ──
describe("parseFileContent", () => {
  it("parses new format with img type", () => {
    const result = parseFileContent("[FILE:photo.jpg:https://cld.com/a.jpg:img]");
    expect(result).to.deep.equal({
      filename: "photo.jpg",
      url: "https://cld.com/a.jpg",
      type: "img",
    });
  });

  it("parses new format with file type", () => {
    const result = parseFileContent("[FILE:doc.pdf:https://cld.com/d.pdf:file]");
    expect(result).to.deep.equal({
      filename: "doc.pdf",
      url: "https://cld.com/d.pdf",
      type: "file",
    });
  });

  it("parses old format (image extension)", () => {
    const result = parseFileContent("[FILE:img.png:https://cld.com/i.png]");
    expect(result).to.deep.equal({
      filename: "img.png",
      url: "https://cld.com/i.png",
      type: "img",
    });
  });

  it("parses old format (non-image extension)", () => {
    const result = parseFileContent("[FILE:data.xlsx:https://cld.com/d.xlsx]");
    expect(result).to.deep.equal({
      filename: "data.xlsx",
      url: "https://cld.com/d.xlsx",
      type: "file",
    });
  });

  it("returns null for plain text", () => {
    expect(parseFileContent("Salut")).to.be.null;
  });

  it("returns null for empty string", () => {
    expect(parseFileContent("")).to.be.null;
  });
});

// ── shouldGroup ──
describe("shouldGroup", () => {
  const makeMsg = (overrides = {}) => ({
    id: 1,
    sender: "Alice",
    own: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  it("groups messages from same sender within GROUP_GAP", () => {
    const prev = makeMsg({ createdAt: new Date(Date.now() - 60 * 1000).toISOString() });
    const next = makeMsg({ id: 2, createdAt: new Date().toISOString() });
    expect(shouldGroup(prev, next)).to.be.true;
  });

  it("does not group messages from different senders", () => {
    const prev = makeMsg({ createdAt: new Date(Date.now() - 60 * 1000).toISOString() });
    const next = makeMsg({ id: 2, sender: "Bob", createdAt: new Date().toISOString() });
    expect(shouldGroup(prev, next)).to.be.false;
  });

  it("does not group own with others messages", () => {
    const prev = makeMsg({ own: true, createdAt: new Date(Date.now() - 60 * 1000).toISOString() });
    const next = makeMsg({ id: 2, own: false, createdAt: new Date().toISOString() });
    expect(shouldGroup(prev, next)).to.be.false;
  });

  it("does not group messages beyond GROUP_GAP", () => {
    const prev = makeMsg({ createdAt: new Date(Date.now() - GROUP_GAP - 1000).toISOString() });
    const next = makeMsg({ id: 2, createdAt: new Date().toISOString() });
    expect(shouldGroup(prev, next)).to.be.false;
  });

  it("does not group when prevMsg is null", () => {
    const next = makeMsg();
    expect(shouldGroup(null, next)).to.be.false;
  });

  it("does not group when nextMsg is null", () => {
    const prev = makeMsg();
    expect(shouldGroup(prev, null)).to.be.false;
  });
});
