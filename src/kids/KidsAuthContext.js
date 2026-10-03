import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { getTenantId } from "../utils/tenantUtils";
import { useAuthStore } from "../store/authStore";
import { useKidsStore } from "./store/kidsStore";

const KidsAuthContext = createContext(null);

export function KidsAuthProvider({ children }) {
  const { user: mainUser, isAdmin, isSuperAdmin, currentUserData } = useAuthStore();
  const { setGuardian, setKidsRole, guardian, kidsRole } = useKidsStore();
  const [loading, setLoading] = useState(true);

  const resolveKidsRole = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setGuardian(null);
      setKidsRole(null);
      setLoading(false);
      return;
    }

    const tenantId = getTenantId();

    // Admin / SuperAdmin tem acesso total
    if (isAdmin || isSuperAdmin) {
      setKidsRole("admin");
      setLoading(false);
      return;
    }

    // Verifica se e supervisor ou monitor em kids_staff
    const staffSnap = await getDocs(
      query(
        collection(db, `artifacts/${tenantId}/public/data/kids_staff`),
        where("email", "==", firebaseUser.email?.toLowerCase() || ""),
        where("isActive", "==", true)
      )
    );
    if (!staffSnap.empty) {
      const staffData = staffSnap.docs[0].data();
      setKidsRole(staffData.role); // "monitor" | "supervisor"
      setLoading(false);
      return;
    }

    // Verifica se e responsavel (guardian)
    const guardianSnap = await getDocs(
      query(
        collection(db, `artifacts/${tenantId}/public/data/kids_guardians`),
        where("email", "==", firebaseUser.email?.toLowerCase() || "")
      )
    );
    if (!guardianSnap.empty) {
      const gData = { id: guardianSnap.docs[0].id, ...guardianSnap.docs[0].data() };
      setGuardian(gData);
      setKidsRole("guardian");
      setLoading(false);
      return;
    }

    // Usuario logado mas sem registro kids — sera responsavel apos cadastro
    setKidsRole(null);
    setLoading(false);
  }, [isAdmin, isSuperAdmin, setGuardian, setKidsRole]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      resolveKidsRole(u);
    });
    return () => unsub();
  }, [resolveKidsRole]);

  return (
    <KidsAuthContext.Provider value={{ loading, kidsRole, guardian, currentUserData }}>
      {children}
    </KidsAuthContext.Provider>
  );
}

export function useKidsAuth() {
  return useContext(KidsAuthContext);
}

