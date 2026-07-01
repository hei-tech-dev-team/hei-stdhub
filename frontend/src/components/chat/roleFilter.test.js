/* global describe, it */
import { expect } from "chai";
import {
  expandRoleFilter,
  determineRegisterRole,
  validateRegisterEmail,
} from "../../utils/roleFilter.js";

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

describe("determineRegisterRole", () => {
  it("returns the inviteRole as-is (code role always wins)", () => {
    expect(determineRegisterRole("teacher")).to.equal("teacher");
    expect(determineRegisterRole("student")).to.equal("student");
    expect(determineRegisterRole("alumni")).to.equal("alumni");
    expect(determineRegisterRole("admin")).to.equal("admin");
  });
});

describe("validateRegisterEmail", () => {
  it("accepts hei.*@gmail.com for student role", () => {
    expect(validateRegisterEmail("hei.jean@gmail.com", "student")).to.be.true;
    expect(
      validateRegisterEmail("hei.jean_rakoto@gmail.com", "student"),
    ).to.be.true;
  });

  it("rejects non-hei gmail for student role", () => {
    expect(validateRegisterEmail("jean@gmail.com", "student")).to.be.false;
  });

  it("rejects missing @ for student role", () => {
    expect(validateRegisterEmail("jean", "student")).to.be.false;
  });

  it("rejects empty email for student role", () => {
    expect(validateRegisterEmail("", "student")).to.be.false;
  });

  it("accepts any email with @ for alumni role", () => {
    expect(validateRegisterEmail("jean.rakoto@gmail.com", "alumni")).to.be.true;
    expect(validateRegisterEmail("jean@yahoo.fr", "alumni")).to.be.true;
  });

  it("rejects email without @ for alumni role", () => {
    expect(validateRegisterEmail("jeanrakoto", "alumni")).to.be.false;
  });

  it("rejects empty email for alumni role", () => {
    expect(validateRegisterEmail("", "alumni")).to.be.false;
  });

  it("accepts any email for teacher role", () => {
    expect(validateRegisterEmail("dr.nom@hei.mg", "teacher")).to.be.true;
    expect(validateRegisterEmail("test@test.com", "teacher")).to.be.true;
  });

  it("returns false for null email", () => {
    expect(validateRegisterEmail(null, "student")).to.be.false;
  });

  it("returns false for null role", () => {
    expect(validateRegisterEmail("hei.jean@gmail.com", null)).to.be.false;
  });
});
