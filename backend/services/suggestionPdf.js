const { jsPDF } = require("jspdf");

const NAVY = [0, 25, 72];
const GOLD = [223, 164, 8];
const GOLD_LIGHT = [242, 201, 76];
const WHITE = [255, 255, 255];
const GREEN = [16, 185, 129];
const AMBER = [245, 158, 11];
const RED = [239, 68, 68];
const GRAY = [100, 116, 139];
const SURFACE = [242, 244, 248];

const HEI_LOGO_B64 =
  "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";

function generateSuggestionReport(suggestions) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  const dateFr = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const year = new Date().getFullYear();

  const acceptes = suggestions.filter((s) => s.statut === "accepte");
  const aDiscuter = suggestions.filter((s) => s.statut === "a_discuter");
  const refuses = suggestions.filter((s) => s.statut === "refuse");
  const total = suggestions.length;

  function addFooter(pageNum, totalPages) {
    doc.setPage(pageNum);
    doc.setDrawColor(210, 215, 225);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 16, pageW - margin, pageH - 16);
    doc.setTextColor(140, 150, 170);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Haute Ecole d'Informatique-HEI hei.school, BDE Bureau Des Etudiants — ${year}`,
      margin,
      pageH - 6,
    );
    doc.text(`Page ${pageNum}/${totalPages}`, pageW - margin, pageH - 6, {
      align: "right",
    });
  }

  function checkPage(y, needed) {
    if (y + (needed || 30) > pageH - 24) {
      doc.addPage();
      return margin + 15;
    }
    return y;
  }

  let y = margin + 15;

  // ═══════════════════════════════════
  // HEADER — clean, minimal
  // ═══════════════════════════════════
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 50, "F");

  // School logo
  try {
    doc.addImage(HEI_LOGO_B64, "PNG", margin + 3, 8, 14, 14);
  } catch (_) {
    doc.setFillColor(...GOLD);
    doc.circle(margin + 10, 15, 7, "F");
    doc.setTextColor(...NAVY);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("HEI", margin + 10, 17, { align: "center" });
  }

  doc.setTextColor(...GOLD);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("HEI STDhub", margin + 22, 13);

  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport BDE", margin, 34);

  doc.setFontSize(9);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text(String(year), margin, 44);

  doc.setFontSize(7);
  doc.setTextColor(160, 180, 210);
  doc.text(dateFr, pageW - margin, 13, { align: "right" });
  doc.text(`Ref: BDE-${year}`, pageW - margin, 22, { align: "right" });

  y = 62;

  // ═══════════════════════════════════
  // INTRO
  // ═══════════════════════════════════
  doc.setTextColor(...NAVY);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Synthèse des suggestions", margin, y);
  y += 2;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin + 45, y);
  y += 8;

  doc.setTextColor(...GRAY);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const introText =
    "Ce rapport présente les suggestions reçues par le Bureau Des Étudiants. Chaque proposition a été examinée et classée selon son statut.";
  const introLines = doc.splitTextToSize(introText, contentW);
  doc.text(introLines, margin, y);
  y += introLines.length * 4.5 + 8;

  // ═══════════════════════════════════
  // STATISTIQUES
  // ═══════════════════════════════════
  doc.setTextColor(...NAVY);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Statistiques", margin, y);
  y += 2;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 35, y);
  y += 8;

  const statLines = [
    `Acceptées : ${acceptes.length}`,
    `À discuter : ${aDiscuter.length}`,
    `Refusées : ${refuses.length}`,
    `Total : ${total}`,
  ];

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  statLines.forEach((line, i) => {
    const color = i === 0 ? GREEN : i === 1 ? AMBER : i === 2 ? RED : NAVY;
    doc.setTextColor(...color);
    doc.text(line, margin + 2, y);
    y += 5.5;
  });

  y += 6;

  // ═══════════════════════════════════
  // SECTIONS — simple listings
  // ═══════════════════════════════════
  function renderSection(items, label, accentColor) {
    if (items.length === 0) return;

    y = checkPage(y, 30 + items.length * 20);

    doc.setTextColor(...accentColor);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${label} (${items.length})`, margin, y);
    y += 2;
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    items.forEach((s, idx) => {
      y = checkPage(y, 18);

      const author = s.anonyme
        ? "Anonyme"
        : `${s.prenom} ${s.nom}`;
      const line = `${idx + 1}. ${s.titre}`;
      doc.setTextColor(...NAVY);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(line, contentW - 5);
      doc.text(titleLines, margin + 2, y);
      y += titleLines.length * 4.5 + 1;

      const excerpt =
        s.contenu.length > 80
          ? s.contenu.substring(0, 80) + "..."
          : s.contenu;
      doc.setTextColor(...GRAY);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      const excerptLines = doc.splitTextToSize(excerpt, contentW - 10);
      doc.text(excerptLines, margin + 4, y);
      y += excerptLines.length * 4 + 2;

      doc.setTextColor(170, 180, 200);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "italic");
      doc.text(
        `— ${author}, ${new Date(s.created_at).toLocaleDateString("fr-FR")}`,
        margin + 4,
        y,
      );
      y += 6;

      if (s.justification) {
        y = checkPage(y, 16);
        doc.setTextColor(...RED);
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        const justLines = doc.splitTextToSize(
          `Justification : ${s.justification}`,
          contentW - 10,
        );
        doc.text(justLines, margin + 6, y);
        y += justLines.length * 4 + 4;
      }

      y += 2;
    });

    y += 4;
  }

  renderSection(acceptes, "Suggestions acceptées", GREEN);
  renderSection(aDiscuter, "Suggestions à discuter", AMBER);
  renderSection(refuses, "Suggestions refusées", RED);

  // ═══════════════════════════════════
  // CLOSING
  // ═══════════════════════════════════
  y = checkPage(y, 30);

  doc.setDrawColor(210, 215, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setTextColor(...NAVY);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Document généré par le Bureau Des Étudiants — HEI STDhub",
    margin,
    y,
  );
  y += 5;
  doc.setTextColor(...GRAY);
  doc.setFontSize(8);
  doc.text(`Le ${dateFr}`, margin, y);

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    addFooter(i, totalPages);
  }

  return doc;
}

module.exports = { generateSuggestionReport };
