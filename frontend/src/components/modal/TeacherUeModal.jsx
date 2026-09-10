import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faPlus, faCheck, faSpinner, faBook } from "@fortawesome/free-solid-svg-icons";

export function TeacherUeModal({ teacher, availableUes, onClose, onSave }) {
  const [assignedUes, setAssignedUes] = useState(teacher.ues || []);
  const [selectedUe, setSelectedUe] = useState("");
  const [modalFilterLevel, setModalFilterLevel] = useState("ALL");
  const [saving, setSaving] = useState(false);

  const unassignedUes = availableUes.filter(
    (u) =>
      !assignedUes.includes(u.ue) &&
      (modalFilterLevel === "ALL" || u.level === modalFilterLevel)
  );

  const handleAdd = () => {
    if (!selectedUe) return;
    if (!assignedUes.includes(selectedUe)) {
      setAssignedUes([...assignedUes, selectedUe]);
    }
    setSelectedUe("");
  };

  const handleRemove = (ueToRemove) => {
    setAssignedUes(assignedUes.filter((ue) => ue !== ueToRemove));
  };

  const handleConfirm = async () => {
    setSaving(true);
    await onSave(teacher.id, assignedUes);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal p-6 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <FontAwesomeIcon icon={faBook} />
            </div>
            <div>
              <h3 className="font-bold text-navy text-base">
                UEs de {teacher.prenom} {teacher.nom}
              </h3>
              <p className="text-xs text-gray-400">Gérer les UEs attribués</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-navy transition p-1">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500">
            <span>Ajouter une UE</span>
            <div className="flex gap-1">
              {["ALL", "L1", "L2", "L3"].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setModalFilterLevel(lvl);
                    setSelectedUe("");
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    modalFilterLevel === lvl
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {lvl === "ALL" ? "Tous" : lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedUe}
              onChange={(e) => setSelectedUe(e.target.value)}
              className="input-field flex-1 text-xs"
            >
              <option value="">-- Sélectionner une UE --</option>
              {unassignedUes.map((u) => (
                <option key={u.id} value={u.ue}>
                  {u.ue} ({u.level})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selectedUe}
              className="btn-primary text-xs shrink-0"
            >
              <FontAwesomeIcon icon={faPlus} />
              Ajouter
            </button>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            UEs actuellement assignées ({assignedUes.length})
          </p>
          {assignedUes.length === 0 ? (
            <div className="p-4 bg-surface rounded-xl text-center text-xs text-gray-400">
              Aucune UE assignée à cet enseignant.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
              {assignedUes.map((ue) => (
                <span
                  key={ue}
                  className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-xl"
                >
                  {ue}
                  <button
                    type="button"
                    onClick={() => handleRemove(ue)}
                    className="text-purple-400 hover:text-red-500 transition"
                    title="Retirer cette UE"
                  >
                    <FontAwesomeIcon icon={faTimes} size="xs" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-primary flex-1">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="btn-gold flex-1 justify-center"
          >
            {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCheck} />}
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}