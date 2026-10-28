import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layers, CalendarDays, Users, BarChart3, ChevronRight, Baby, Shield, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { useKidsStore } from "../store/kidsStore";
import { useAuthStore } from "../../store/authStore";

export default function KidsSupervisorPage() {
  const { kidsRole, clearGuardian, setKidsRole } = useKidsStore();
  const { isAdmin, isSuperAdmin } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    clearGuardian();
    setKidsRole(null);
    navigate("/kids/login");
  };

  const cards = [
    { icon: <Layers size={28} />, label: "Gerenciar Salas", desc: "Criar, editar e organizar as salas do ministerio", to: "/kids/supervisor/salas", color: "from-kids-primary to-purple-500" },
    { icon: <CalendarDays size={28} />, label: "Agenda de Cultos", desc: "Criar cultos com recorrencia automatica", to: "/kids/supervisor/agenda", color: "from-kids-green to-teal-500" },
    { icon: <Users size={28} />, label: "Equipe", desc: "Gerenciar monitores e supervisores", to: "/kids/supervisor/equipe", color: "from-orange-400 to-kids-accent" },
    { icon: <BarChart3 size={28} />, label: "Relatorios", desc: "Historico de presencas e check-ins", to: "/kids/supervisor/relatorios", color: "from-blue-500 to-indigo-500" },
  ];

  const hasMainAppAccess = isAdmin || isSuperAdmin || kidsRole === "admin";

  return (
    <div className="kids-min-h-screen kids-bg">
      <div className="kids-header">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-white/70 text-xs uppercase tracking-wider mb-1">Ministerio Infantil</p>
              <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
                <Shield size={24} /> Supervisao
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link to="/kids/monitor" className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-xl text-sm font-bold transition-colors">
                Modo Monitor
              </Link>
              <Link to="/kids/painel" className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-xl text-sm font-bold transition-colors">
                Área Pais
              </Link>
              {hasMainAppAccess && (
                <Link to="/dashboard" className="bg-white text-kids-primary hover:bg-white/90 px-3 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm">
                  App Principal
                </Link>
              )}
              <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-colors" title="Sair do Kids">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <Link key={card.to} to={card.to}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden border border-gray-100">
              <div className={`bg-gradient-to-r ${card.color} p-4 flex items-center justify-between`}>
                <div className="text-white">{card.icon}</div>
                <ChevronRight size={20} className="text-white/70 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="p-4">
                <p className="font-extrabold text-gray-800">{card.label}</p>
                <p className="text-sm text-gray-500 mt-0.5">{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {(isAdmin || isSuperAdmin) && (
          <div className="mt-6 kids-card border-l-4 border-l-kids-primary">
            <p className="font-bold text-gray-700 text-sm flex items-center gap-2">
              <Shield size={16} className="text-kids-primary" /> Acesso de Administrador
            </p>
            <p className="text-xs text-gray-500 mt-1">Voce tem acesso completo ao modulo como administrador da igreja.</p>
          </div>
        )}
      </div>
    </div>
  );
}
