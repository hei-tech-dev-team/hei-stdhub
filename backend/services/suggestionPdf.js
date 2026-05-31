const { jsPDF } = require("jspdf");

const NAVY = [0, 25, 72];
const NAVY_DARK = [10, 26, 51];
const GOLD = [223, 164, 8];
const GOLD_LIGHT = [242, 201, 76];
const WHITE = [255, 255, 255];
const GREEN = [16, 185, 129];
const AMBER = [245, 158, 11];
const RED = [239, 68, 68];
const GRAY = [100, 116, 139];
const LIGHT_GRAY = [148, 163, 184];
const SURFACE = [242, 244, 248];

function generateSuggestionReport(suggestions) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  const dateFr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const year = new Date().getFullYear();

  const acceptes = suggestions.filter((s) => s.statut === "accepte");
  const aDiscuter = suggestions.filter((s) => s.statut === "a_discuter");
  const refuses = suggestions.filter((s) => s.statut === "refuse");
  const total = suggestions.length;

  function addPageBg(pageNum) {
    doc.setPage(pageNum);
    doc.setFillColor(...SURFACE);
    doc.rect(0, 0, pageW, pageH, "F");
  }

  function addFooter(pageNum, totalPages) {
    doc.setPage(pageNum);
    doc.setFillColor(...NAVY);
    doc.rect(0, pageH - 12, pageW, 12, "F");
    doc.setTextColor(180, 190, 210);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("HEI STDhub — Bureau Des Etudiants", margin, pageH - 4);
    doc.text(`Page ${pageNum}/${totalPages}`, pageW - margin, pageH - 4, { align: "right" });
    doc.setFillColor(...GOLD);
    for (let i = 0; i < 4; i++) {
      doc.circle(pageW - margin - 8, pageH - 8 + i * 3, 0.8, "F");
    }
  }

  function checkPage(y, needed) {
    if (y + (needed || 30) > pageH - 25) {
      doc.addPage();
      addPageBg(doc.internal.getNumberOfPages());
      return margin + 15;
    }
    return y;
  }

  let y = margin + 10;

  // ═══════════════════════════════════
  // HEADER - Inspired by annual report design
  // ═══════════════════════════════════
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 65, "F");

  doc.setFillColor(...GOLD);
  doc.triangle(pageW * 0.55, 0, pageW, 0, pageW, 40, "F");

  doc.setFillColor(...GOLD_LIGHT);
  doc.triangle(pageW * 0.65, 0, pageW, 0, pageW, 25, "F");

  doc.setFillColor(...WHITE);
  doc.circle(margin + 5, 14, 4, "F");
  doc.setFillColor(...GOLD);
  doc.circle(margin + 5, 14, 2.5, "F");

  doc.setTextColor(...GOLD);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("HEI STDHUB", margin + 12, 16);

  doc.setTextColor(...WHITE);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport BDE", margin, 34);

  doc.setFontSize(14);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text(String(year), margin, 46);

  doc.setFontSize(8);
  doc.setTextColor(180, 200, 230);
  doc.text("Bureau Des Etudiants", margin, 54);

  doc.setFontSize(7);
  doc.setTextColor(160, 180, 210);
  doc.text(dateFr, pageW - margin, 14, { align: "right" });
  doc.text(`Ref: BDE-${year}`, pageW - margin, 24, { align: "right" });

  for (let i = 0; i < 4; i++) {
    doc.setFillColor(...GOLD);
    doc.circle(pageW - margin - 8, 38 + i * 4, 1, "F");
  }

  y = 75;

  // ═══════════════════════════════════
  // INTRO SECTION
  // ═══════════════════════════════════
  doc.setFillColor(...WHITE);
  doc.setDrawColor(225, 230, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 35, 3, 3, "FD");

  doc.setFillColor(...GOLD);
  doc.rect(margin, y, 3, 35, "F");

  doc.setTextColor(...NAVY);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Synthese des suggestions", margin + 10, y + 10);

  doc.setTextColor(...GRAY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const introText = "Ce rapport presente l'ensemble des suggestions recues par le Bureau Des Etudiants. Chaque suggestion a ete examinee et classee selon son statut.";
  const introLines = doc.splitTextToSize(introText, contentW - 25);
  doc.text(introLines, margin + 10, y + 18);

  y += 42;

  // ═══════════════════════════════════
  // SUMMARY CARDS
  // ═══════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("STATISTIQUES — SUM", margin, y);
  y += 2;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 30, y);
  y += 8;

  const summaryItems = [
    { label: "Acceptees", count: acceptes.length, color: GREEN, icon: "+" },
    { label: "A discuter", count: aDiscuter.length, color: AMBER, icon: "~" },
    { label: "Refusees", count: refuses.length, color: RED, icon: "-" },
    { label: "Total", count: total, color: NAVY, icon: "=" },
  ];

  const cardW = (contentW - 15) / 4;
  const cardH = 30;

  summaryItems.forEach((item, i) => {
    const cx = margin + i * (cardW + 5);

    doc.setFillColor(...WHITE);
    doc.setDrawColor(...item.color);
    doc.setLineWidth(0.8);
    doc.roundedRect(cx, y, cardW, cardH, 3, 3, "FD");

    doc.setFillColor(...item.color);
    doc.roundedRect(cx, y, cardW, 4, 3, 3, "F");
    doc.rect(cx, y + 2, cardW, 4, "F");

    doc.setTextColor(...item.color);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(String(item.count), cx + cardW / 2, y + 18, { align: "center" });

    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, cx + cardW / 2, y + 26, { align: "center" });
  });

  y += cardH + 12;

  // ═══════════════════════════════════
  // SECTIONS
  // ═══════════════════════════════════
  function renderSection(items, label, accentColor, number) {
    if (items.length === 0) return;

    y = checkPage(y, 50 + items.length * 30);

    doc.setFillColor(...accentColor);
    doc.circle(margin + 6, y + 7, 6, "F");

    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(String(number), margin + 6, y + 9, { align: "center" });

    doc.setTextColor(...NAVY);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${label} (${items.length})`, margin + 18, y + 10);

    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 16, pageW - margin, y + 16);

    y += 24;

    items.forEach((s) => {
      y = checkPage(y, 38);

      const titleLines = doc.splitTextToSize(s.titre, contentW - 25);
      const titleH = titleLines.length * 4.5;
      const contentMax = s.contenu.length > 140 ? s.contenu.substring(0, 140) + "..." : s.contenu;
      const contentLines = doc.splitTextToSize(contentMax, contentW - 25);
      const contentH = contentLines.length * 3.8;
      const auteur = s.anonyme ? "Anonyme" : `${s.prenom} ${s.nom}`;

      let cardH = 14 + titleH + 3 + contentH + 12;

      if (s.justification) {
        const justLines = doc.splitTextToSize(s.justification, contentW - 40);
        const justBoxH = 18 + justLines.length * 3.8;
        cardH += justBoxH + 5;
      }

      doc.setFillColor(...WHITE);
      doc.setDrawColor(225, 230, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentW, cardH, 3, 3, "FD");

      doc.setFillColor(...accentColor);
      doc.roundedRect(margin + 1, y + 4, 3, cardH - 8, 1.5, 1.5, "F");

      doc.setTextColor(...NAVY);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.text(titleLines, margin + 12, y + 10);

      doc.setTextColor(...GRAY);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(contentLines, margin + 12, y + 10 + titleH + 3);

      const authorY = y + 10 + titleH + 3 + contentH + 3;
      doc.setFillColor(...SURFACE);
      doc.roundedRect(margin + 10, authorY, contentW - 20, 9, 2, 2, "F");
      doc.setTextColor(...LIGHT_GRAY);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "italic");
      doc.text(`Par ${auteur}`, margin + 15, authorY + 6);

      doc.setFillColor(...accentColor);
      doc.circle(margin + 13, authorY + 4.5, 2.5, "F");
      doc.setTextColor(...WHITE);
      doc.setFontSize(5);
      doc.setFont("helvetica", "bold");
      doc.text(s.anonyme ? "?" : `${s.prenom?.[0] || ""}${s.nom?.[0] || ""}`, margin + 13, authorY + 6, { align: "center" });

      y = authorY + 13;

      if (s.justification) {
        y = checkPage(y, 30);
        const justLines = doc.splitTextToSize(s.justification, contentW - 40);
        const justH = 16 + justLines.length * 3.8;

        doc.setFillColor(254, 247, 247);
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin + 10, y, contentW - 20, justH, 3, 3, "FD");

        doc.setFillColor(...RED);
        doc.rect(margin + 10, y + 2, 2, justH - 4, "F");

        doc.setTextColor(...RED);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.text("Justification du BDE :", margin + 18, y + 7);

        doc.setTextColor(140, 60, 60);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(justLines, margin + 18, y + 13);

        y += justH + 6;
      }

      y += 4;
    });

    y += 6;
  }

  renderSection(acceptes, "Suggestions acceptees", GREEN, 1);
  renderSection(aDiscuter, "Suggestions a approfondir", AMBER, 2);
  renderSection(refuses, "Suggestions refusees", RED, 3);

  // ═══════════════════════════════════
  // BOTTOM CONTACT SECTION
  // ═══════════════════════════════════
  y = checkPage(y, 45);

  doc.setFillColor(...NAVY);
  doc.roundedRect(margin, y, contentW, 35, 4, 4, "F");

  doc.setFillColor(...GOLD);
  doc.roundedRect(margin, y, contentW, 3, 4, 4, "F");
  doc.rect(margin, y + 1, contentW, 4, "F");

  doc.setTextColor(...GOLD_LIGHT);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Bureau Des Etudiants - HEI", margin + 10, y + 12);

  doc.setTextColor(180, 200, 230);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("HEI - Hautes Etudes d'Ingenieur", margin + 10, y + 20);
  doc.text("Lille, France", margin + 10, y + 26);

  doc.setTextColor(...GOLD);
  doc.setFontSize(7);
  doc.text(`Genere le ${dateFr}`, pageW - margin, y + 12, { align: "right" });
  doc.text("www.hei.fr", pageW - margin, y + 20, { align: "right" });

  for (let i = 0; i < 4; i++) {
    doc.setFillColor(...GOLD);
    doc.circle(margin + 6, y + 10 + i * 5, 0.8, "F");
  }

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    addFooter(i, totalPages);
  }

  return doc;
}

module.exports = { generateSuggestionReport };
