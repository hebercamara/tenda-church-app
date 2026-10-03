import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getTenantId } from "../../utils/tenantUtils";
import { BarChart3, Users, Baby, CheckCircle, Clock, X } from "lucide-react";
import { Link } from "react-router-dom";

export default function KidsRelatoriosPage() {
  const [events, setEvents] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("all");
  const tenantId = getTenantId();

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, `artifacts/${tenantId}/public/data/kids_events`),
        (snap) => {
          const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          evs.sort((a, b) => {
            const getDate = (e) => e.startTime?.toDate ? e.startTime.toDate() : new Date(e.startTime);
            return getDate(b) - getDate(a);
          });
          setEvents(evs);
        }),
      onSnapshot(collection(db, `artifacts/${tenantId}/public/data/kids_checkins`),
        (snap) => setCheckins(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach((u) => u());
  }, [tenantId]);

  const filtered = selectedEventId === "all" ? checkins : checkins.filter((c) => c.eventId === selectedEventId);
  const total = filtered.length;
  const checkedIn = filtered.filter((c) => c.status === "checked_in" || c.status === "checked_out").length;
  const pending = filtered.filter((c) => c.status === "pending").length;
  const checkedOut = filtered.filter((c) => c.status === "checked_out").length;

  // Agrupa por sala
  const byRoom = filtered.reduce((acc, c) => {
    const key = c.roomName || "Sem sala";
    if (!acc[key]) acc[key] = 0;
    acc[key]++;
    return acc;
  }, {});

  return (
    <div className="kids-min-h-screen kids-bg">
      <div className="kids-header">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/kids/supervisor" className="text-white/80 hover:text-white"><X size={20} /></Link>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2"><BarChart3 size={20} /> Relatorios</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Filtro de evento */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Filtrar por Culto</label>
          <select className="kids-input" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
            <option value="all">Todos os cultos</option>
            {events.map((ev) => {
              const evDate = ev.startTime?.toDate ? ev.startTime.toDate() : new Date(ev.startTime);
              return <option key={ev.id} value={ev.id}>{ev.title} — {evDate.toLocaleDateString("pt-BR")}</option>;
            })}
          </select>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total de Check-ins", value: total, color: "text-kids-primary", bg: "bg-kids-primary/10", icon: <Baby size={20} /> },
            { label: "Aprovados", value: checkedIn, color: "text-teal-600", bg: "bg-kids-green/10", icon: <CheckCircle size={20} /> },
            { label: "Pendentes", value: pending, color: "text-yellow-600", bg: "bg-kids-yellow/10", icon: <Clock size={20} /> },
            { label: "Check-out Realizado", value: checkedOut, color: "text-gray-500", bg: "bg-gray-100", icon: <Users size={20} /> },
          ].map((s) => (
            <div key={s.label} className={`kids-card ${s.bg}`}>
              <div className={`${s.color} mb-2`}>{s.icon}</div>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Por sala */}
        {Object.keys(byRoom).length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Por Sala</p>
            <div className="space-y-2">
              {Object.entries(byRoom).sort((a, b) => b[1] - a[1]).map(([room, count]) => (
                <div key={room} className="kids-card flex items-center justify-between">
                  <p className="font-bold text-gray-700">{room}</p>
                  <span className="bg-kids-primary/10 text-kids-primary text-sm font-extrabold px-3 py-1 rounded-full">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista recente */}
        {filtered.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Registros Recentes</p>
            <div className="space-y-2">
              {filtered.slice(0, 20).map((c) => (
                <div key={c.id} className="kids-card flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">{c.childName}</p>
                    <p className="text-xs text-gray-500">{c.guardianName} · {c.roomName}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    c.status === "checked_in" ? "bg-kids-green/20 text-teal-700" :
                    c.status === "pending" ? "bg-kids-yellow/20 text-yellow-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {c.status === "checked_in" ? "Na Sala" : c.status === "pending" ? "Pendente" : "Saiu"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
