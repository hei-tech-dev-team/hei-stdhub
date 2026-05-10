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
    doc.rect(0, pageH - 16, pageW, 16, "F");
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.8);
    doc.line(0, pageH - 16, pageW, pageH - 16);
    doc.setTextColor(...LIGHT_GRAY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("HEI STDhub — Bureau Des Etudiants", margin, pageH - 6);
    doc.text(`Page ${pageNum}/${totalPages}`, pageW - margin, pageH - 6, { align: "right" });
  }

  function checkPage(y, needed) {
    if (y + (needed || 30) > pageH - 22) {
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
  doc.rect(0, 0, pageW, 52, "F");

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.5);
  doc.line(0, 52, pageW, 52);

  for (let i = 0; i < 3; i++) {
    doc.setFillColor(...GOLD);
    doc.circle(margin + 4 + i * 8, 14, 1.8, "F");
  }

  doc.setTextColor(...GOLD);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("HEI STDhub", margin, 20);

  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Rapport officiel du Bureau Des Etudiants", margin, 34);

  doc.setFontSize(7);
  doc.setTextColor(...LIGHT_GRAY);
  doc.text(dateFr, pageW - margin, 16, { align: "right" });
  doc.text(`R\xe9f: BDE-RPT-${Date.now().toString(36).toUpperCase()}`, pageW - margin, 26, { align: "right" });

  y = 62;

  // ═══════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text("RESUME", margin, y);
  y += 4;

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 40, y);
  y += 8;

  const summaryItems = [
    { label: "Acceptees", count: acceptes.length, color: GREEN },
    { label: "A approfondir", count: aDiscuter.length, color: AMBER },
    { label: "Refusees", count: refuses.length, color: RED },
    { label: "Total", count: total, color: NAVY },
  ];

  const cardW = (contentW - 12) / 4;

  summaryItems.forEach((item, i) => {
    const cx = margin + i * (cardW + 4);

    doc.setFillColor(248, 249, 253);
    doc.setDrawColor(...item.color);
    doc.setLineWidth(0.6);
    doc.roundedRect(cx, y, cardW, 34, 4, 4, "FD");

    doc.setFillColor(...item.color);
    doc.rect(cx, y, cardW, 3, "F");

    doc.setFillColor(...item.color);
    doc.circle(cx + cardW / 2, y + 14, 7, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(String(item.count), cx + cardW / 2, y + 16, { align: "center" });

    doc.setTextColor(...GRAY);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, cx + cardW / 2, y + 28, { align: "center" });
  });

  y += 44;

  // ═══════════════════════════════════
  // SECTIONS
  // ═══════════════════════════════════
  function renderSection(items, label, accentColor, icon) {
    if (items.length === 0) return;

    y = checkPage(y, 50 + items.length * 30);

    doc.setFillColor(...accentColor);
    doc.rect(margin, y, 4, 18, "F");

    doc.setTextColor(...NAVY);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`${icon} ${label} (${items.length})`, margin + 12, y + 12);

    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 22, pageW - margin, y + 22);

    y += 30;

    items.forEach((s, idx) => {
      y = checkPage(y, 40);

      const titleLines = doc.splitTextToSize(s.titre, contentW - 24);
      const titleH = titleLines.length * 5;
      const contentMax = s.contenu.length > 150 ? s.contenu.substring(0, 150) + "..." : s.contenu;
      const contentLines = doc.splitTextToSize(contentMax, contentW - 24);
      const contentH = contentLines.length * 4;
      const auteur = s.anonyme ? "Anonyme" : `${s.prenom} ${s.nom}`;

      let cardH = 14 + titleH + 4 + contentH + 12;

      if (s.justification) {
        const justLines = doc.splitTextToSize(s.justification, contentW - 40);
        const justBoxH = 18 + justLines.length * 4;
        cardH += justBoxH + 4;
      }

      // Card shadow
      doc.setFillColor(232, 235, 242);
      doc.roundedRect(margin + 0.8, y + 0.8, contentW, cardH, 5, 5, "F");

      // Card body
      doc.setFillColor(...WHITE);
      doc.setDrawColor(215, 220, 230);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, contentW, cardH, 5, 5, "FD");

      // Left accent stripe
      doc.setFillColor(...accentColor);
      doc.roundedRect(margin + 1, y + 3, 3, cardH - 6, 1.5, 1.5, "F");

      // Gold number badge
      doc.setFillColor(...GOLD);
      doc.circle(margin + contentW - 10, y + 10, 4, "F");
      doc.setTextColor(...WHITE);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(String(idx + 1), margin + contentW - 10, y + 11.5, { align: "center" });

      // Title
      doc.setTextColor(...NAVY);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(titleLines, margin + 12, y + 10);

      // Content
      doc.setTextColor(80, 90, 110);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(contentLines, margin + 12, y + 10 + titleH + 4);

      // Author
      const authorY = y + 10 + titleH + 4 + contentH + 4;
      doc.setFillColor(245, 246, 250);
      doc.roundedRect(margin + 10, authorY, contentW - 20, 10, 3, 3, "F");
      doc.setTextColor(...LIGHT_GRAY);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.text(`Propos\xe9 par ${auteur}`, margin + 16, authorY + 7);

      y = authorY + 14;

      // Justification
      if (s.justification) {
        y = checkPage(y, 30);
        const justLines = doc.splitTextToSize(s.justification, contentW - 40);
        const justH = 16 + justLines.length * 4;

        doc.setFillColor(254, 245, 245);
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.4);
        doc.roundedRect(margin + 10, y, contentW - 20, justH, 4, 4, "FD");

        doc.setFillColor(...RED);
        doc.rect(margin + 10, y, 3, justH, "F");

        doc.setTextColor(...RED);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text("Justification du BDE :", margin + 20, y + 7);

        doc.setTextColor(160, 50, 50);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text(justLines, margin + 20, y + 13);

        y += justH + 6;
      }

      y += 4;
    });

    y += 6;
  }

  renderSection(acceptes, "Suggestions acceptees", GREEN, "1.");
  renderSection(aDiscuter, "A approfondir", AMBER, "2.");
  renderSection(refuses, "Suggestions refusees", RED, "3.");

  // ── FOOTER ON ALL PAGES ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    addFooter(i, totalPages);
  }

  return doc;
}

module.exports = { generateSuggestionReport };
