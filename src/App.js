import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    doc, 
    setDoc, 
    deleteDoc,
    query,
    getDocs,
    where
} from 'firebase/firestore';
import { User, X, Users, Home, Calendar, Edit, Trash2, Plus, LogOut, MapPin, Clock } from 'lucide-react';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrFbwJq_mJnhaSe1znuIn08ITniuP0kjE",
  authDomain: "tenda-church-app.firebaseapp.com",
  projectId: "tenda-church-app",
  storageBucket: "tenda-church-app.firebasestorage.app",
  messagingSenderId: "101125626219",
  appId: "1:101125626219:web:c1fc57f022abb21ab6542e",
  measurementId: "G-QJ532E483W"
};


// --- Inicialização do Firebase usando a configuração ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = firebaseConfig.projectId; // Pega o ID do projeto da configuração

// --- Componentes ---

const Header = ({ onLogout }) => (
  <header className="bg-[#991B1B] p-4 shadow-lg flex items-center justify-between">
      <img 
        src="https://firebasestorage.googleapis.com/v0/b/cad-prestadores---heberlog.firebasestorage.app/o/Logos%2FPrancheta%208.png?alt=media&token=b1ccc570-7210-48b6-b4a3-e01074bca3be"
        onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x50/991B1B/FFFFFF?text=Logo+Tenda+Church'; }}
        alt="Logo Tenda Church" 
        className="h-10"
      />
      <button onClick={onLogout} className="bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg flex items-center space-x-2 transition-all">
          <LogOut size={18} />
          <span>Sair</span>
      </button>
  </header>
);

const Modal = ({ children, isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black transition-colors">
          <X size={24} />
        </button>
        {children}
      </div>
    </div>
  );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end space-x-3">
        <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all">Cancelar</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all">Confirmar Exclusão</button>
      </div>
    </Modal>
  );
};

const ConnectForm = ({ onClose, onSave, members, editingConnect }) => {
  const [formData, setFormData] = useState({
    number: editingConnect?.number || '',
    name: editingConnect?.name || '',
    weekday: editingConnect?.weekday || '',
    time: editingConnect?.time || '',
    address: editingConnect?.address || '',
    leaderId: editingConnect?.leaderId || '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.number || !formData.name || !formData.weekday || !formData.time || !formData.address || !formData.leaderId) {
      setError('Todos os campos são obrigatórios.');
      return;
    }
    const leader = members.find(m => m.id === formData.leaderId);
    onSave({ ...formData, leaderName: leader?.name || 'Não encontrado' });
    onClose();
  };
  
  const weekDays = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingConnect ? 'Editar Connect' : 'Novo Connect'}</h2>
      {error && <p className="text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">Número</label>
          <input type="number" name="number" id="number" value={formData.number} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" placeholder="Ex: 101" />
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" placeholder="Ex: Guerreiros da Fé" />
        </div>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label htmlFor="weekday" className="block text-sm font-medium text-gray-700 mb-1">Dia da Semana</label>
            <select name="weekday" id="weekday" value={formData.weekday} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none">
                <option value="">Selecione...</option>
                {weekDays.map(day => <option key={day} value={day}>{day}</option>)}
            </select>
        </div>
        <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
            <input type="time" name="time" id="time" value={formData.time} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" />
        </div>
       </div>

        <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" placeholder="Rua, Número, Bairro" />
        </div>
      <div>
        <label htmlFor="leaderId" className="block text-sm font-medium text-gray-700 mb-1">Líder do Connect</label>
        <select name="leaderId" id="leaderId" value={formData.leaderId} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none">
          <option value="">Selecione um líder</option>
          {members.map(member => (<option key={member.id} value={member.id}>{member.name}</option>))}
        </select>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all">Cancelar</button>
        <button type="submit" className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all">{editingConnect ? 'Salvar Alterações' : 'Adicionar Connect'}</button>
      </div>
    </form>
  );
};

// --- LoginPage Component ---
const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(getFriendlyErrorMessage(err.code));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(getFriendlyErrorMessage(err.code));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getFriendlyErrorMessage = (code) => {
        switch (code) {
            case 'auth/invalid-email': return 'O formato do e-mail é inválido.';
            case 'auth/user-not-found': case 'auth/wrong-password': case 'auth/invalid-credential': return 'E-mail ou senha incorretos.';
            case 'auth/email-already-in-use': return 'Este e-mail já está a ser utilizado.';
            case 'auth/weak-password': return 'A senha deve ter pelo menos 6 caracteres.';
            default: return 'Ocorreu um erro. Por favor, tente novamente.';
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-200">
            <div className="w-full max-w-md p-8 space-y-8 bg-[#991B1B] rounded-2xl shadow-lg">
                <div className="flex flex-col items-center">
                    <img src="https://firebasestorage.googleapis.com/v0/b/cad-prestadores---heberlog.firebasestorage.app/o/Logos%2FPrancheta%208.png?alt=media&token=b1ccc570-7210-48b6-b4a3-e01074bca3be" alt="Logo Tenda Church" className="h-16 mb-6" />
                </div>
                <form className="mt-8 space-y-6">
                    <div className="space-y-4 rounded-md">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email</label>
                            <input id="email-address" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="relative block w-full px-3 py-3 text-white placeholder-gray-300 bg-white/20 border border-transparent rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-white sm:text-sm" placeholder="E-mail" />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Senha</label>
                            <input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="relative block w-full px-3 py-3 text-white placeholder-gray-300 bg-white/20 border border-transparent rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-white sm:text-sm" placeholder="Senha" />
                        </div>
                    </div>

                    {error && <p className="text-sm text-center text-white bg-red-500/50 p-2 rounded-md">{error}</p>}

                    <div className="space-y-3">
                        <button onClick={handleLogin} disabled={isSubmitting} className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-[#991B1B] bg-white border border-transparent rounded-md group hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#991B1B] focus:ring-white disabled:bg-gray-300 disabled:text-gray-500">
                            {isSubmitting ? 'A entrar...' : 'Entrar'}
                        </button>
                        <button onClick={handleCreateAccount} disabled={isSubmitting} className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-white bg-white/20 border border-transparent rounded-md group hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#991B1B] focus:ring-white disabled:bg-opacity-50">
                            {isSubmitting ? 'A criar...' : 'Criar Conta'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Componente Principal da Aplicação ---
export default function App() {
    const [user, setUser] = useState(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [members, setMembers] = useState([]);
    const [connects, setConnects] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const [isMemberModalOpen, setMemberModalOpen] = useState(false);
    const [isConnectModalOpen, setConnectModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [editingConnect, setEditingConnect] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
    const [deleteAction, setDeleteAction] = useState(null);

    // Efeito para autenticação
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);

    // Efeito para carregar dados do Firestore
    useEffect(() => {
        if (!user) { // Não carrega dados se não houver utilizador
             setMembers([]);
             setConnects([]);
             setLoadingData(false);
             return;
        };
        
        setLoadingData(true);
        const connectsCollectionPath = `artifacts/${appId}/public/data/connects`;
        const membersCollectionPath = `artifacts/${appId}/public/data/members`;

        const unsubConnects = onSnapshot(collection(db, connectsCollectionPath), (snapshot) => {
            const connectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setConnects(connectsData);
        }, (error) => console.error("Erro ao buscar connects: ", error));

        const unsubMembers = onSnapshot(collection(db, membersCollectionPath), (snapshot) => {
            const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMembers(membersData);
            setLoadingData(false);
        }, (error) => {
            console.error("Erro ao buscar membros: ", error);
            setLoadingData(false);
        });

        return () => {
            unsubConnects();
            unsubMembers();
        };
    }, [user]);

    const handleLogout = async () => {
        await signOut(auth);
    };
    
    // ... (restantes das funções, MemberForm, etc. - sem alterações)
    const MemberForm = ({ onClose, onSave, connects, editingMember }) => {
        const [formData, setFormData] = useState({ name: editingMember?.name || '', dob: editingMember?.dob || '', address: editingMember?.address || '', phone: editingMember?.phone || '', gender: editingMember?.gender || '', connectId: editingMember?.connectId || '', });
        const [error, setError] = useState('');
        const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
        const handleSubmit = (e) => { e.preventDefault(); if (!formData.name || !formData.dob || !formData.phone || !formData.gender) { setError('Nome, Data de Nascimento, Celular e Sexo são obrigatórios.'); return; } onSave(formData); onClose(); };
        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingMember ? 'Editar Membro' : 'Novo Membro'}</h2>
                {error && <p className="text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}
                <div><label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label><input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" placeholder="Nome completo do membro" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label><input type="date" name="dob" id="dob" value={formData.dob} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" /></div><div><label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Celular</label><input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" placeholder="(99) 99999-9999" /></div></div>
                <div><label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Endereço</label><input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" placeholder="Rua, Número, Bairro, Cidade" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Sexo</label><select name="gender" id="gender" value={formData.gender} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none"><option value="">Selecione...</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option></select></div><div><label htmlFor="connectId" className="block text-sm font-medium text-gray-700 mb-1">Connect</label><select name="connectId" id="connectId" value={formData.connectId} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none"><option value="">Nenhum</option>{connects.map(connect => (<option key={connect.id} value={connect.id}>{connect.number} - {connect.name}</option>))}</select></div></div>
                <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all">Cancelar</button><button type="submit" className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all">{editingMember ? 'Salvar Alterações' : 'Adicionar Membro'}</button></div>
            </form>
        );
    };
    const LoadingSpinner = () => (<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[#DC2626]"></div></div>);
    const handleSaveConnect = async (connectData) => { const collectionPath = `artifacts/${appId}/public/data/connects`; try { if (editingConnect) { await setDoc(doc(db, collectionPath, editingConnect.id), connectData); } else { const q = query(collection(db, collectionPath), where("number", "==", connectData.number)); const querySnapshot = await getDocs(q); if (!querySnapshot.empty) { alert("Já existe um Connect com este número."); return; } await addDoc(collection(db, collectionPath), connectData); } closeConnectModal(); } catch (error) { console.error("Erro ao salvar connect:", error); } };
    const handleSaveMember = async (memberData) => { const collectionPath = `artifacts/${appId}/public/data/members`; try { if (editingMember) { await setDoc(doc(db, collectionPath, editingMember.id), memberData); } else { await addDoc(collection(db, collectionPath), memberData); } closeMemberModal(); } catch (error) { console.error("Erro ao salvar membro:", error); } };
    const triggerDelete = (type, id) => { let message = "Tem certeza que deseja excluir este membro? Esta ação não pode ser desfeita."; if (type === 'connect') { message = "Atenção! Excluir este Connect removerá a associação de todos os membros a ele. Deseja continuar?"; } setDeleteAction({ type, id, message }); setConfirmModalOpen(true); };
    const handleConfirmDelete = async () => { if (!deleteAction) return; const { type, id } = deleteAction; try { if (type === 'member') { await deleteDoc(doc(db, `artifacts/${appId}/public/data/members`, id)); } else if (type === 'connect') { const membersToUpdate = members.filter(m => m.connectId === id); for (const member of membersToUpdate) { const memberRef = doc(db, `artifacts/${appId}/public/data/members`, member.id); const updatedData = { ...member, connectId: '' }; delete updatedData.id; await setDoc(memberRef, updatedData); } await deleteDoc(doc(db, `artifacts/${appId}/public/data/connects`, id)); } } catch (error) { console.error(`Erro ao deletar ${type}:`, error); } finally { setConfirmModalOpen(false); setDeleteAction(null); } };
    const openMemberModal = (member = null) => { setEditingMember(member); setMemberModalOpen(true); };
    const closeMemberModal = () => { setEditingMember(null); setMemberModalOpen(false); };
    const openConnectModal = (connect = null) => { setEditingConnect(connect); setConnectModalOpen(true); };
    const closeConnectModal = () => { setEditingConnect(null); setConnectModalOpen(false); };
    const filteredMembers = members.filter(member => member.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const getConnectName = useCallback((connectId) => { if (!connectId) return 'Sem Connect'; const connect = connects.find(c => c.id === connectId); return connect ? `${connect.number} - ${connect.name}` : '...'; }, [connects]);


    if (isLoadingAuth) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-100"><LoadingSpinner /></div>;
    }

    if (!user) {
        return <LoginPage />;
    }

    return (
        <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
            <Header onLogout={handleLogout} />

            <main className="p-4 md:p-8">
                <Modal isOpen={isMemberModalOpen} onClose={closeMemberModal}><MemberForm onClose={closeMemberModal} onSave={handleSaveMember} connects={connects} editingMember={editingMember} /></Modal>
                <Modal isOpen={isConnectModalOpen} onClose={closeConnectModal}><ConnectForm onClose={closeConnectModal} onSave={handleSaveConnect} members={members} editingConnect={editingConnect} /></Modal>
                <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setConfirmModalOpen(false)} onConfirm={handleConfirmDelete} title="Confirmar Exclusão" message={deleteAction?.message || ''} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-between border border-gray-200">
                        <div><div className="flex items-center space-x-3 mb-2"><Users size={28} className="text-[#DC2626]" /><h2 className="text-2xl font-bold text-gray-900">Membros</h2></div><p className="text-gray-600">Gerencie todos os membros da igreja.</p><p className="text-4xl font-black text-gray-800 mt-4">{members.length}</p></div>
                        <button onClick={() => openMemberModal()} className="mt-4 w-full bg-[#DC2626] hover:bg-[#991B1B] text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all"><Plus size={20} /><span>Adicionar Membro</span></button>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-between border border-gray-200">
                        <div><div className="flex items-center space-x-3 mb-2"><Home size={28} className="text-[#DC2626]" /><h2 className="text-2xl font-bold text-gray-900">Connects</h2></div><p className="text-gray-600">Gerencie as células (Connects).</p><p className="text-4xl font-black text-gray-800 mt-4">{connects.length}</p></div>
                        <button onClick={() => openConnectModal()} className="mt-4 w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all"><Plus size={20} /><span>Adicionar Connect</span></button>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Lista de Connects</h3>
                    {loadingData ? <LoadingSpinner /> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {connects.sort((a, b) => a.number - b.number).map(c => (
                                <div key={c.id} className="bg-white rounded-lg p-4 flex flex-col justify-between transition-all shadow-md hover:shadow-lg hover:-translate-y-1 border border-gray-200">
                                    <div>
                                        <div className="flex justify-between items-start"><h4 className="font-bold text-lg text-[#DC2626]">Connect {c.number}</h4><div className="flex space-x-2"><button onClick={() => openConnectModal(c)} className="text-gray-500 hover:text-[#DC2626]"><Edit size={16}/></button><button onClick={() => triggerDelete('connect', c.id)} className="text-gray-500 hover:text-red-600"><Trash2 size={16}/></button></div></div>
                                        <p className="text-gray-800 text-xl font-semibold">{c.name}</p>
                                        <p className="text-gray-600 mt-2 flex items-center"><User size={14} className="inline mr-2 flex-shrink-0"/>Líder: {c.leaderName}</p>
                                        <p className="text-gray-600 flex items-center"><Calendar size={14} className="inline mr-2 flex-shrink-0"/>{c.weekday}</p>
                                        <p className="text-gray-600 flex items-center"><Clock size={14} className="inline mr-2 flex-shrink-0"/>{c.time}</p>
                                        <p className="text-gray-600 flex items-center"><MapPin size={14} className="inline mr-2 flex-shrink-0"/>{c.address}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Lista de Membros</h3>
                    <div className="mb-4"><input type="text" placeholder="Buscar membro pelo nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-md bg-white text-gray-900 rounded-md p-3 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none shadow-sm" /></div>
                    {loadingData ? <LoadingSpinner /> : (
                        <div className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="p-3 text-sm font-semibold tracking-wide text-gray-600">Nome</th><th className="p-3 text-sm font-semibold tracking-wide text-gray-600 hidden md:table-cell">Celular</th><th className="p-3 text-sm font-semibold tracking-wide text-gray-600 hidden lg:table-cell">Connect</th><th className="p-3 text-sm font-semibold tracking-wide text-gray-600">Ações</th></tr></thead><tbody className="divide-y divide-gray-200">{filteredMembers.map(member => (<tr key={member.id} className="hover:bg-gray-50 transition-colors"><td className="p-3"><p className="font-bold text-gray-800">{member.name}</p><p className="text-gray-500 text-sm md:hidden">{member.phone}</p></td><td className="p-3 text-gray-600 hidden md:table-cell">{member.phone}</td><td className="p-3 text-gray-600 hidden lg:table-cell">{getConnectName(member.connectId)}</td><td className="p-3"><div className="flex items-center space-x-3"><button onClick={() => openMemberModal(member)} className="text-gray-500 hover:text-[#DC2626]"><Edit size={18}/></button><button onClick={() => triggerDelete('member', member.id)} className="text-gray-500 hover:text-red-600"><Trash2 size={18}/></button></div></td></tr>))}</tbody></table></div></div>
                    )}
                </div>
            </main>
        </div>
    );
}
