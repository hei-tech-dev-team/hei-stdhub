const { jsPDF } = require("jspdf");

const NAVY = [10, 26, 47];
const GOLD = [212, 175, 55];
const WHITE = [255, 255, 255];
const GREEN = [16, 185, 129];
const AMBER = [245, 158, 11];
const RED = [239, 68, 68];
const DARK = [30, 41, 59];
const GRAY = [100, 116, 139];
const LIGHT_GRAY = [148, 163, 184];

function generateSuggestionReport(suggestions) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  const dateFr = new Date().toLocaleDateString("fr-FR");

  const acceptes = suggestions.filter((s) => s.statut === "accepte");
  const aDiscuter = suggestions.filter((s) => s.statut === "a_discuter");
  const refuses = suggestions.filter((s) => s.statut === "refuse");
  const total = suggestions.length;

  function addFooter(pageNum, totalPages) {
    doc.setPage(pageNum);
    doc.setFillColor(...NAVY);
    doc.rect(0, pageH - 14, pageW, 14, "F");
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.line(0, pageH - 14, pageW, pageH - 14);
    doc.setTextColor(...LIGHT_GRAY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("HEI STDhub — Bureau Des Etudiants", margin, pageH - 5);
    doc.text(`Page ${pageNum}/${totalPages}`, pageW - margin, pageH - 5, { align: "right" });
  }

  function checkPage(y, needed) {
    if (y + (needed || 30) > pageH - 20) {
      doc.addPage();
      return margin + 5;
    }
    return y;
  }

  let y = margin + 5;

  // ── HEADER ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 48, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(0, 48, pageW, 48);

  doc.setFillColor(...GOLD);
  doc.circle(margin + 4, 12, 1.5, "F");
  doc.circle(margin + 12, 12, 1.5, "F");
  doc.circle(margin + 20, 12, 1.5, "F");

  doc.setTextColor(...GOLD);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("HEI STDhub", margin, 20);

  doc.setTextColor(...WHITE);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Rapport officiel du Bureau Des Etudiants", margin, 33);

  doc.setFontSize(8);
  doc.setTextColor(...LIGHT_GRAY);
  doc.text(dateFr, pageW - margin, 18, { align: "right" });
  doc.text(`Ref: BDE-RPT-${Date.now().toString(36).toUpperCase()}`, pageW - margin, 28, { align: "right" });

  y = 58;

  // ── SUMMARY CARD ──
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 36, 4, 4, "FD");

  doc.setFillColor(...GOLD);
  doc.rect(margin, y, 3, 36, "F");

  doc.setTextColor(...NAVY);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("RESUME", margin + 10, y + 10);

  const summaryColW = (contentW - 16) / 4;
  const summaryItems = [
    { label: "Acceptees", count: acceptes.length, color: GREEN },
    { label: "A approfondir", count: aDiscuter.length, color: AMBER },
    { label: "Refusees", count: refuses.length, color: RED },
    { label: "Total", count: total, color: NAVY },
  ];
  summaryItems.forEach((item, i) => {
    const x = margin + 10 + i * summaryColW;
    doc.setFillColor(...item.color);
    doc.circle(x + summaryColW / 2, y + 17, 5, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(String(item.count), x + summaryColW / 2, y + 18.5, { align: "center" });
    doc.setTextColor(...GRAY);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, x + summaryColW / 2, y + 27, { align: "center" });
  });

  y += 48;

  // ── SECTION RENDERER ──
  function renderSection(items, label, accentColor, sectionNum) {
    if (items.length === 0) return;

    y = checkPage(y, 45 + items.length * 30);

    doc.setFillColor(...accentColor);
    doc.rect(margin, y, 3, 14, "F");

    doc.setTextColor(...NAVY);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`${sectionNum}. ${label} (${items.length})`, margin + 10, y + 10);

    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 18, pageW - margin, y + 18);

    y += 26;

    items.forEach((s) => {
      y = checkPage(y, 40);

      const titleLines = doc.splitTextToSize(s.titre, contentW - 20);
      const titleH = titleLines.length * 5;
      const contentMax = s.contenu.length > 150 ? s.contenu.substring(0, 150) + "..." : s.contenu;
      const contentLines = doc.splitTextToSize(contentMax, contentW - 20);
      const contentH = contentLines.length * 3.5;
      const auteur = s.anonyme ? "Anonyme" : `${s.prenom} ${s.nom}`;

      let cardH = 8 + titleH + 3 + contentH + 10;

      if (s.justification) {
        const justLines = doc.splitTextToSize(s.justification, contentW - 32);
        cardH += 10 + 12 + justLines.length * 3.5;
      }

      // Card shadow
      doc.setFillColor(235, 238, 245);
      doc.roundedRect(margin + 0.5, y + 0.5, contentW, cardH, 4, 4, "F");

      // Card body
      doc.setFillColor(...WHITE);
      doc.setDrawColor(210, 215, 225);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, contentW, cardH, 4, 4, "FD");

      // Left accent bar
      doc.setFillColor(...accentColor);
      doc.rect(margin + 0.5, y + 2, 2.5, cardH - 4, "F");

      // Gold corner accent
      doc.setFillColor(...GOLD);
      doc.circle(margin + contentW - 6, y + 6, 1.5, "F");

      // Title
      doc.setTextColor(...NAVY);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(titleLines, margin + 10, y + 8);

      // Content
      doc.setTextColor(...GRAY);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(contentLines, margin + 10, y + 8 + titleH + 3);

      // Author
      doc.setTextColor(...LIGHT_GRAY);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.text(`— ${auteur}`, margin + 10, y + 8 + titleH + 3 + contentH + 5);

      // Justification
      if (s.justification) {
        const justY = y + 8 + titleH + 3 + contentH + 9;
        const justLines = doc.splitTextToSize(s.justification, contentW - 32);
        const justH = 12 + justLines.length * 3.5;

        doc.setFillColor(255, 245, 245);
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin + 8, justY, contentW - 16, justH, 3, 3, "FD");

        doc.setTextColor(...RED);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text("Justification du BDE :", margin + 14, justY + 6);

        doc.setTextColor(180, 40, 40);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(justLines, margin + 14, justY + 12);
      }

      y += cardH + 8;
    });

    y += 4;
  }

  renderSection(acceptes, "Suggestions acceptees", GREEN, 1);
  renderSection(aDiscuter, "A approfondir", AMBER, 2);
  renderSection(refuses, "Suggestions refusees", RED, 3);

  // ── FOOTER ON ALL PAGES ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    addFooter(i, totalPages);
  }

  return doc;
}

module.exports = { generateSuggestionReport };
