import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getTenantId } from "../../utils/tenantUtils";
import { Plus, Edit3, Trash2, UserCheck, X, Save, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";

const emptyStaff = { name: "", email: "", role: "monitor", assignedRooms: [], isActive: true };

export default function KidsEquipePage() {
  const [staff, setStaff] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyStaff);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const tenantId = getTenantId();

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, `artifacts/${tenantId}/public/data/kids_staff`),
        (snap) => setStaff(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, `artifacts/${tenantId}/public/data/kids_rooms`), where("isActive", "==", true)),
        (snap) => setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach((u) => u());
  }, [tenantId]);

  const openCreate = () => { setEditing(null); setForm(emptyStaff); setShowForm(true); setError(""); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, email: s.email, role: s.role, assignedRooms: s.assignedRooms || [], isActive: s.isActive }); setShowForm(true); setError(""); };

  const toggleRoom = (roomId) => {
    setForm((f) => ({
      ...f,
      assignedRooms: f.assignedRooms.includes(roomId) ? f.assignedRooms.filter((r) => r !== roomId) : [...f.assignedRooms, roomId],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setError("Nome e e-mail sao obrigatorios."); return; }
    setSaving(true); setError("");
    try {
      const data = { name: form.name.trim(), email: form.email.toLowerCase().trim(), role: form.role, assignedRooms: form.assignedRooms, isActive: form.isActive, updatedAt: new Date().toISOString() };
      if (editing) {
        await updateDoc(doc(db, `artifacts/${tenantId}/public/data/kids_staff`, editing.id), data);
      } else {
        await addDoc(collection(db, `artifacts/${tenantId}/public/data/kids_staff`), { ...data, tenantId, createdAt: new Date().toISOString() });
      }
      setShowForm(false);
    } catch (err) { setError("Erro ao salvar: " + err.message); }
    setSaving(false);
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Remover ${s.name} da equipe?`)) return;
    await deleteDoc(doc(db, `artifacts/${tenantId}/public/data/kids_staff`, s.id));
  };

  const roleLabel = { monitor: "Monitor", supervisor: "Supervisor" };
  const roleColor = { monitor: "bg-blue-100 text-blue-700", supervisor: "bg-kids-primary/10 text-kids-primary" };

  return (
    <div className="kids-min-h-screen kids-bg">
      <div className="kids-header">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/kids/supervisor" className="text-white/80 hover:text-white"><X size={20} /></Link>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2"><Users size={20} /> Equipe</h1>
          </div>
          <button onClick={openCreate} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl"><Plus size={20} /></button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {staff.length === 0 ? (
          <div className="kids-card text-center py-12">
            <Users size={40} className="mx-auto text-kids-primary/30 mb-3" />
            <p className="text-gray-500">Nenhum membro da equipe cadastrado.</p>
          </div>
        ) : staff.map((s) => (
          <div key={s.id} className={`kids-card flex items-center justify-between ${!s.isActive ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-kids-primary/10 rounded-full flex items-center justify-center font-bold text-kids-primary">
                {s.name?.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-800">{s.name}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${roleColor[s.role]}`}>{roleLabel[s.role]}</span>
                </div>
                <p className="text-xs text-gray-500">{s.email}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(s)} className="p-2 text-kids-primary hover:bg-kids-primary/10 rounded-lg"><Edit3 size={16} /></button>
              <button onClick={() => handleDelete(s)} className="p-2 text-kids-accent hover:bg-kids-accent/10 rounded-lg"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="kids-card w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-gray-800">{editing ? "Editar Membro" : "Novo Membro da Equipe"}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo *</label>
                <input className="kids-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail *</label>
                <input className="kids-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Funcao</label>
                <div className="flex gap-3">
                  {[["monitor", "Monitor"], ["supervisor", "Supervisor"]].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setForm({ ...form, role: val })}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2 ${form.role === val ? "border-kids-primary bg-kids-primary/10 text-kids-primary" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {rooms.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Salas atribuidas</label>
                  <div className="flex flex-wrap gap-2">
                    {rooms.map((r) => (
                      <button key={r.id} type="button" onClick={() => toggleRoom(r.id)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all border-2 ${form.assignedRooms.includes(r.id) ? "border-kids-primary bg-kids-primary/10 text-kids-primary" : "border-gray-200 text-gray-500"}`}>
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
