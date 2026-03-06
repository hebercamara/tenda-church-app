import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Home, BookOpen, X, Network, GraduationCap, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Sidebar = ({ isOpen, setIsOpen, allConnects = [], allCourses = [], allMembers = [] }) => {
  const { isAdmin, currentUserData } = useAuthStore();
  const location = useLocation();

  // Determinar perfis do usuário
  const userEmail = currentUserData?.email?.toLowerCase() || '';
  const isLeader = currentUserData && (
    allConnects.some(c => c.leaderId === currentUserData.id) ||
    allConnects.some(c => (c.leaderEmail || '').toLowerCase() === userEmail) ||
    !!currentUserData.isLeader
  );
  const isSupervisor = currentUserData && (
    allConnects.some(c => (c.supervisorEmail || '').toLowerCase() === userEmail) ||
    !!currentUserData.isSupervisor
  );
  const isAuxLeader = currentUserData && (
    // Novo: verifica lista de auxiliares (modelo atual)
    allConnects.some(c => Array.isArray(c.auxLeaders) && c.auxLeaders.some(l => l.id === currentUserData.id || (l.email || '').toLowerCase() === userEmail)) ||
    // Legado: mantém suporte aos campos antigos
    allConnects.some(c => c.auxLeaderId === currentUserData.id) ||
    allConnects.some(c => (c.auxLeaderEmail || '').toLowerCase() === userEmail)
  );

  // Verificar se é professor (titular ou substituto ativo)
  const isTeacher = currentUserData && allCourses.some(course => {
    const email = userEmail;
    // Verificar se é professor titular
    if ((course.teacherEmail || '').toLowerCase() === email) return true;

    // Verificar se é professor substituto ativo
    if (!course.substituteTeacher || !course.substituteTeacher.teacherId) return false;

    const substituteTeacher = allMembers.find(m => m.id === course.substituteTeacher.teacherId);
    if (!substituteTeacher || (substituteTeacher.email || '').toLowerCase() !== email) return false;

    const today = new Date();
    const startDate = new Date(course.substituteTeacher.startDate);

    // Se é indefinido, verifica apenas se já começou
    if (course.substituteTeacher.isIndefinite) {
      return today >= startDate;
    }

    // Se tem data de fim, verifica se está no período
    const endDate = new Date(course.substituteTeacher.endDate);
    return today >= startDate && today <= endDate;
  });

  // Determinar se é membro comum (não tem nenhum perfil especial)
  const isCommonMember = !isAdmin && !isLeader && !isSupervisor && !isTeacher && !isAuxLeader;

  const navItems = [
    // Para membros comuns, mostrar apenas itens básicos
    // Para outros perfis, mostrar todos os itens específicos
    ...(isCommonMember ? [] : [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
      // Membros - Admins veem "Membros"; Líderes/Supervisores veem "Meus Membros"
      ...(isAdmin
        ? [{ id: 'members', label: 'Membros', icon: Users, path: '/membros' }]
        : ((isLeader || isSupervisor || isAuxLeader)
          ? [{ id: 'members', label: 'Meus Membros', icon: Users, path: '/membros' }]
          : []
        )
      ),

      // Connects - Visível para Admins, Líderes, Supervisores e Auxiliares de Connect
      ...((isAdmin || isLeader || isSupervisor || isAuxLeader) ?
        [{ id: 'connects', label: 'Connects', icon: Home, path: '/connects' }] : []),

      // Cursos - Visível para Admins e Professores
      ...((isAdmin || isTeacher) ?
        [{ id: 'courses', label: 'Cursos', icon: BookOpen, path: '/cursos' }] : []),

      // Meus Alunos - Visível para Professores e Líderes
      ...((isTeacher || isLeader) && !isAdmin ? [{ id: 'my-students', label: 'Meus Alunos', icon: GraduationCap, path: '/meus-alunos' }] : []),

      // Hierarquia - Visível para Admins, Líderes e Supervisores
      ...((isAdmin || isLeader || isSupervisor) ? [{ id: 'hierarchy', label: 'Hierarquia', icon: Network, path: '/hierarquia-lideranca' }] : []),
    ]),
  ].filter(Boolean);

  // Item separado para Minha Área - sempre visível para todos os usuários
  const personalAreaItem = { id: 'personal-portal', label: 'Minha Área', icon: User, path: '/portal-pessoal' };
  const PersonalIcon = personalAreaItem.icon;

  return (
    <>
      {/* Overlay para todas as telas */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#991B1B] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs sm:text-sm">
                {isAdmin ? "T" : ((currentUserData?.name || currentUserData?.displayName || "T").charAt(0).toUpperCase())}
              </span>
            </div>
            {(() => {
              const displayName = currentUserData?.name || currentUserData?.displayName || '';
              const firstName = displayName.trim().split(' ')[0] || (isAdmin ? 'Tenda' : 'Usuário');
              return (
                <span className="font-bold text-gray-800 text-sm sm:text-base">{firstName}</span>
              );
            })()}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md hover:bg-gray-100"
          >
            <X size={18} className="sm:w-5 sm:h-5 text-gray-600" />
          </button>
        </div>

        <nav className="mt-4 sm:mt-6 flex flex-col flex-1">
          {/* Itens principais do menu */}
          <div className="flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setIsOpen(false)} // Fecha o sidebar no mobile após selecionar
                  className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-gray-100 transition-colors ${isActive ? 'bg-[#991B1B] text-white hover:bg-[#991B1B]' : 'text-gray-700'
                    }`}
                >
                  <Icon size={18} className="sm:w-5 sm:h-5" />
                  <span className="font-medium text-sm sm:text-base">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Separador e item "Minha Área" no final */}
          <div className="border-t border-gray-200 mt-4 pt-4 mb-4">
            <Link
              to={personalAreaItem.path}
              onClick={() => setIsOpen(false)}
              className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-gray-100 transition-colors ${location.pathname === personalAreaItem.path ? 'bg-[#991B1B] text-white hover:bg-[#991B1B]' : 'text-gray-700'
                }`}
            >
              <PersonalIcon size={18} className="sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">{personalAreaItem.label}</span>
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
