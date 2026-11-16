/* global describe, it */
import { expect } from "chai";
import { getAdjacentTab, getSwipeTabDirection } from "./swipeTabs.js";

describe("getSwipeTabDirection", () => {
  it("returns next for a left swipe", () => {
    expect(
      getSwipeTabDirection({
        deltaX: -80,
        deltaY: 10,
        durationMs: 300,
      }),
    ).to.equal("next");
  });

  it("returns previous for a right swipe", () => {
    expect(
      getSwipeTabDirection({
        deltaX: 80,
        deltaY: 10,
        durationMs: 300,
      }),
    ).to.equal("previous");
  });

  it("accepts the horizontal threshold exactly", () => {
    expect(
      getSwipeTabDirection({
        deltaX: 50,
        deltaY: 0,
        durationMs: 300,
      }),
    ).to.equal("previous");
  });

  it("rejects gestures below the horizontal threshold", () => {
    expect(
      getSwipeTabDirection({
        deltaX: 49,
        deltaY: 0,
        durationMs: 300,
      }),
    ).to.equal(null);
  });

  it("rejects gestures with too much vertical movement", () => {
    expect(
      getSwipeTabDirection({
        deltaX: 80,
        deltaY: 40,
        durationMs: 300,
      }),
    ).to.equal(null);
  });

  it("rejects gestures that are not clearly horizontal", () => {
    expect(
      getSwipeTabDirection({
        deltaX: 50,
        deltaY: 39,
        durationMs: 300,
      }),
    ).to.equal(null);
  });

  it("rejects slow gestures", () => {
    expect(
      getSwipeTabDirection({
        deltaX: 80,
        deltaY: 0,
        durationMs: 701,
      }),
    ).to.equal(null);
  });

  it("rejects multi-touch gestures", () => {
    expect(
      getSwipeTabDirection({
        deltaX: 80,
        deltaY: 0,
        durationMs: 300,
        touchCount: 2,
      }),
    ).to.equal(null);
  });
});

describe("getAdjacentTab", () => {
  const tabs = ["received", "sent"];

  it("moves to the next tab", () => {
    expect(getAdjacentTab(tabs, "received", "next")).to.equal("sent");
  });

  it("moves to the previous tab", () => {
    expect(getAdjacentTab(tabs, "sent", "previous")).to.equal("received");
  });

  it("does not wrap past the last tab", () => {
    expect(getAdjacentTab(tabs, "sent", "next")).to.equal(null);
  });

  it("does not wrap before the first tab", () => {
    expect(getAdjacentTab(tabs, "received", "previous")).to.equal(null);
  });

  it("returns null for an unknown active tab", () => {
    expect(getAdjacentTab(tabs, "unknown", "next")).to.equal(null);
  });
});
