/**
 * Badge coloré selon le type de contenu
 * @param {string} type  – "td" | "examen" | "cours"
 * @param {string} label – texte personnalisé (optionnel)
 */
export default function Badge({ type, label }) {
  const map = {
    td: { cls: "badge-td", txt: "TD" },
    examen: { cls: "badge-examen", txt: "Examen" },
    cours: { cls: "badge-cours", txt: "Cours" },
  };

  const { cls, txt } = map[type] ?? map.cours;

  return <span className={cls}>{label ?? txt}</span>;
}
