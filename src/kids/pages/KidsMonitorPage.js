import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getTenantId } from "../../utils/tenantUtils";
import { useKidsStore } from "../store/kidsStore";
import { CheckCircle, Clock, ArrowLeftRight, LogOut, Users, ChevronDown, AlertTriangle, Baby, X } from "lucide-react";
import { Link } from "react-router-dom";

export default function KidsMonitorPage() {
  const { activeRoomId, setActiveRoomId } = useKidsStore();
  const [rooms, setRooms] = useState([]);
  const [events, setEvents] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [transferModal, setTransferModal] = useState(null); // { checkin }
  const [massModal, setMassModal] = useState(false);
  const [massConfirm, setMassConfirm] = useState("");
  const [processing, setProcessing] = useState(false);
  const tenantId = getTenantId();

  useEffect(() => {
    const unsubs = [
      onSnapshot(
        query(collection(db, `artifacts/${tenantId}/public/data/kids_rooms`), where("isActive", "==", true)),
        (snap) => {
          const rs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setRooms(rs);
          if (!activeRoomId && rs.length > 0) setActiveRoomId(rs[0].id);
        }
      ),
      onSnapshot(
        query(collection(db, `artifacts/${tenantId}/public/data/kids_events`), where("status", "in", ["scheduled", "open"])),
        (snap) => {
          const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          evs.sort((a, b) => {
            const aDate = a.startTime?.toDate ? a.startTime.toDate() : new Date(a.startTime);
            const bDate = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime);
            return aDate - bDate;
          });
          setEvents(evs);
          if (!selectedEventId && evs.length > 0) setSelectedEventId(evs[0].id);
        }
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [tenantId, activeRoomId, setActiveRoomId, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId || !activeRoomId) return;
    const unsub = onSnapshot(
      query(
        collection(db, `artifacts/${tenantId}/public/data/kids_checkins`),
        where("eventId", "==", selectedEventId),
        where("roomId", "==", activeRoomId)
      ),
      (snap) => setCheckins(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [selectedEventId, activeRoomId, tenantId]);

  const pending = checkins.filter((c) => c.status === "pending");
  const checkedIn = checkins.filter((c) => c.status === "checked_in");
  const checkedOut = checkins.filter((c) => c.status === "checked_out");

  const handleAccept = async (checkin) => {
    await updateDoc(doc(db, `artifacts/${tenantId}/public/data/kids_checkins`, checkin.id), {
      status: "checked_in",
      acceptedAt: new Date().toISOString(),
    });
  };

  const handleIndividualCheckout = async (checkin) => {
    await updateDoc(doc(db, `artifacts/${tenantId}/public/data/kids_checkins`, checkin.id), {
      status: "checked_out",
      checkoutAt: new Date().toISOString(),
      checkoutType: "individual",
    });
  };

  const handleTransfer = async (newRoomId) => {
    if (!transferModal) return;
    const room = rooms.find((r) => r.id === newRoomId);
    await updateDoc(doc(db, `artifacts/${tenantId}/public/data/kids_checkins`, transferModal.id), {
      roomId: newRoomId,
      roomName: room?.name || newRoomId,
    });
    setTransferModal(null);
  };

  const handleMassCheckout = async () => {
    if (massConfirm !== "ENCERRAR") return;
    setProcessing(true);
    const batch = writeBatch(db);
    checkedIn.forEach((c) => {
      batch.update(doc(db, `artifacts/${tenantId}/public/data/kids_checkins`, c.id), {
        status: "checked_out",
        checkoutAt: new Date().toISOString(),
        checkoutType: "mass",
      });
    });
    await batch.commit();
    setMassModal(false);
    setMassConfirm("");
    setProcessing(false);
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  const checkinBadge = (status) => {
    const map = {
      pending: "bg-kids-yellow/20 text-yellow-700 border border-yellow-200",
      checked_in: "bg-kids-green/20 text-teal-700 border border-teal-200",
      checked_out: "bg-gray-100 text-gray-400",
    };
    return map[status] || map.pending;
  };

  return (
    <div className="kids-min-h-screen kids-bg">
      {/* Header */}
      <div className="kids-header">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs uppercase tracking-wider">Monitor</p>
              <h1 className="text-xl font-extrabold text-white">{activeRoom?.name || "Selecione uma Sala"}</h1>
            </div>
            <Link to="/kids/supervisor" className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-xl text-sm transition-colors">
              Supervisao
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Seletores */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Culto</label>
            <select className="kids-input text-sm" value={selectedEventId || ""} onChange={(e) => setSelectedEventId(e.target.value)}>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Sala</label>
            <select className="kids-input text-sm" value={activeRoomId || ""} onChange={(e) => setActiveRoomId(e.target.value)}>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Aguardando", count: pending.length, color: "text-yellow-600 bg-kids-yellow/10" },
            { label: "Na Sala", count: checkedIn.length, color: "text-teal-600 bg-kids-green/10" },
            { label: "Saiu", count: checkedOut.length, color: "text-gray-500 bg-gray-100" },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl p-3 text-center ${s.color}`}>
              <p className="text-2xl font-extrabold">{s.count}</p>
              <p className="text-xs font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Pendentes */}
        {pending.length > 0 && (
          <div>
            <p className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-2">? Aguardando Aprovacao ({pending.length})</p>
            <div className="space-y-2">
              {pending.map((c) => (
                <div key={c.id} className="kids-card flex items-center justify-between border-l-4 border-kids-yellow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-kids-yellow/20 rounded-full flex items-center justify-center font-bold text-yellow-700">
                      {c.childName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{c.childName}</p>
                      <p className="text-xs text-gray-500">{c.guardianName}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setTransferModal(c)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Transferir sala">
                      <ArrowLeftRight size={16} />
                    </button>
                    <button onClick={() => handleAccept(c)} className="kids-btn-primary px-3 py-2 text-sm flex items-center gap-1">
                      <CheckCircle size={16} /> Aceitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Na sala */}
        {checkedIn.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-teal-600 uppercase tracking-wider">? Na Sala ({checkedIn.length})</p>
              <button onClick={() => { setMassModal(true); setMassConfirm(""); }}
                className="text-xs text-kids-accent font-bold hover:underline flex items-center gap-1">
                <LogOut size={12} /> Encerrar Sala
              </button>
            </div>
            <div className="space-y-2">
              {checkedIn.map((c) => (
                <div key={c.id} className="kids-card flex items-center justify-between border-l-4 border-kids-green">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-kids-green/20 rounded-full flex items-center justify-center font-bold text-teal-700">
                      {c.childName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{c.childName}</p>
                      <p className="text-xs text-gray-500">{c.guardianName}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setTransferModal(c)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeftRight size={16} /></button>
                    <button onClick={() => handleIndividualCheckout(c)} className="px-3 py-2 rounded-xl text-sm font-bold text-kids-accent border-2 border-kids-accent hover:bg-kids-accent hover:text-white transition-all flex items-center gap-1">
                      <LogOut size={16} /> Liberar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {checkins.length === 0 && (
          <div className="kids-card text-center py-12">
            <Baby size={40} className="mx-auto text-kids-primary/30 mb-3" />
            <p className="text-gray-500">Nenhuma crianca nesta sala ainda.</p>
          </div>
        )}
      </div>

      {/* Modal Transferir */}
      {transferModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="kids-card w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-gray-800">Transferir — {transferModal.childName}</h3>
              <button onClick={() => setTransferModal(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="space-y-2">
              {rooms.filter((r) => r.id !== activeRoomId).map((room) => (
                <button key={room.id} onClick={() => handleTransfer(room.id)}
                  className="w-full text-left p-3 rounded-xl border-2 border-gray-100 hover:border-kids-primary hover:bg-kids-primary/5 transition-all font-semibold text-gray-700">
                  {room.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Encerramento em Massa */}
      {massModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="kids-card w-full max-w-sm">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={32} className="text-kids-accent" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-800">Encerrar Sala?</h3>
              <p className="text-gray-500 text-sm mt-2">Isso fara o check-out de <strong>{checkedIn.length} crianca(s)</strong> de uma vez. Esta acao nao pode ser desfeita.</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Digite <strong>ENCERRAR</strong> para confirmar:</label>
              <input className="kids-input text-center font-bold tracking-widest" placeholder="ENCERRAR"
                value={massConfirm} onChange={(e) => setMassConfirm(e.target.value.toUpperCase())} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setMassModal(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleMassCheckout} disabled={massConfirm !== "ENCERRAR" || processing}
                className="flex-1 py-3 rounded-xl bg-kids-accent text-white font-extrabold disabled:opacity-40 hover:bg-red-500 transition-colors">
                {processing ? "Encerrando..." : "Encerrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
