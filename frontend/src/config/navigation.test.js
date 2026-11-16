/* global describe, it */
import { expect } from "chai";
import {
  MAIN_TAB_PATHS,
  isBottomBarPath,
  isMainTabPath,
} from "./navigation.js";
import { getAdjacentTab } from "../utils/swipeTabs.js";

describe("MAIN_TAB_PATHS", () => {
  it("keeps the sidebar and swipe order aligned", () => {
    expect(MAIN_TAB_PATHS).to.deep.equal([
      "/",
      "/archives",
      "/chat",
      "/pings",
      "/profile",
    ]);
  });

  it("moves between neighbouring pages without wrapping", () => {
    expect(getAdjacentTab(MAIN_TAB_PATHS, "/archives", "next")).to.equal(
      "/chat",
    );
    expect(getAdjacentTab(MAIN_TAB_PATHS, "/", "previous")).to.equal(null);
    expect(getAdjacentTab(MAIN_TAB_PATHS, "/profile", "next")).to.equal(null);
  });
});

describe("isMainTabPath", () => {
  it("accepts primary tab routes", () => {
    expect(isMainTabPath("/archives")).to.equal(true);
  });

  it("rejects secondary and admin routes", () => {
    expect(isMainTabPath("/suggestions")).to.equal(false);
    expect(isMainTabPath("/admin")).to.equal(false);
  });
});

describe("isBottomBarPath", () => {
  it("shows the bar on the primary tabs", () => {
    expect(isBottomBarPath("/chat")).to.equal(true);
  });

  it("shows the bar on suggestions and user profiles", () => {
    expect(isBottomBarPath("/suggestions")).to.equal(true);
    expect(isBottomBarPath("/user/HEI-123")).to.equal(true);
  });

  it("hides the bar on admin, BDE, auth and error routes", () => {
    expect(isBottomBarPath("/admin")).to.equal(false);
    expect(isBottomBarPath("/bde")).to.equal(false);
    expect(isBottomBarPath("/login")).to.equal(false);
    expect(isBottomBarPath("/server-error")).to.equal(false);
    expect(isBottomBarPath("/unknown")).to.equal(false);
  });
});
