import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { KidsAuthProvider, useKidsAuth } from "./KidsAuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

// Pages
import KidsLoginPage from "./pages/KidsLoginPage";
import KidsCadastroPage from "./pages/KidsCadastroPage";
import KidsPainelPage from "./pages/KidsPainelPage";
import KidsFilhosPage from "./pages/KidsFilhosPage";
import KidsMonitorPage from "./pages/KidsMonitorPage";
import KidsSupervisorPage from "./pages/KidsSupervisorPage";
import KidsSalasPage from "./pages/KidsSalasPage";
import KidsAgendaPage from "./pages/KidsAgendaPage";
import KidsEquipePage from "./pages/KidsEquipePage";
import KidsRelatoriosPage from "./pages/KidsRelatoriosPage";

function KidsRouterInner() {
  const { loading, kidsRole, kidsUser, guardian } = useKidsAuth();

  if (loading) {
    return (
      <div className="kids-min-h-screen kids-bg flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const isStaff = ["monitor", "supervisor", "admin"].includes(kidsRole);
  const isSupervisorOrAdmin = ["supervisor", "admin"].includes(kidsRole);
  const isGuardian = kidsRole === "guardian" || !!guardian;

  // Determina onde redirecionar quando o usuario esta logado mas sem role kids
  // (membro do app principal que ainda nao fez cadastro no modulo kids)
  const loggedInButNoKidsRole = kidsUser && !kidsRole && !guardian;

  return (
    <Routes>
      {/* Rotas publicas - sempre acessiveis */}
      <Route path="login" element={<KidsLoginPage />} />
      <Route path="cadastro" element={<KidsCadastroPage />} />

      {/* Responsavel */}
      <Route path="painel" element={
        isGuardian ? <KidsPainelPage /> :
        isStaff ? <Navigate to="/kids/supervisor" replace /> :
        <Navigate to="/kids/login" replace />
      } />
      <Route path="filhos" element={
        isGuardian ? <KidsFilhosPage /> :
        isStaff ? <Navigate to="/kids/supervisor" replace /> :
        <Navigate to="/kids/login" replace />
      } />

      {/* Monitor */}
      <Route path="monitor" element={
        isStaff ? <KidsMonitorPage /> : <Navigate to="/kids/login" replace />
      } />

      {/* Supervisor */}
      <Route path="supervisor" element={
        isSupervisorOrAdmin ? <KidsSupervisorPage /> : <Navigate to="/kids/login" replace />
      } />
      <Route path="supervisor/salas" element={
        isSupervisorOrAdmin ? <KidsSalasPage /> : <Navigate to="/kids/login" replace />
      } />
      <Route path="supervisor/agenda" element={
        isSupervisorOrAdmin ? <KidsAgendaPage /> : <Navigate to="/kids/login" replace />
      } />
      <Route path="supervisor/equipe" element={
        isSupervisorOrAdmin ? <KidsEquipePage /> : <Navigate to="/kids/login" replace />
      } />
      <Route path="supervisor/relatorios" element={
        isSupervisorOrAdmin ? <KidsRelatoriosPage /> : <Navigate to="/kids/login" replace />
      } />

      {/* Landing: redireciona baseado no role */}
      <Route path="" element={
        isSupervisorOrAdmin ? <Navigate to="/kids/supervisor" replace /> :
        kidsRole === "monitor" ? <Navigate to="/kids/monitor" replace /> :
        isGuardian ? <Navigate to="/kids/painel" replace /> :
        loggedInButNoKidsRole ? <Navigate to="/kids/cadastro" replace /> :
        <Navigate to="/kids/login" replace />
      } />
      <Route path="*" element={<Navigate to="/kids" replace />} />
    </Routes>
  );
}

export default function KidsApp() {
  return (
    <KidsAuthProvider>
      <Suspense fallback={
        <div className="kids-min-h-screen kids-bg flex items-center justify-center">
          <LoadingSpinner />
        </div>
      }>
        <KidsRouterInner />
      </Suspense>
    </KidsAuthProvider>
  );
}
