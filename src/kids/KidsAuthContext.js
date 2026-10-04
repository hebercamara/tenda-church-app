import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { getTenantId } from "../utils/tenantUtils";
import { useKidsStore } from "./store/kidsStore";
import { SUPER_ADMIN_EMAIL } from "../utils/tenantUtils";

const KidsAuthContext = createContext(null);

export function KidsAuthProvider({ children }) {
  const { setGuardian, setKidsRole } = useKidsStore();
  const [loading, setLoading] = useState(true);
  const [kidsUser, setKidsUser] = useState(null);
  const [kidsRole, setLocalKidsRole] = useState(null);
  const [guardian, setLocalGuardian] = useState(null);

  const resolveKidsRole = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setGuardian(null);
      setKidsRole(null);
      setLocalGuardian(null);
      setLocalKidsRole(null);
      setKidsUser(null);
      setLoading(false);
      return;
    }

    setKidsUser(firebaseUser);
    const tenantId = getTenantId();
    const email = firebaseUser.email?.toLowerCase() || "";

    // 1. SuperAdmin hardcoded
    if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
      setKidsRole("admin");
      setLocalKidsRole("admin");
      setLoading(false);
      return;
    }

    // 2. Verifica se e admin da igreja no tenant (via tenantData persistido ou members)
    try {
      const tenantDoc = await getDoc(doc(db, "tenants", tenantId));
      if (tenantDoc.exists()) {
        const tenantData = tenantDoc.data();
        if (tenantData.adminEmail?.toLowerCase() === email) {
          setKidsRole("admin");
          setLocalKidsRole("admin");
          setLoading(false);
          return;
        }
      }
    } catch (e) { /* ignora erro de permissao */ }

    // 3. Verifica flag isAdmin em members
    try {
      const memberSnap = await getDocs(
        query(
          collection(db, `artifacts/${tenantId}/public/data/members`),
          where("email", "==", email)
        )
      );
      if (!memberSnap.empty) {
        const memberData = memberSnap.docs[0].data();
        if (memberData.isAdmin === true) {
          setKidsRole("admin");
          setLocalKidsRole("admin");
          setLoading(false);
          return;
        }
      }
    } catch (e) { /* ignora */ }

    // 4. Verifica se e staff (monitor/supervisor)
    try {
      const staffSnap = await getDocs(
        query(
          collection(db, `artifacts/${tenantId}/public/data/kids_staff`),
          where("email", "==", email),
          where("isActive", "==", true)
        )
      );
      if (!staffSnap.empty) {
        const staffData = staffSnap.docs[0].data();
        setKidsRole(staffData.role);
        setLocalKidsRole(staffData.role);
        setLoading(false);
        return;
      }
    } catch (e) { /* ignora */ }

    // 5. Verifica se e responsavel (guardian)
    try {
      const guardianSnap = await getDocs(
        query(
          collection(db, `artifacts/${tenantId}/public/data/kids_guardians`),
          where("email", "==", email)
        )
      );
      if (!guardianSnap.empty) {
        const gData = { id: guardianSnap.docs[0].id, ...guardianSnap.docs[0].data() };
        setGuardian(gData);
        setLocalGuardian(gData);
        setKidsRole("guardian");
        setLocalKidsRole("guardian");
        setLoading(false);
        return;
      }
    } catch (e) { /* ignora */ }

    // 6. Logado mas sem registro kids — redireciona para cadastro de responsavel
    setKidsRole(null);
    setLocalKidsRole(null);
    setLoading(false);
  }, [setGuardian, setKidsRole]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setLoading(true);
      resolveKidsRole(u);
    });
    return () => unsub();
  }, [resolveKidsRole]);

  return (
    <KidsAuthContext.Provider value={{ loading, kidsRole, guardian, kidsUser }}>
      {children}
    </KidsAuthContext.Provider>
  );
}

export function useKidsAuth() {
  return useContext(KidsAuthContext);
}
