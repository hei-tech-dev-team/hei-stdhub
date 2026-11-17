/* global describe, it */
import { expect } from "chai";
import {
  PULL_MAX_DISTANCE_PX,
  PULL_TRIGGER_THRESHOLD_PX,
  getPullDistance,
  shouldStartPull,
  shouldTriggerRefresh,
} from "./pullToRefresh.js";

describe("shouldStartPull", () => {
  it("accepts a downward pull at the top of the container", () => {
    expect(
      shouldStartPull({ deltaX: 4, deltaY: 24, scrollTop: 0 }),
    ).to.equal(true);
  });

  it("rejects a pull when the container is not at the top", () => {
    expect(
      shouldStartPull({ deltaX: 4, deltaY: 24, scrollTop: 1 }),
    ).to.equal(false);
  });

  it("rejects upward gestures", () => {
    expect(
      shouldStartPull({ deltaX: 4, deltaY: -24, scrollTop: 0 }),
    ).to.equal(false);
  });

  it("rejects gestures below the start threshold", () => {
    expect(
      shouldStartPull({ deltaX: 0, deltaY: 8, scrollTop: 0 }),
    ).to.equal(false);
  });

  it("rejects horizontal-dominant gestures", () => {
    expect(
      shouldStartPull({ deltaX: 30, deltaY: 24, scrollTop: 0 }),
    ).to.equal(false);
  });

  it("rejects multi-touch gestures", () => {
    expect(
      shouldStartPull({
        deltaX: 4,
        deltaY: 24,
        scrollTop: 0,
        touchCount: 2,
      }),
    ).to.equal(false);
  });
});

describe("getPullDistance", () => {
  it("returns zero for upward or missing movement", () => {
    expect(getPullDistance(-10)).to.equal(0);
    expect(getPullDistance(Number.NaN)).to.equal(0);
  });

  it("applies resistance to the raw movement", () => {
    expect(getPullDistance(40)).to.equal(22);
  });

  it("caps the indicator distance", () => {
    expect(getPullDistance(1000)).to.equal(PULL_MAX_DISTANCE_PX);
  });
});

describe("shouldTriggerRefresh", () => {
  it("triggers at the threshold", () => {
    expect(shouldTriggerRefresh(PULL_TRIGGER_THRESHOLD_PX)).to.equal(true);
  });

  it("does not trigger below the threshold", () => {
    expect(shouldTriggerRefresh(PULL_TRIGGER_THRESHOLD_PX - 1)).to.equal(false);
  });
});
