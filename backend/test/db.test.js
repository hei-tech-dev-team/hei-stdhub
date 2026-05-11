const chai = require("chai");
const { Pool } = require("pg");

const { expect } = chai;

let db;
before(() => {
  delete require.cache[require.resolve("../db")];
  db = require("../db");
});

describe("DB — module exports", () => {
  it("exports a query function", () => {
    expect(db).to.have.property("query");
    expect(db.query).to.be.a("function");
  });

  it("exports a pool property", () => {
    expect(db).to.have.property("pool");
  });

  it("pool is an instance of pg.Pool", () => {
    expect(db.pool).to.be.instanceOf(Pool);
  });

  it("pool has a connect method", () => {
    expect(db.pool.connect).to.be.a("function");
  });

  it("pool has a query method", () => {
    expect(db.pool.query).to.be.a("function");
  });
});
