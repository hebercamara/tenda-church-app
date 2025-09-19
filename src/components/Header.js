import React from 'react';
import { LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Header = ({ onLogout, onMenuClick }) => {
  const { currentUserData } = useAuthStore();

  return (
    <header className="bg-[#991B1B] px-3 sm:px-4 py-2 sm:py-4 shadow-lg flex items-center justify-between z-10">
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
          <button onClick={onMenuClick} className="text-white p-1.5 sm:p-2 rounded-md hover:bg-white/20 flex-shrink-0">
              <Menu size={20} className="sm:w-6 sm:h-6" />
          </button>
          <img
              src="/logo192.png"
              onError={(e) => { 
                if (e.target.src.includes('logo192.png')) {
                  e.target.src = 'https://firebasestorage.googleapis.com/v0/b/tenda-church-app.firebasestorage.app/o/LOGO%20TENDA%20BRANCO.png?alt=media&token=ed7c6ad0-de20-46a3-bb4c-552934e3d3ca';
                } else {
                  e.target.onerror = null; 
                  e.target.src = 'https://placehold.co/200x50/991B1B/FFFFFF?text=Logo+Tenda+Church';
                }
              }}
              alt="Logo Tenda Church"
              className="h-8 sm:h-10 flex-shrink-0"
          />
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
          {currentUserData?.name && (
            <span className="text-white font-semibold hidden sm:block text-sm sm:text-base max-w-[120px] truncate">
              Olá, {currentUserData.name}
            </span>
          )}
          <button
              onClick={onLogout}
              className="bg-white/20 hover:bg-white/30 text-white font-semibold py-1.5 sm:py-2 px-2 sm:px-4 rounded-lg flex items-center space-x-1 sm:space-x-2 transition-all text-sm sm:text-base">
              <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
    </header>
  );
};

export default Header;