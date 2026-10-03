import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useKidsStore = create(
  persist(
    (set) => ({
      guardian: null,
      setGuardian: (guardian) => set({ guardian }),
      clearGuardian: () => set({ guardian: null }),
      activeEventId: null,
      setActiveEventId: (id) => set({ activeEventId: id }),
      activeRoomId: null,
      setActiveRoomId: (id) => set({ activeRoomId: id }),
      kidsRole: null,
      setKidsRole: (role) => set({ kidsRole: role }),
    }),
    {
      name: "tenda-kids-storage",
      partialize: (state) => ({
        guardian: state.guardian,
        activeRoomId: state.activeRoomId,
        kidsRole: state.kidsRole,
      }),
    }
  )
);
