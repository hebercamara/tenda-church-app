import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getTenantId } from "../../utils/tenantUtils";
import { Plus, Edit3, Trash2, ToggleLeft, ToggleRight, X, Save, Layers, Baby } from "lucide-react";
import { Link } from "react-router-dom";

const emptyRoom = { name: "", minAge: 0, maxAge: 60, isDefault: true, isActive: true };

export default function KidsSalasPage() {
  const [rooms, setRooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyRoom);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const tenantId = getTenantId();

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, `artifacts/${tenantId}/public/data/kids_rooms`),
      (snap) => {
        const rs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rs.sort((a, b) => a.minAge - b.minAge);
        setRooms(rs);
      }
    );
    return () => unsub();
  }, [tenantId]);

  const openCreate = () => { setEditing(null); setForm(emptyRoom); setShowForm(true); setError(""); };
  const openEdit = (r) => { setEditing(r); setForm({ name: r.name, minAge: r.minAge, maxAge: r.maxAge, isDefault: r.isDefault, isActive: r.isActive }); setShowForm(true); setError(""); };

  const monthLabel = (months) => {
    if (months < 24) return `${months} ${months === 1 ? "mes" : "meses"}`;
    return `${Math.floor(months / 12)} ${Math.floor(months / 12) === 1 ? "ano" : "anos"}`;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Nome da sala e obrigatorio."); return; }
    if (Number(form.minAge) > Number(form.maxAge)) { setError("Idade minima nao pode ser maior que a maxima."); return; }
    setSaving(true); setError("");
    try {
      const data = { name: form.name.trim(), minAge: Number(form.minAge), maxAge: Number(form.maxAge), isDefault: form.isDefault, isActive: form.isActive, updatedAt: new Date().toISOString() };
      if (editing) {
        await updateDoc(doc(db, `artifacts/${tenantId}/public/data/kids_rooms`, editing.id), data);
      } else {
        await addDoc(collection(db, `artifacts/${tenantId}/public/data/kids_rooms`), { ...data, createdAt: new Date().toISOString(), tenantId });
      }
      setShowForm(false);
    } catch (err) { setError("Erro ao salvar: " + err.message); }
    setSaving(false);
  };

  const handleToggle = async (room) => {
    await updateDoc(doc(db, `artifacts/${tenantId}/public/data/kids_rooms`, room.id), { isActive: !room.isActive });
  };

  const handleDelete = async (room) => {
    if (!window.confirm(`Excluir a sala "${room.name}"? Checkins existentes manterao o registro mas a sala nao aparecera mais.`)) return;
    await deleteDoc(doc(db, `artifacts/${tenantId}/public/data/kids_rooms`, room.id));
  };

  return (
    <div className="kids-min-h-screen kids-bg">
      <div className="kids-header">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/kids/supervisor" className="text-white/80 hover:text-white"><X size={20} /></Link>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2"><Layers size={20} /> Gerenciar Salas</h1>
          </div>
          <button onClick={openCreate} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl"><Plus size={20} /></button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {rooms.length === 0 ? (
          <div className="kids-card text-center py-12">
            <Layers size={40} className="mx-auto text-kids-primary/30 mb-3" />
            <p className="text-gray-500">Nenhuma sala cadastrada ainda.</p>
          </div>
        ) : rooms.map((room) => (
          <div key={room.id} className={`kids-card flex items-center justify-between border-l-4 ${room.isActive ? "border-l-kids-green" : "border-l-gray-200 opacity-60"}`}>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-gray-800">{room.name}</p>
                {room.isDefault && <span className="text-xs bg-kids-primary/10 text-kids-primary px-2 py-0.5 rounded-full font-semibold">Automatica</span>}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {room.isDefault ? `Faixa etaria: ${monthLabel(room.minAge)} a ${monthLabel(room.maxAge)}` : "Sala extra / manual"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => openEdit(room)} className="p-2 text-kids-primary hover:bg-kids-primary/10 rounded-lg"><Edit3 size={18} /></button>
              <button onClick={() => handleToggle(room)} className={`p-2 rounded-lg ${room.isActive ? "text-kids-green hover:bg-kids-green/10" : "text-gray-400 hover:bg-gray-100"}`}>
                {room.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
              </button>
              <button onClick={() => handleDelete(room)} className="p-2 text-kids-accent hover:bg-kids-accent/10 rounded-lg"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Sugestoes padrao */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Salas Sugeridas (clique para criar)</p>
        <div className="flex flex-wrap gap-2">
          {[
            { name: "Bercario", minAge: 0, maxAge: 23 },
            { name: "Maternal", minAge: 24, maxAge: 35 },
            { name: "Jardim", minAge: 36, maxAge: 59 },
            { name: "Primarios", minAge: 60, maxAge: 83 },
            { name: "Juniores", minAge: 84, maxAge: 131 },
          ].map((s) => (
            <button key={s.name} onClick={() => { setForm({ ...s, isDefault: true, isActive: true }); setEditing(null); setShowForm(true); setError(""); }}
              className="text-sm bg-white border-2 border-kids-primary/20 hover:border-kids-primary text-kids-primary font-semibold px-3 py-1.5 rounded-xl transition-all">
              + {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="kids-card w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-gray-800">{editing ? "Editar Sala" : "Nova Sala"}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome da Sala *</label>
                <input className="kids-input" placeholder="Ex: Bercario, Juniores..." required
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Idade Minima (meses)</label>
                  <input className="kids-input" type="number" min="0"
                    value={form.minAge} onChange={(e) => setForm({ ...form, minAge: e.target.value })} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Idade Maxima (meses)</label>
                  <input className="kids-input" type="number" min="0"
                    value={form.maxAge} onChange={(e) => setForm({ ...form, maxAge: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="w-4 h-4 accent-kids-primary" />
                  <span className="text-sm font-semibold text-gray-700">Sala automatica por idade</span>
                </label>
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
              <button type="submit" disabled={saving} className="kids-btn-primary w-full flex items-center justify-center gap-2">
                <Save size={18} /> {saving ? "Salvando..." : "Salvar Sala"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
