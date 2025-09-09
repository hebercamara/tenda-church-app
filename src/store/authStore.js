import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  // Estado inicial
  user: null,
  isAdmin: false,
  currentUserData: null,
  
  // Ação para atualizar o estado
  setAuthData: (authData) => set({
    user: authData.user,
    isAdmin: authData.isAdmin,
    currentUserData: authData.currentUserData
  }),

  // Ação para limpar o estado no logout
  clearAuthData: () => set({
    user: null,
    isAdmin: false,
    currentUserData: null
  })
}));