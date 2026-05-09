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
const BG = [248, 250, 252];
const BORDER = [226, 232, 240];

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
    doc.text(
      `Page ${pageNum}/${totalPages}`,
      pageW - margin,
      pageH - 5,
      { align: "right" },
    );
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

  doc.setTextColor(...GOLD);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("HEI STDhub", margin, 18);

  doc.setTextColor(...WHITE);
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text("Rapport du Bureau Des Etudiants", margin, 30);

  doc.setFontSize(8);
  doc.setTextColor(...LIGHT_GRAY);
  doc.text(
    `Rapport officiel — ${dateFr}`,
    pageW - margin,
    18,
    { align: "right" },
  );
  doc.text(
    `Reference: BDE-SUG-${Date.now().toString(36).toUpperCase()}`,
    pageW - margin,
    28,
    { align: "right" },
  );

  y = 58;

  // ── SUMMARY BOX ──
  doc.setFillColor(...BG);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentW, 32, 3, 3, "FD");

  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Resume des suggestions", margin + 6, y + 10);

  const total = suggestions.length;
  const summary = [
    { label: "Acceptees", count: acceptes.length, color: GREEN },
    { label: "A discuter", count: aDiscuter.length, color: AMBER },
    { label: "Refusees", count: refuses.length, color: RED },
    { label: "Total", count: total, color: NAVY },
  ];

  const colW = (contentW - 12) / summary.length;
  summary.forEach((item, i) => {
    const x = margin + 6 + i * colW;
    doc.setFillColor(...item.color);
    doc.circle(x + colW / 2, y + 16, 6, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(String(item.count), x + colW / 2, y + 18, { align: "center" });
    doc.setTextColor(...GRAY);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, x + colW / 2, y + 26, { align: "center" });
  });

  y += 42;

  // ── SECTION RENDERER ──
  function renderSection(items, label, accentColor, icon) {
    if (items.length === 0) return;

    y = checkPage(y, 45 + items.length * 30);
    y += 2;

    // Section header bar
    doc.setFillColor(...accentColor);
    doc.rect(margin, y, 3, 12, "F");
    doc.setTextColor(...DARK);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${icon} ${label} (${items.length})`, margin + 8, y + 9);

    y += 18;

    items.forEach((s) => {
      y = checkPage(y, 36);

      // Card background
      doc.setFillColor(...WHITE);
      doc.setDrawColor(...accentColor);
      doc.setLineWidth(1);
      doc.roundedRect(margin, y, contentW, 0, 2, 2, "FD");

      // Subtle left accent bar
      doc.setFillColor(...accentColor);
      doc.rect(margin, y, 2.5, 0, "F");

      // Title
      doc.setTextColor(...DARK);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(s.titre, contentW - 16);
      doc.text(titleLines, margin + 8, y + 7);
      const titleH = titleLines.length * 5;

      // Content preview
      doc.setTextColor(...GRAY);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const contentLines = doc.splitTextToSize(
        s.contenu.length > 120
          ? s.contenu.substring(0, 120) + "..."
          : s.contenu,
        contentW - 16,
      );
      doc.text(contentLines, margin + 8, y + 7 + titleH + 2);
      const contentH = contentLines.length * 3.5;

      // Author
      const auteur = s.anonyme ? "Anonyme" : `${s.prenom} ${s.nom}`;
      doc.setTextColor(...LIGHT_GRAY);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.text(`— ${auteur}`, margin + 8, y + 7 + titleH + 2 + contentH + 4);

      // Card height
      let cardH = 7 + titleH + 2 + contentH + 10;

      // Justification for refused
      if (s.justification) {
        const justY = y + cardH + 2;
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin + 6, justY, contentW - 12, 0, 2, 2, "FD");

        doc.setTextColor(...RED);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text("Justification du BDE :", margin + 12, justY + 6);

        doc.setTextColor(180, 40, 40);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const justLines = doc.splitTextToSize(
          s.justification,
          contentW - 28,
        );
        doc.text(justLines, margin + 12, justY + 12);
        cardH += 12 + justLines.length * 3.5 + 4;
      }

      // Draw the actual card rectangle with proper height
      doc.setFillColor(...WHITE);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, contentW, cardH, 2, 2, "FD");

      // Left accent bar (overlay)
      doc.setFillColor(...accentColor);
      doc.rect(margin, y, 2.5, cardH, "F");

      // Re-render text on top of card background
      doc.setTextColor(...DARK);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(titleLines, margin + 8, y + 7);

      doc.setTextColor(...GRAY);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(contentLines, margin + 8, y + 7 + titleH + 2);

      doc.setTextColor(...LIGHT_GRAY);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.text(`— ${auteur}`, margin + 8, y + 7 + titleH + 2 + contentH + 4);

      if (s.justification) {
        const justY = y + 7 + titleH + 2 + contentH + 8;
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.3);
        doc.roundedRect(
          margin + 6,
          justY,
          contentW - 12,
          12 + s.justification.length / 3,
          2,
          2,
          "FD",
        );

        doc.setTextColor(...RED);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text("Justification du BDE :", margin + 12, justY + 6);

        doc.setTextColor(180, 40, 40);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const justLines = doc.splitTextToSize(
          s.justification,
          contentW - 28,
        );
        doc.text(justLines, margin + 12, justY + 12);
        cardH += 12 + justLines.length * 3.5 + 4;
      }

      y += cardH + 6;
    });

    y += 2;
  }

  renderSection(acceptes, "Suggestions acceptees", GREEN, ">");
  renderSection(aDiscuter, "A approfondir", AMBER, "?");
  renderSection(refuses, "Suggestions refusees", RED, ">");

  // ── FOOTER ON ALL PAGES ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    addFooter(i, totalPages);
  }

  return doc;
}

module.exports = { generateSuggestionReport };
