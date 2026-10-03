import React, { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { useNavigate, Link } from "react-router-dom";
import { useKidsStore } from "../store/kidsStore";
import { getTenantId } from "../../utils/tenantUtils";
import { Baby, User, Mail, Phone, MapPin, Check, AlertCircle } from "lucide-react";

export default function KidsCadastroPage() {
  const navigate = useNavigate();
  const { setGuardian, setKidsRole } = useKidsStore();
  const [step, setStep] = useState(1); // 1: form, 2: confirmacao de membro existente
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [foundMember, setFoundMember] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", password: "", confirmPassword: "" });

  const updateForm = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleCheckMember = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("As senhas nao coincidem."); return; }
    if (form.password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }

    setSaving(true);
    const tenantId = getTenantId();
    // Busca por email no members
    const membersSnap = await getDocs(
      query(collection(db, `artifacts/${tenantId}/public/data/members`),
        where("email", "==", form.email.toLowerCase().trim()))
    );
    if (!membersSnap.empty) {
      setFoundMember({ id: membersSnap.docs[0].id, ...membersSnap.docs[0].data() });
      setStep(2);
      setSaving(false);
      return;
    }
    // Nao encontrou membro — cadastra direto
    await doRegister(null);
    setSaving(false);
  };

  const doRegister = async (linkedMemberId) => {
    setSaving(true);
    setError("");
    const tenantId = getTenantId();
    try {
      // Cria conta no Firebase Auth
      let uid;
      try {
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        uid = cred.user.uid;
      } catch (authErr) {
        if (authErr.code === "auth/email-already-in-use") {
          const cred = await signInWithEmailAndPassword(auth, form.email, form.password);
          uid = cred.user.uid;
        } else throw authErr;
      }

      // Sincroniza de volta no membro se confirmado
      if (linkedMemberId && foundMember) {
        const updates = {};
        if (!foundMember.phone && form.phone) updates.phone = form.phone;
        if (!foundMember.address && form.address) updates.address = form.address;
        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, `artifacts/${tenantId}/public/data/members`, linkedMemberId), updates);
        }
      }

      // Cria guardian
      const guardianRef = await addDoc(collection(db, `artifacts/${tenantId}/public/data/kids_guardians`), {
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
        linkedMemberId: linkedMemberId || null,
        authUid: uid,
        tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const guardianData = { id: guardianRef.id, name: form.name.trim(), email: form.email.toLowerCase().trim(), phone: form.phone.trim() };
      setGuardian(guardianData);
      setKidsRole("guardian");
      navigate("/kids/filhos");
    } catch (err) {
      const codes = {
        "auth/email-already-in-use": "Este e-mail ja esta em uso. Tente fazer login.",
        "auth/weak-password": "Senha muito fraca. Use pelo menos 6 caracteres.",
        "auth/invalid-email": "E-mail invalido.",
      };
      setError(codes[err.code] || "Erro ao cadastrar: " + err.message);
    }
    setSaving(false);
  };

  if (step === 2 && foundMember) {
    return (
      <div className="kids-min-h-screen kids-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md kids-card text-center">
          <div className="w-16 h-16 bg-kids-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-kids-yellow" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-800 mb-2">Encontramos um cadastro!</h2>
          <p className="text-gray-600 mb-1">Encontramos um registro com o e-mail informado:</p>
          <div className="bg-gray-50 rounded-xl p-4 my-4 text-left">
            <p className="font-bold text-gray-800">{foundMember.name}</p>
            <p className="text-sm text-gray-500">{foundMember.email}</p>
            {foundMember.phone && <p className="text-sm text-gray-500">{foundMember.phone}</p>}
          </div>
          <p className="text-gray-600 mb-6 font-medium">Esses dados sao seus?</p>
          <div className="flex gap-3">
            <button onClick={() => doRegister(foundMember.id)} disabled={saving}
              className="kids-btn-primary flex-1 flex items-center justify-center gap-2">
              <Check size={18} /> {saving ? "Cadastrando..." : "Sim, sou eu"}
            </button>
            <button onClick={() => doRegister(null)} disabled={saving}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">
              Nao, sou outra pessoa
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-4 bg-red-50 p-3 rounded-lg">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="kids-min-h-screen kids-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-lg mb-4">
            <Baby size={40} className="text-kids-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-kids-primary">Ministerio Infantil</h1>
          <p className="text-gray-500 mt-1">Cadastro de Responsavel</p>
        </div>

        <div className="kids-card">
          <form onSubmit={handleCheckMember} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <User size={14} className="inline mr-1" />Nome Completo *
              </label>
              <input className="kids-input" placeholder="Seu nome completo" required
                value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <Mail size={14} className="inline mr-1" />E-mail *
              </label>
              <input className="kids-input" type="email" placeholder="seu@email.com" required
                value={form.email} onChange={(e) => updateForm("email", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <Phone size={14} className="inline mr-1" />WhatsApp *
              </label>
              <input className="kids-input" type="tel" placeholder="(77) 9 1234-5678" required
                value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <MapPin size={14} className="inline mr-1" />Endereco <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input className="kids-input" placeholder="Rua, numero, bairro"
                value={form.address} onChange={(e) => updateForm("address", e.target.value)} />
            </div>
            <hr className="border-gray-100" />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Criar Senha *</label>
              <input className="kids-input" type="password" placeholder="Minimo 6 caracteres" required
                value={form.password} onChange={(e) => updateForm("password", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmar Senha *</label>
              <input className="kids-input" type="password" placeholder="Repita a senha" required
                value={form.confirmPassword} onChange={(e) => updateForm("confirmPassword", e.target.value)} />
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

            <button type="submit" disabled={saving} className="kids-btn-primary w-full">
              {saving ? "Verificando..." : "Cadastrar"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Ja tem conta?{" "}
            <Link to="/kids/login" className="text-kids-primary font-semibold hover:underline">Fazer login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
