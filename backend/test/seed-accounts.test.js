const chai = require("chai");
const { findSeedPasswordAccounts } = require("../services/securityChecks");

const { expect } = chai;

describe("SECURITY — dev seed password detection", () => {
  it("flags every account still using the public seed password", async () => {
    const exposed = await findSeedPasswordAccounts();
    const refs = exposed.map((u) => u.ref);
    expect(refs).to.include.members(["ADMIN001", "DEV001"]);
  });
});
