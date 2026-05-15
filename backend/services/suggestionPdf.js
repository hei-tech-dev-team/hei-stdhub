const { jsPDF } = require("jspdf");

const NAVY = [10, 26, 47];
const GOLD = [212, 175, 55];
const WHITE = [255, 255, 255];
const GREEN = [16, 185, 129];
const AMBER = [245, 158, 11];
const RED = [239, 68, 68];
const GRAY = [100, 116, 139];
const LIGHT_GRAY = [148, 163, 184];

function generateSuggestionReport(suggestions) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  const dateFr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const acceptes = suggestions.filter((s) => s.statut === "accepte");
  const aDiscuter = suggestions.filter((s) => s.statut === "a_discuter");
  const refuses = suggestions.filter((s) => s.statut === "refuse");
  const total = suggestions.length;

  function addFooter(pageNum, totalPages) {
    doc.setPage(pageNum);
    doc.setFillColor(...NAVY);
    doc.rect(0, pageH - 14, pageW, 14, "F");
    doc.setTextColor(...LIGHT_GRAY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("HEI STDhub \u2014 Bureau Des Etudiants", margin, pageH - 5);
    doc.text(`Page ${pageNum}/${totalPages}`, pageW - margin, pageH - 5, { align: "right" });
  }

  function checkPage(y, needed) {
    if (y + (needed || 30) > pageH - 20) {
      doc.addPage();
      return margin + 10;
    }
    return y;
  }

  let y = margin + 5;

  // ═══════════════════════════════════
  // HEADER
  // ═══════════════════════════════════
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 46, "F");

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.2);
  doc.line(0, 46, pageW, 46);

  doc.setTextColor(...GOLD);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("HEI STDhub", margin, 18);

  doc.setTextColor(...WHITE);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Rapport officiel du Bureau Des Etudiants", margin, 32);

  doc.setFontSize(7);
  doc.setTextColor(...LIGHT_GRAY);
  doc.text(dateFr, pageW - margin, 14, { align: "right" });
  doc.text(`R\xe9f: BDE-RPT-${Date.now().toString(36).toUpperCase()}`, pageW - margin, 24, { align: "right" });

  y = 56;

  // ═══════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text("R\xc9SUM\xc9", margin, y);
  y += 3;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 35, y);
  y += 10;

  const summaryItems = [
    { label: "Accept\xe9es", count: acceptes.length, color: GREEN },
    { label: "\xc0 approfondir", count: aDiscuter.length, color: AMBER },
    { label: "Refus\xe9es", count: refuses.length, color: RED },
    { label: "Total", count: total, color: NAVY },
  ];

  const cardW = (contentW - 12) / 4;

  summaryItems.forEach((item, i) => {
    const cx = margin + i * (cardW + 4);

    doc.setFillColor(...item.color);
    doc.rect(cx, y, cardW, 2.5, "F");

    doc.setFillColor(248, 249, 253);
    doc.setDrawColor(...item.color);
    doc.setLineWidth(0.4);
    doc.roundedRect(cx, y + 2.5, cardW, 28, 2, 2, "FD");

    doc.setTextColor(...item.color);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(item.count), cx + cardW / 2, y + 16, { align: "center" });

    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, cx + cardW / 2, y + 26, { align: "center" });
  });

  y += 40;

  // ═══════════════════════════════════
  // SECTIONS
  // ═══════════════════════════════════
  function renderSection(items, label, accentColor, icon) {
    if (items.length === 0) return;

    y = checkPage(y, 50 + items.length * 28);

    doc.setFillColor(...accentColor);
    doc.rect(margin, y, 3, 16, "F");

    doc.setTextColor(...NAVY);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${icon} ${label} (${items.length})`, margin + 10, y + 11);

    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 20, pageW - margin, y + 20);

    y += 27;

    items.forEach((s, idx) => {
      y = checkPage(y, 36);

      const titleLines = doc.splitTextToSize(s.titre, contentW - 20);
      const titleH = titleLines.length * 4.5;
      const contentMax = s.contenu.length > 150 ? s.contenu.substring(0, 150) + "..." : s.contenu;
      const contentLines = doc.splitTextToSize(contentMax, contentW - 20);
      const contentH = contentLines.length * 3.8;
      const auteur = s.anonyme ? "Anonyme" : `${s.prenom} ${s.nom}`;

      let cardH = 12 + titleH + 3 + contentH + 10;

      if (s.justification) {
        const justLines = doc.splitTextToSize(s.justification, contentW - 36);
        const justBoxH = 16 + justLines.length * 3.8;
        cardH += justBoxH + 4;
      }

      doc.setFillColor(...WHITE);
      doc.setDrawColor(220, 225, 235);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, contentW, cardH, 3, 3, "FD");

      doc.setFillColor(...accentColor);
      doc.roundedRect(margin + 1, y + 3, 2.5, cardH - 6, 1, 1, "F");

      doc.setTextColor(...NAVY);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.text(titleLines, margin + 10, y + 9);

      doc.setTextColor(90, 100, 120);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(contentLines, margin + 10, y + 9 + titleH + 3);

      const authorY = y + 9 + titleH + 3 + contentH + 3;
      doc.setFillColor(245, 246, 250);
      doc.roundedRect(margin + 8, authorY, contentW - 16, 8, 2, 2, "F");
      doc.setTextColor(...LIGHT_GRAY);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "italic");
      doc.text(`Propos\xe9 par ${auteur}`, margin + 13, authorY + 5.5);

      y = authorY + 12;

      if (s.justification) {
        y = checkPage(y, 28);
        const justLines = doc.splitTextToSize(s.justification, contentW - 36);
        const justH = 14 + justLines.length * 3.8;

        doc.setFillColor(254, 245, 245);
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin + 8, y, contentW - 16, justH, 3, 3, "FD");

        doc.setFillColor(...RED);
        doc.rect(margin + 8, y, 2.5, justH, "F");

        doc.setTextColor(...RED);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.text("Justification du BDE :", margin + 17, y + 6);

        doc.setTextColor(160, 50, 50);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(justLines, margin + 17, y + 12);

        y += justH + 5;
      }

      y += 3;
    });

    y += 5;
  }

  renderSection(acceptes, "Suggestions accept\xe9es", GREEN, "1.");
  renderSection(aDiscuter, "\xc0 approfondir", AMBER, "2.");
  renderSection(refuses, "Suggestions refus\xe9es", RED, "3.");

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    addFooter(i, totalPages);
  }

  return doc;
}

module.exports = { generateSuggestionReport };
