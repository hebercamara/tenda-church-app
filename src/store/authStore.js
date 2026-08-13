import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      isAdmin: false,
      isSuperAdmin: false,
      currentUserData: null,
      tenantId: null,
      tenantData: null,
      availableTenants: [],
      impersonatedUser: null,

      // Ação para atualizar o estado de auth
      setAuthData: (authData) => set({
        user: authData.user,
        isAdmin: authData.isAdmin,
        currentUserData: authData.currentUserData
      }),

      // Ações de impersonation (Visualizar como)
      setImpersonatedUser: (memberData) => set({ impersonatedUser: memberData }),
      clearImpersonation: () => set({ impersonatedUser: null }),

      // Ação para definir o tenant ativo
      setTenant: (tenantId, tenantData) => set({
        tenantId,
        tenantData
      }),

      // Ação para definir se é Super Admin
      setSuperAdmin: (isSuperAdmin) => set({ isSuperAdmin }),

      // Ação para definir as igrejas disponíveis para o usuário
      setAvailableTenants: (tenants) => set({ availableTenants: tenants }),

      // Getter para o tenant ID atual
      getTenantId: () => get().tenantId,

      // Ação para limpar o estado no logout
      clearAuthData: () => set({
        user: null,
        isAdmin: false,
        isSuperAdmin: false,
        currentUserData: null,
        tenantId: null,
        tenantData: null,
        availableTenants: [],
        impersonatedUser: null
      })
    }),
    {
      name: 'tenda-auth-storage',
      partialize: (state) => ({
        tenantId: state.tenantId,
        tenantData: state.tenantData,
        isSuperAdmin: state.isSuperAdmin
      })
    }
  )
);