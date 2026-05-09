/* global describe, it */
import { expect } from "chai";
import { expandRoleFilter } from "../../utils/roleFilter.js";

describe("expandRoleFilter", () => {
  it('returns "student,bde" for "student"', () => {
    expect(expandRoleFilter("student")).to.equal("student,bde");
  });

  it('returns "bde" for "bde"', () => {
    expect(expandRoleFilter("bde")).to.equal("bde");
  });

  it('returns "teacher" for "teacher"', () => {
    expect(expandRoleFilter("teacher")).to.equal("teacher");
  });

  it('returns "admin" for "admin"', () => {
    expect(expandRoleFilter("admin")).to.equal("admin");
  });

  it('returns "alumni" for "alumni"', () => {
    expect(expandRoleFilter("alumni")).to.equal("alumni");
  });

  it('returns "" for ""', () => {
    expect(expandRoleFilter("")).to.equal("");
  });

  it("passes through unknown roles unchanged", () => {
    expect(expandRoleFilter("some_role")).to.equal("some_role");
  });
});
