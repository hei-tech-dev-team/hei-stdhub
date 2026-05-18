const { expect } = require("chai");
const { generateSuggestionReport } = require("../services/suggestionPdf");
const request = require("supertest");
const app = require("../server");

const makeSuggestions = () => [
  {
    id: 1,
    titre: "Ajouter un tableau de bord",
    contenu:
      "Ce serait bien d avoir un tableau de bord pour voir les statistiques generales de la plateforme.",
    prenom: "Jean",
    nom: "Rakoto",
    statut: "accepte",
    anonyme: false,
  },
  {
    id: 2,
    titre: "Plus de places de parking",
    contenu:
      "Proposition d augmenter le nombre de places de parking autour de l ecole.",
    prenom: "Marie",
    nom: "Rabe",
    statut: "refuse",
    anonyme: false,
    justification:
      "Le campus n a pas de terrain disponible pour l extension du parking.",
  },
  {
    id: 3,
    titre: "Cafe gratuit dans la salle d etude",
    contenu: "Mettre a disposition du cafe gratuit dans la salle d etude.",
    prenom: null,
    nom: null,
    statut: "a_discuter",
    anonyme: true,
  },
];

describe("SUGGESTION PDF — generateSuggestionReport", () => {
  it("genere un PDF valide a partir de suggestions", () => {
    const doc = generateSuggestionReport(makeSuggestions());
    const buf = Buffer.from(doc.output("arraybuffer"));
    expect(buf.length).to.be.greaterThan(1000);
    expect(buf.slice(0, 5).toString()).to.equal("%PDF-");
  });

  it("contient le titre HEI STDhub dans le PDF", () => {
    const doc = generateSuggestionReport(makeSuggestions());
    const buf = Buffer.from(doc.output("arraybuffer"));
    const text = buf.toString("latin1");
    expect(text).to.include("HEI");
    expect(text).to.include("STDhub");
  });

  it("contient les titres des suggestions", () => {
    const doc = generateSuggestionReport(makeSuggestions());
    const buf = Buffer.from(doc.output("arraybuffer"));
    const text = buf.toString("latin1");
    expect(text).to.include("tableau de bord");
    expect(text).to.include("parking");
    expect(text).to.include("Cafe gratuit");
  });

  it("contient les noms des sections (acceptees, refusees, a discuter)", () => {
    const doc = generateSuggestionReport(makeSuggestions());
    const buf = Buffer.from(doc.output("arraybuffer"));
    const text = buf.toString("latin1");
    expect(text).to.include("Suggestions accept");
    expect(text).to.include("Suggestions refus");
    expect(text).to.include("approfondir");
  });

  it("contient la justification pour les suggestions refusees", () => {
    const doc = generateSuggestionReport(makeSuggestions());
    const buf = Buffer.from(doc.output("arraybuffer"));
    const text = buf.toString("latin1");
    expect(text).to.include("Justification du BDE");
    expect(text).to.include("extension du parking");
  });

  it("affiche Anonyme pour les suggestions anonymes", () => {
    const doc = generateSuggestionReport(makeSuggestions());
    const buf = Buffer.from(doc.output("arraybuffer"));
    const text = buf.toString("latin1");
    expect(text).to.include("Anonyme");
  });

  it("affiche le resume (Acceptees, A discuter, Refusees, Total)", () => {
    const doc = generateSuggestionReport(makeSuggestions());
    const buf = Buffer.from(doc.output("arraybuffer"));
    const text = buf.toString("latin1");
    expect(text).to.include("SUM");
    expect(text).to.include("Accept");
    expect(text).to.include("Refus");
  });

  it("genere plusieurs pages pour beaucoup de suggestions", () => {
    const many = [];
    for (let i = 0; i < 25; i++) {
      many.push({
        id: i + 10,
        titre: `Suggestion numero ${i + 1}`,
        contenu: "Contenu de test pour remplir plusieurs pages.",
        prenom: "Test",
        nom: `User${i}`,
        statut: i % 3 === 0 ? "accepte" : i % 3 === 1 ? "a_discuter" : "refuse",
        anonyme: false,
        justification:
          i % 3 === 2 ? "Justification pour le refus de cette suggestion." : null,
      });
    }
    const doc = generateSuggestionReport(many);
    expect(doc.internal.getNumberOfPages()).to.be.greaterThan(1);
  });

  it("gestion des sections vides (aucune suggestion acceptee)", () => {
    const sansAcceptees = makeSuggestions().filter(
      (s) => s.statut !== "accepte",
    );
    const doc = generateSuggestionReport(sansAcceptees);
    const buf = Buffer.from(doc.output("arraybuffer"));
    expect(buf.slice(0, 5).toString()).to.equal("%PDF-");
  });

  it("retourne un buffer PDF via le generateur", () => {
    const doc = generateSuggestionReport(makeSuggestions());
    const buf = Buffer.from(doc.output("arraybuffer"));
    expect(buf).to.be.instanceOf(Buffer);
    expect(buf.length).to.be.greaterThan(2000);
  });
});

describe("SUGGESTION PDF — POST /api/suggestions/report endpoint", () => {
  let agent;
  let bdeToken;

  before(async function () {
    agent = request.agent(app);
    try {
      const res = await agent
        .post("/api/auth/login")
        .send({ ref: "ADMIN001", password: "password" });
      bdeToken = res.body.token;
    } catch (e) {
      console.warn("DB not available, skipping endpoint tests");
      this.skip();
    }
  });

  it("refuse l acces sans token", async () => {
    const res = await agent
      .post("/api/suggestions/report")
      .send({ suggestions: makeSuggestions() });
    expect(res.status).to.equal(401);
  });

  it("refuse avec suggestions manquantes", async function () {
    if (!bdeToken) this.skip();
    const res = await agent
      .post("/api/suggestions/report")
      .set("Authorization", `Bearer ${bdeToken}`)
      .send({});
    expect(res.status).to.equal(400);
    expect(res.body.error).to.include("Suggestions");
  });

  it("refuse avec tableau vide", async function () {
    if (!bdeToken) this.skip();
    const res = await agent
      .post("/api/suggestions/report")
      .set("Authorization", `Bearer ${bdeToken}`)
      .send({ suggestions: [] });
    expect(res.status).to.equal(400);
  });

  it("genere et retourne un PDF pour des suggestions valides", async function () {
    if (!bdeToken) this.skip();
    const res = await agent
      .post("/api/suggestions/report")
      .set("Authorization", `Bearer ${bdeToken}`)
      .send({ suggestions: makeSuggestions() });
    expect(res.status).to.equal(200);
    expect(res.headers["content-type"]).to.include("application/pdf");
  });
});
