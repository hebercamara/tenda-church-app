import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getTenantId } from "../../utils/tenantUtils";
import { useKidsStore } from "../store/kidsStore";
import { getAgeLabel } from "../utils/kidsRoomUtils";
import { Baby, Plus, Edit3, Trash2, ChevronLeft, User2, Calendar, X, Save } from "lucide-react";
import { Link } from "react-router-dom";

const emptyChild = { name: "", dob: "", sex: "M" };

export default function KidsFilhosPage() {
  const { guardian } = useKidsStore();
  const [children, setChildren] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyChild);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!guardian?.id) return;
    const tenantId = getTenantId();
    const unsub = onSnapshot(
      query(collection(db, `artifacts/${tenantId}/public/data/kids_children`),
        where("guardianId", "==", guardian.id)),
      (snap) => setChildren(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [guardian]);

  const openCreate = () => { setEditing(null); setForm(emptyChild); setShowForm(true); setError(""); };
  const openEdit = (child) => { setEditing(child); setForm({ name: child.name, dob: child.dob, sex: child.sex }); setShowForm(true); setError(""); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.dob) { setError("Nome e data de nascimento sao obrigatorios."); return; }
    setSaving(true); setError("");
    const tenantId = getTenantId();
    try {
      if (editing) {
        await updateDoc(doc(db, `artifacts/${tenantId}/public/data/kids_children`, editing.id),
          { name: form.name.trim(), dob: form.dob, sex: form.sex, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, `artifacts/${tenantId}/public/data/kids_children`), {
          name: form.name.trim(), dob: form.dob, sex: form.sex,
          guardianId: guardian.id, tenantId, photoUrl: null,
          allergies: "", observations: "", defaultRoomId: null,
          createdAt: new Date().toISOString(),
        });
      }
      setShowForm(false);
    } catch (err) { setError("Erro ao salvar: " + err.message); }
    setSaving(false);
  };

  const handleDelete = async (child) => {
    if (!window.confirm(`Remover ${child.name}? Esta acao nao pode ser desfeita.`)) return;
    const tenantId = getTenantId();
    await deleteDoc(doc(db, `artifacts/${tenantId}/public/data/kids_children`, child.id));
  };

  return (
    <div className="kids-min-h-screen kids-bg">
      <div className="kids-header">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/kids/painel" className="text-white/80 hover:text-white"><ChevronLeft size={24} /></Link>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2"><Baby size={22} /> Meus Filhos</h1>
          <button onClick={openCreate} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-colors">
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {children.length === 0 ? (
          <div className="kids-card text-center py-12">
            <Baby size={48} className="mx-auto text-kids-primary/30 mb-4" />
            <p className="text-gray-500 font-semibold">Nenhuma crianca cadastrada ainda.</p>
            <p className="text-gray-400 text-sm mt-1">Clique em + para adicionar.</p>
          </div>
        ) : (
          children.map((child) => (
            <div key={child.id} className="kids-card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold ${child.sex === "F" ? "bg-kids-accent" : "bg-kids-primary"}`}>
                  {child.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{child.name}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar size={12} /> {getAgeLabel(child.dob)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(child)} className="p-2 text-kids-primary hover:bg-kids-primary/10 rounded-lg transition-colors"><Edit3 size={18} /></button>
                <button onClick={() => handleDelete(child)} className="p-2 text-kids-accent hover:bg-kids-accent/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>
          ))
        )}

        <button onClick={openCreate} className="kids-btn-primary w-full flex items-center justify-center gap-2">
          <Plus size={18} /> Adicionar Crianca
        </button>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="kids-card w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-gray-800">{editing ? "Editar Crianca" : "Nova Crianca"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1"><User2 size={14} className="inline mr-1" />Nome Completo *</label>
                <input className="kids-input" placeholder="Nome da crianca" required
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1"><Calendar size={14} className="inline mr-1" />Data de Nascimento *</label>
                <input className="kids-input" type="date" required
                  value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sexo *</label>
                <div className="flex gap-3">
                  {[["M", "Menino"], ["F", "Menina"]].map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setForm({ ...form, sex: val })}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2 ${form.sex === val ? "border-kids-primary bg-kids-primary/10 text-kids-primary" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
              <button type="submit" disabled={saving} className="kids-btn-primary w-full flex items-center justify-center gap-2">
                <Save size={18} /> {saving ? "Salvando..." : "Salvar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
