import React from 'react';
import { LayoutDashboard, Users, Home, BookOpen, UserCog, X, Network } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Sidebar = ({ activePage, setActivePage, isOpen, setIsOpen }) => {
  const { isAdmin } = useAuthStore();
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'members', label: 'Membros', icon: Users },
    { id: 'connects', label: 'Connects', icon: Home },
    { id: 'courses', label: 'Cursos', icon: BookOpen },
    ...(isAdmin ? [{ id: 'hierarchy', label: 'Hierarquia', icon: Network }] : []),
    { id: 'profile', label: 'Meu Perfil', icon: UserCog },
  ].filter(Boolean);

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 md:relative md:translate-x-0 md:shadow-none ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#991B1B] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs sm:text-sm">T</span>
            </div>
            <span className="font-bold text-gray-800 text-sm sm:text-base">Tenda</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <X size={18} className="sm:w-5 sm:h-5 text-gray-600" />
          </button>
        </div>
        
        <nav className="mt-4 sm:mt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setIsOpen(false); // Fecha o sidebar no mobile após selecionar
                }}
                className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-gray-100 transition-colors ${
                  activePage === item.id ? 'bg-[#991B1B] text-white hover:bg-[#991B1B]' : 'text-gray-700'
                }`}
              >
                <Icon size={18} className="sm:w-5 sm:h-5" />
                <span className="font-medium text-sm sm:text-base">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;