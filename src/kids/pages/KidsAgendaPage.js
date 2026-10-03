import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getTenantId } from "../../utils/tenantUtils";
import { generateRecurringEvents, getRecurrenceLabel } from "../utils/kidsRecurrenceUtils";
import { Plus, Edit3, Trash2, CalendarDays, X, Save, RefreshCw, MapPin, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const emptyForm = {
  title: "",
  date: "",
  time: "19:00",
  checkinOpenMinutes: 30,
  locationLat: "",
  locationLng: "",
  locationRadiusMeters: 1000,
  recurrenceEnabled: false,
  recurrenceDays: [],
  recurrenceEndsOn: "",
};

export default function KidsAgendaPage() {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [gettingGeo, setGettingGeo] = useState(false);
  const tenantId = getTenantId();

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, `artifacts/${tenantId}/public/data/kids_events`),
      (snap) => {
        const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        evs.sort((a, b) => {
          const getDate = (e) => e.startTime?.toDate ? e.startTime.toDate() : new Date(e.startTime);
          return getDate(a) - getDate(b);
        });
        setEvents(evs);
      }
    );
    return () => unsub();
  }, [tenantId]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); setError(""); };

  const openEdit = (ev) => {
    const startTime = ev.startTime?.toDate ? ev.startTime.toDate() : new Date(ev.startTime);
    const dateStr = startTime.toISOString().slice(0, 10);
    const timeStr = `${String(startTime.getHours()).padStart(2, "0")}:${String(startTime.getMinutes()).padStart(2, "0")}`;
    setEditing(ev);
    setForm({
      title: ev.title,
      date: dateStr,
      time: timeStr,
      checkinOpenMinutes: ev.checkinOpenMinutes || 30,
      locationLat: ev.locationLat || "",
      locationLng: ev.locationLng || "",
      locationRadiusMeters: ev.locationRadiusMeters || 1000,
      recurrenceEnabled: ev.recurrence?.enabled || false,
      recurrenceDays: ev.recurrence?.daysOfWeek || [],
      recurrenceEndsOn: ev.recurrence?.endsOn || "",
    });
    setShowForm(true); setError("");
  };

  const handleGetGeo = async () => {
    setGettingGeo(true);
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
      setForm((f) => ({ ...f, locationLat: pos.coords.latitude.toFixed(6), locationLng: pos.coords.longitude.toFixed(6) }));
    } catch { setError("Nao foi possivel obter localizacao automaticamente."); }
    setGettingGeo(false);
  };

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      recurrenceDays: f.recurrenceDays.includes(day) ? f.recurrenceDays.filter((d) => d !== day) : [...f.recurrenceDays, day],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Titulo e obrigatorio."); return; }
    if (!form.date || !form.time) { setError("Data e horario sao obrigatorios."); return; }
    if (form.recurrenceEnabled && form.recurrenceDays.length === 0) { setError("Selecione pelo menos um dia para recorrencia."); return; }
    setSaving(true); setError("");
    try {
      const [y, m, d] = form.date.split("-").map(Number);
      const [h, min] = form.time.split(":").map(Number);
      const startTime = new Date(y, m - 1, d, h, min, 0, 0);
      const baseId = `culto-${form.title.toLowerCase().replace(/\s+/g, "-")}-${form.date}`;

      const baseEvent = {
        title: form.title.trim(),
        startTime: startTime.toISOString(),
        checkinOpenMinutes: Number(form.checkinOpenMinutes),
        locationLat: form.locationLat ? Number(form.locationLat) : null,
        locationLng: form.locationLng ? Number(form.locationLng) : null,
        locationRadiusMeters: Number(form.locationRadiusMeters),
        status: "scheduled",
        recurrence: form.recurrenceEnabled ? {
          enabled: true,
          rule: "weekly",
          daysOfWeek: form.recurrenceDays,
          time: form.time,
          endsOn: form.recurrenceEndsOn || null,
        } : { enabled: false },
        tenantId,
        updatedAt: new Date().toISOString(),
      };

      if (editing) {
        await updateDoc(doc(db, `artifacts/${tenantId}/public/data/kids_events`, editing.id), baseEvent);
      } else {
        if (form.recurrenceEnabled) {
          const instances = generateRecurringEvents({ ...baseEvent, id: baseId });
          const batch = writeBatch(db);
          instances.forEach((instance) => {
            const ref = doc(db, `artifacts/${tenantId}/public/data/kids_events`, instance.id);
            batch.set(ref, { ...instance, createdAt: new Date().toISOString() });
          });
          await batch.commit();
        } else {
          await addDoc(collection(db, `artifacts/${tenantId}/public/data/kids_events`), {
            ...baseEvent,
            id: baseId,
            createdAt: new Date().toISOString(),
          });
        }
      }
      setShowForm(false);
    } catch (err) { setError("Erro ao salvar: " + err.message); }
    setSaving(false);
  };

  const handleDelete = async (ev) => {
    if (!window.confirm(`Excluir o evento "${ev.title}"?`)) return;
    await deleteDoc(doc(db, `artifacts/${tenantId}/public/data/kids_events`, ev.id));
  };

  const handleChangeStatus = async (ev, status) => {
    await updateDoc(doc(db, `artifacts/${tenantId}/public/data/kids_events`, ev.id), { status });
  };

  const getEventDate = (ev) => ev.startTime?.toDate ? ev.startTime.toDate() : new Date(ev.startTime);

  const statusColor = { scheduled: "bg-gray-100 text-gray-500", open: "bg-kids-green/20 text-teal-700", closed: "bg-red-100 text-red-500" };
  const statusLabel = { scheduled: "Agendado", open: "Aberto", closed: "Encerrado" };

  return (
    <div className="kids-min-h-screen kids-bg">
      <div className="kids-header">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/kids/supervisor" className="text-white/80 hover:text-white"><X size={20} /></Link>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2"><CalendarDays size={20} /> Agenda de Cultos</h1>
          </div>
          <button onClick={openCreate} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl"><Plus size={20} /></button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {events.length === 0 ? (
          <div className="kids-card text-center py-12">
            <CalendarDays size={40} className="mx-auto text-kids-primary/30 mb-3" />
            <p className="text-gray-500">Nenhum culto agendado ainda.</p>
          </div>
        ) : events.map((ev) => {
          const evDate = getEventDate(ev);
          return (
            <div key={ev.id} className={`kids-card border-l-4 ${ev.status === "open" ? "border-l-kids-green" : ev.status === "closed" ? "border-l-red-400" : "border-l-gray-200"}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-extrabold text-gray-800">{ev.title}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor[ev.status] || statusColor.scheduled}`}>
                      {statusLabel[ev.status] || ev.status}
                    </span>
                    {ev.recurrence?.enabled && (
                      <span className="text-xs bg-kids-primary/10 text-kids-primary px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <RefreshCw size={10} /> Recorrente
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1"><CalendarDays size={12} />
                    {evDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} as {ev.recurrence?.time || evDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {ev.recurrence?.enabled && <p className="text-xs text-gray-400 mt-0.5">{getRecurrenceLabel(ev.recurrence)}</p>}
                  {ev.locationLat && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={10} /> Geolocalizacao configurada (raio {ev.locationRadiusMeters}m)</p>}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {ev.status === "scheduled" && (
                    <button onClick={() => handleChangeStatus(ev, "open")} className="text-xs bg-kids-green/20 text-teal-700 px-2 py-1 rounded-lg font-bold hover:bg-kids-green/40 transition-colors">Abrir</button>
                  )}
                  {ev.status === "open" && (
                    <button onClick={() => handleChangeStatus(ev, "closed")} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-lg font-bold hover:bg-red-200 transition-colors">Fechar</button>
                  )}
                  <button onClick={() => openEdit(ev)} className="p-2 text-kids-primary hover:bg-kids-primary/10 rounded-lg"><Edit3 size={16} /></button>
                  <button onClick={() => handleDelete(ev)} className="p-2 text-kids-accent hover:bg-kids-accent/10 rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto flex justify-center p-4">
          <div className="kids-card w-full max-w-md my-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-gray-800">{editing ? "Editar Culto" : "Novo Culto"}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Titulo *</label>
                <input className="kids-input" placeholder="Ex: Culto Domingo Noite" required
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1"><CalendarDays size={13} className="inline" /> Data *</label>
                  <input className="kids-input" type="date" required
                    value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1"><Clock size={13} className="inline" /> Horario *</label>
                  <input className="kids-input" type="time" required
                    value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Check-in abre (min antes)</label>
                <input className="kids-input" type="number" min="5" max="120"
                  value={form.checkinOpenMinutes} onChange={(e) => setForm({ ...form, checkinOpenMinutes: e.target.value })} />
              </div>

              {/* Geolocalizacao */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700"><MapPin size={13} className="inline" /> Localizacao da Igreja</label>
                  <button type="button" onClick={handleGetGeo} disabled={gettingGeo}
                    className="text-xs text-kids-primary font-bold hover:underline disabled:opacity-50">
                    {gettingGeo ? "Obtendo..." : "Usar GPS atual"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="kids-input text-sm" placeholder="Latitude" type="number" step="any"
                    value={form.locationLat} onChange={(e) => setForm({ ...form, locationLat: e.target.value })} />
                  <input className="kids-input text-sm" placeholder="Longitude" type="number" step="any"
                    value={form.locationLng} onChange={(e) => setForm({ ...form, locationLng: e.target.value })} />
                </div>
                <div className="mt-2">
                  <label className="block text-xs text-gray-500 mb-1">Raio aceito (metros)</label>
                  <input className="kids-input" type="number" min="100" max="5000"
                    value={form.locationRadiusMeters} onChange={(e) => setForm({ ...form, locationRadiusMeters: e.target.value })} />
                </div>
              </div>

              {/* Recorrencia */}
              <div className="border-2 border-dashed border-kids-primary/30 rounded-xl p-4">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={form.recurrenceEnabled} onChange={(e) => setForm({ ...form, recurrenceEnabled: e.target.checked })} className="w-4 h-4 accent-kids-primary" />
                  <span className="font-bold text-gray-700 flex items-center gap-1"><RefreshCw size={14} /> Culto Recorrente (semanal)</span>
                </label>
                {form.recurrenceEnabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-2">Dias da semana:</label>
                      <div className="flex gap-1 flex-wrap">
                        {DAYS.map((day, i) => (
                          <button key={i} type="button" onClick={() => toggleDay(i)}
                            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${form.recurrenceDays.includes(i) ? "bg-kids-primary text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Encerrar recorrencia em (opcional):</label>
                      <input className="kids-input" type="date"
                        value={form.recurrenceEndsOn} onChange={(e) => setForm({ ...form, recurrenceEndsOn: e.target.value })} />
                    </div>
                    <p className="text-xs text-kids-primary bg-kids-primary/5 rounded-lg p-2">
                      Serao criadas instancias para as proximas 8 semanas automaticamente.
                    </p>
                  </div>
                )}
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
              <button type="submit" disabled={saving} className="kids-btn-primary w-full flex items-center justify-center gap-2">
                <Save size={18} /> {saving ? "Salvando..." : (form.recurrenceEnabled && !editing ? "Criar Cultos Recorrentes" : "Salvar")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
