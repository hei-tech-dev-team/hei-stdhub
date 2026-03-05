export default function Badge({ type, label }) {
  const map = {
    td: { cls: "badge-td", txt: "TD" },
    examen: { cls: "badge-examen", txt: "Examen" },
    cours: { cls: "badge-cours", txt: "Cours" },
  };

  // Normalise en minuscule pour matcher la map
  const key = type?.toLowerCase();
  const { cls, txt } = map[key] ?? map.cours;

  return <span className={cls}>{label ?? txt}</span>;
}