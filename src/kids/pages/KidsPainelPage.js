import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, onSnapshot, addDoc, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getTenantId } from "../../utils/tenantUtils";
import { useKidsStore } from "../store/kidsStore";
import { getRoomForChild, getAgeLabel } from "../utils/kidsRoomUtils";
import { isWithinRadius, getCurrentPosition } from "../utils/kidsGeoUtils";
import { Baby, CheckCircle, Clock, MapPin, Users, ChevronRight, AlertTriangle, Loader } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";

export default function KidsPainelPage() {
  const navigate = useNavigate();
  const { guardian, clearGuardian, setKidsRole } = useKidsStore();
  const [children, setChildren] = useState([]);
  const [events, setEvents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [checkinState, setCheckinState] = useState({}); // { childId: 'idle'|'loading'|'done'|'error' }
  const [geoError, setGeoError] = useState("");
  const tenantId = getTenantId();

  useEffect(() => {
    if (!guardian?.id) { navigate("/kids/login"); return; }
    const now = new Date();
    const unsubs = [
      onSnapshot(
        query(collection(db, `artifacts/${tenantId}/public/data/kids_children`), where("guardianId", "==", guardian.id)),
        (snap) => setChildren(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(
        query(collection(db, `artifacts/${tenantId}/public/data/kids_events`), where("status", "in", ["scheduled", "open"])),
        (snap) => {
          const evs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          evs.sort((a, b) => new Date(a.startTime?.seconds ? a.startTime.toDate() : a.startTime) - new Date(b.startTime?.seconds ? b.startTime.toDate() : b.startTime));
          setEvents(evs);
          if (evs.length > 0) setSelectedEvent(evs[0]);
        }
      ),
      onSnapshot(collection(db, `artifacts/${tenantId}/public/data/kids_rooms`), (snap) =>
        setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(
        query(collection(db, `artifacts/${tenantId}/public/data/kids_checkins`), where("guardianId", "==", guardian.id)),
        (snap) => setCheckins(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [guardian, tenantId, navigate]);

  const getEventStartDate = (ev) => {
    if (!ev) return null;
    if (ev.startTime?.toDate) return ev.startTime.toDate();
    return new Date(ev.startTime);
  };

  const isCheckinWindowOpen = (ev) => {
    if (!ev) return false;
    const start = getEventStartDate(ev);
    if (!start) return false;
    const now = new Date();
    const openAt = new Date(start.getTime() - (ev.checkinOpenMinutes || 30) * 60000);
    const closeAt = new Date(start.getTime() + 60 * 60000);
    return now >= openAt && now <= closeAt;
  };

  const getCheckinStatus = (childId) => {
    if (!selectedEvent) return null;
    return checkins.find((c) => c.childId === childId && c.eventId === selectedEvent.id) || null;
  };

  const handleCheckin = async (child) => {
    if (!selectedEvent) return;
    setGeoError("");
    setCheckinState((s) => ({ ...s, [child.id]: "loading" }));

    try {
      // Geolocalização
      const position = await getCurrentPosition();
      const { latitude: lat, longitude: lng } = position.coords;
      const { locationLat, locationLng, locationRadiusMeters } = selectedEvent;

      const { ok, distanceMeters } = isWithinRadius(lat, lng, locationLat, locationLng, locationRadiusMeters || 1000);
      if (!ok) {
        setGeoError(`Voce esta a ${distanceMeters}m da igreja. O check-in exige estar dentro de ${locationRadiusMeters || 1000}m.`);
        setCheckinState((s) => ({ ...s, [child.id]: "idle" }));
        return;
      }

      // Calcular sala
      const eventDate = getEventStartDate(selectedEvent);
      const room = child.defaultRoomId
        ? rooms.find((r) => r.id === child.defaultRoomId)
        : getRoomForChild(child.dob, eventDate, rooms);

      await addDoc(collection(db, `artifacts/${tenantId}/public/data/kids_checkins`), {
        eventId: selectedEvent.id,
        childId: child.id,
        childName: child.name,
        guardianId: guardian.id,
        guardianName: guardian.name,
        roomId: room?.id || "sem-sala",
        roomName: room?.name || "A definir",
        checkinLat: lat,
        checkinLng: lng,
        distanceMeters,
        status: "pending",
        checkinAt: new Date().toISOString(),
        acceptedAt: null,
        acceptedBy: null,
        checkoutAt: null,
        checkoutBy: null,
        checkoutType: null,
        tenantId,
        createdAt: new Date().toISOString(),
      });
      setCheckinState((s) => ({ ...s, [child.id]: "done" }));
    } catch (err) {
      if (err.code === 1) {
        setGeoError("Permissao de localizacao negada. Habilite o GPS e tente novamente.");
      } else {
        setGeoError("Erro ao obter localizacao: " + err.message);
      }
      setCheckinState((s) => ({ ...s, [child.id]: "idle" }));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    clearGuardian();
    setKidsRole(null);
    navigate("/kids/login");
  };

  const statusBadge = (status) => {
    const map = {
      pending: { label: "Aguardando Aprovacao", color: "bg-kids-yellow/20 text-yellow-700", icon: <Clock size={14} /> },
      checked_in: { label: "Na Sala", color: "bg-kids-green/20 text-teal-700", icon: <CheckCircle size={14} /> },
      checked_out: { label: "Saiu", color: "bg-gray-100 text-gray-500", icon: null },
    };
    return map[status] || map.pending;
  };

  const windowOpen = isCheckinWindowOpen(selectedEvent);

  return (
    <div className="kids-min-h-screen kids-bg">
      {/* Header */}
      <div className="kids-header">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">Ola,</p>
              <h1 className="text-xl font-extrabold text-white">{guardian?.name?.split(" ")[0] || "Responsavel"}</h1>
            </div>
            <div className="flex gap-2">
              <Link to="/kids/filhos" className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-1">
                <Users size={16} /> Filhos
              </Link>
              <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm transition-colors">
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Seletor de Evento */}
        {events.length === 0 ? (
          <div className="kids-card text-center py-8">
            <Clock size={40} className="mx-auto text-kids-primary/30 mb-3" />
            <p className="font-bold text-gray-700">Nenhum culto disponivel</p>
            <p className="text-gray-400 text-sm mt-1">Fique atento aos proximos eventos!</p>
          </div>
        ) : (
          <div className="kids-card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Culto Selecionado</p>
            <div className="space-y-2">
              {events.map((ev) => {
                const evDate = getEventStartDate(ev);
                const isOpen = isCheckinWindowOpen(ev);
                return (
                  <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedEvent?.id === ev.id ? "border-kids-primary bg-kids-primary/5" : "border-gray-100 hover:border-gray-200"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-800">{ev.title}</p>
                        <p className="text-sm text-gray-500">{evDate ? evDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) : ""} as {evDate ? evDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${isOpen ? "bg-kids-green/20 text-teal-700" : "bg-gray-100 text-gray-500"}`}>
                        {isOpen ? "Aberto" : "Aguardando"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Alerta de geo */}
        {geoError && (
          <div className="kids-card border-l-4 border-kids-accent bg-red-50 flex items-start gap-3">
            <AlertTriangle size={20} className="text-kids-accent flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{geoError}</p>
          </div>
        )}

        {/* Janela de check-in fechada */}
        {selectedEvent && !windowOpen && (
          <div className="kids-card border-l-4 border-kids-yellow bg-yellow-50 flex items-start gap-3">
            <Clock size={20} className="text-kids-yellow flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-yellow-800 text-sm">Check-in ainda nao liberado</p>
              <p className="text-yellow-700 text-xs mt-0.5">
                O check-in abre {selectedEvent.checkinOpenMinutes || 30} minutos antes do culto.
              </p>
            </div>
          </div>
        )}

        {/* Cards das criancas */}
        {children.length === 0 ? (
          <div className="kids-card text-center py-8">
            <Baby size={40} className="mx-auto text-kids-primary/30 mb-3" />
            <p className="font-bold text-gray-700">Nenhuma crianca cadastrada</p>
            <Link to="/kids/filhos" className="kids-btn-primary inline-flex items-center gap-2 mt-4">
              <Users size={16} /> Cadastrar Filhos
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Fazer Check-in</p>
            <div className="space-y-3">
              {children.map((child) => {
                const existingCheckin = getCheckinStatus(child.id);
                const state = checkinState[child.id] || "idle";
                const badge = existingCheckin ? statusBadge(existingCheckin.status) : null;
                return (
                  <div key={child.id} className="kids-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold ${child.sex === "F" ? "bg-kids-accent" : "bg-kids-primary"}`}>
                          {child.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{child.name}</p>
                          <p className="text-sm text-gray-500">{getAgeLabel(child.dob)}</p>
                          {existingCheckin && (
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${badge.color}`}>
                              {badge.icon} {badge.label}
                            </span>
                          )}
                          {existingCheckin?.roomName && (
                            <p className="text-xs text-gray-400 mt-0.5">Sala: {existingCheckin.roomName}</p>
                          )}
                        </div>
                      </div>

                      {!existingCheckin ? (
                        <button
                          onClick={() => handleCheckin(child)}
                          disabled={!windowOpen || state === "loading" || !selectedEvent}
                          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${windowOpen && selectedEvent ? "kids-btn-primary" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                        >
                          {state === "loading" ? <><Loader size={16} className="animate-spin" /> GPS...</> : <><MapPin size={16} /> Check-in</>}
                        </button>
                      ) : existingCheckin.status === "checked_out" ? (
                        <span className="text-xs text-gray-400 font-semibold">Concluido</span>
                      ) : (
                        <CheckCircle size={24} className="text-kids-green" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
