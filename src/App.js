import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged
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
import { User, X, Users, Home, Calendar, Edit, Trash2, Plus } from 'lucide-react';

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

// --- Componentes da UI ---

const Header = () => (
  <header className="bg-[#991B1B] p-4 shadow-lg flex items-center justify-start">
      <img 
        src="https://firebasestorage.googleapis.com/v0/b/cad-prestadores---heberlog.firebasestorage.app/o/Logos%2FPrancheta%208.png?alt=media&token=b1ccc570-7210-48b6-b4a3-e01074bca3be"
        onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x50/991B1B/FFFFFF?text=Logo+Tenda+Church'; }}
        alt="Logo Tenda Church" 
        className="h-10"
      />
  </header>
);

const Modal = ({ children, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
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
        <button 
          onClick={onClose} 
          className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all"
        >
          Cancelar
        </button>
        <button 
          onClick={onConfirm} 
          className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all"
        >
          Confirmar Exclusão
        </button>
      </div>
    </Modal>
  );
};

const ConnectForm = ({ onClose, onSave, members, editingConnect }) => {
  const [formData, setFormData] = useState({
    number: editingConnect?.number || '',
    name: editingConnect?.name || '',
    schedule: editingConnect?.schedule || '',
    leaderId: editingConnect?.leaderId || '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.number || !formData.name || !formData.schedule || !formData.leaderId) {
      setError('Todos os campos são obrigatórios.');
      return;
    }
    const leader = members.find(m => m.id === formData.leaderId);
    onSave({ ...formData, leaderName: leader?.name || 'Não encontrado' });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingConnect ? 'Editar Connect' : 'Novo Connect'}</h2>
      {error && <p className="text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">Número do Connect</label>
          <input type="number" name="number" id="number" value={formData.number} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" placeholder="Ex: 101" />
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome do Connect</label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" placeholder="Ex: Guerreiros da Fé" />
        </div>
      </div>
      <div>
        <label htmlFor="schedule" className="block text-sm font-medium text-gray-700 mb-1">Dia e Horário</label>
        <input type="text" name="schedule" id="schedule" value={formData.schedule} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" placeholder="Ex: Quartas-feiras, 20h" />
      </div>
      <div>
        <label htmlFor="leaderId" className="block text-sm font-medium text-gray-700 mb-1">Líder do Connect</label>
        <select name="leaderId" id="leaderId" value={formData.leaderId} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none">
          <option value="">Selecione um líder</option>
          {members.map(member => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all">Cancelar</button>
        <button type="submit" className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all">{editingConnect ? 'Salvar Alterações' : 'Adicionar Connect'}</button>
      </div>
    </form>
  );
};

const MemberForm = ({ onClose, onSave, connects, editingMember }) => {
    const [formData, setFormData] = useState({
        name: editingMember?.name || '',
        dob: editingMember?.dob || '',
        address: editingMember?.address || '',
        phone: editingMember?.phone || '',
        gender: editingMember?.gender || '',
        connectId: editingMember?.connectId || '',
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.dob || !formData.phone || !formData.gender) {
            setError('Nome, Data de Nascimento, Celular e Sexo são obrigatórios.');
            return;
        }
        onSave(formData);
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingMember ? 'Editar Membro' : 'Novo Membro'}</h2>
            {error && <p className="text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}

            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" placeholder="Nome completo do membro" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                    <input type="date" name="dob" id="dob" value={formData.dob} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                    <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" placeholder="(99) 99999-9999" />
                </div>
            </div>

            <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none" placeholder="Rua, Número, Bairro, Cidade" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                    <select name="gender" id="gender" value={formData.gender} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none">
                        <option value="">Selecione...</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="connectId" className="block text-sm font-medium text-gray-700 mb-1">Connect</label>
                    <select name="connectId" id="connectId" value={formData.connectId} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none">
                        <option value="">Nenhum</option>
                        {connects.map(connect => (
                            <option key={connect.id} value={connect.id}>{connect.number} - {connect.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all">{editingMember ? 'Salvar Alterações' : 'Adicionar Membro'}</button>
            </div>
        </form>
    );
};

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[#DC2626]"></div>
    </div>
);


// --- Componente Principal da Aplicação ---
export default function App() {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [members, setMembers] = useState([]);
    const [connects, setConnects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isMemberModalOpen, setMemberModalOpen] = useState(false);
    const [isConnectModalOpen, setConnectModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [editingConnect, setEditingConnect] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
    const [deleteAction, setDeleteAction] = useState(null);

    // Efeito para autenticação
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("Erro no login anônimo:", error);
                }
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // Efeito para carregar dados do Firestore
    useEffect(() => {
        if (!isAuthReady) return;
        
        setLoading(true);
        const connectsCollectionPath = `artifacts/${appId}/public/data/connects`;
        const membersCollectionPath = `artifacts/${appId}/public/data/members`;

        const unsubConnects = onSnapshot(collection(db, connectsCollectionPath), (snapshot) => {
            const connectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setConnects(connectsData);
        }, (error) => console.error("Erro ao buscar connects: ", error));

        const unsubMembers = onSnapshot(collection(db, membersCollectionPath), (snapshot) => {
            const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMembers(membersData);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar membros: ", error);
            setLoading(false);
        });

        return () => {
            unsubConnects();
            unsubMembers();
        };
    }, [isAuthReady]);
    
    const handleSaveConnect = async (connectData) => {
        const collectionPath = `artifacts/${appId}/public/data/connects`;
        try {
            if (editingConnect) {
                await setDoc(doc(db, collectionPath, editingConnect.id), connectData);
            } else {
                const q = query(collection(db, collectionPath), where("number", "==", connectData.number));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    alert("Já existe um Connect com este número.");
                    return;
                }
                await addDoc(collection(db, collectionPath), connectData);
            }
            closeConnectModal();
        } catch (error) {
            console.error("Erro ao salvar connect:", error);
        }
    };
    
    const handleSaveMember = async (memberData) => {
        const collectionPath = `artifacts/${appId}/public/data/members`;
        try {
            if (editingMember) {
                await setDoc(doc(db, collectionPath, editingMember.id), memberData);
            } else {
                await addDoc(collection(db, collectionPath), memberData);
            }
            closeMemberModal();
        } catch (error) {
            console.error("Erro ao salvar membro:", error);
        }
    };
    
    const triggerDelete = (type, id) => {
      let message = "Tem certeza que deseja excluir este membro? Esta ação não pode ser desfeita.";
      if (type === 'connect') {
          message = "Atenção! Excluir este Connect removerá a associação de todos os membros a ele. Deseja continuar?";
      }
      setDeleteAction({ type, id, message });
      setConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteAction) return;
        
        const { type, id } = deleteAction;

        try {
            if (type === 'member') {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/members`, id));
            } else if (type === 'connect') {
                const membersToUpdate = members.filter(m => m.connectId === id);
                for (const member of membersToUpdate) {
                    const memberRef = doc(db, `artifacts/${appId}/public/data/members`, member.id);
                    const updatedData = { ...member, connectId: '' };
                    delete updatedData.id;
                    await setDoc(memberRef, updatedData);
                }
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/connects`, id));
            }
        } catch (error) {
            console.error(`Erro ao deletar ${type}:`, error);
        } finally {
            setConfirmModalOpen(false);
            setDeleteAction(null);
        }
    };

    const openMemberModal = (member = null) => { setEditingMember(member); setMemberModalOpen(true); };
    const closeMemberModal = () => { setEditingMember(null); setMemberModalOpen(false); };
    const openConnectModal = (connect = null) => { setEditingConnect(connect); setConnectModalOpen(true); };
    const closeConnectModal = () => { setEditingConnect(null); setConnectModalOpen(false); };
    
    const filteredMembers = members.filter(member => 
        member.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getConnectName = useCallback((connectId) => {
        if (!connectId) return 'Sem Connect';
        const connect = connects.find(c => c.id === connectId);
        return connect ? `${connect.number} - ${connect.name}` : '...';
    }, [connects]);

    return (
        <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
            <Header />

            <main className="p-4 md:p-8">
                <Modal isOpen={isMemberModalOpen} onClose={closeMemberModal}>
                    <MemberForm onClose={closeMemberModal} onSave={handleSaveMember} connects={connects} editingMember={editingMember} />
                </Modal>
                <Modal isOpen={isConnectModalOpen} onClose={closeConnectModal}>
                    <ConnectForm onClose={closeConnectModal} onSave={handleSaveConnect} members={members} editingConnect={editingConnect} />
                </Modal>
                <ConfirmationModal 
                  isOpen={isConfirmModalOpen}
                  onClose={() => setConfirmModalOpen(false)}
                  onConfirm={handleConfirmDelete}
                  title="Confirmar Exclusão"
                  message={deleteAction?.message || ''}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-between border border-gray-200">
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <Users size={28} className="text-[#DC2626]" />
                                <h2 className="text-2xl font-bold text-gray-900">Membros</h2>
                            </div>
                            <p className="text-gray-600">Gerencie todos os membros da igreja.</p>
                            <p className="text-4xl font-black text-gray-800 mt-4">{members.length}</p>
                        </div>
                        <button onClick={() => openMemberModal()} className="mt-4 w-full bg-[#DC2626] hover:bg-[#991B1B] text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all">
                            <Plus size={20} />
                            <span>Adicionar Membro</span>
                        </button>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-between border border-gray-200">
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <Home size={28} className="text-[#DC2626]" />
                                <h2 className="text-2xl font-bold text-gray-900">Connects</h2>
                            </div>
                            <p className="text-gray-600">Gerencie as células (Connects).</p>
                            <p className="text-4xl font-black text-gray-800 mt-4">{connects.length}</p>
                        </div>
                        <button onClick={() => openConnectModal()} className="mt-4 w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all">
                            <Plus size={20} />
                            <span>Adicionar Connect</span>
                        </button>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Lista de Connects</h3>
                    {loading ? <LoadingSpinner /> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {connects.sort((a, b) => a.number - b.number).map(c => (
                                <div key={c.id} className="bg-white rounded-lg p-4 flex flex-col justify-between transition-all shadow-md hover:shadow-lg hover:-translate-y-1 border border-gray-200">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-lg text-[#DC2626]">Connect {c.number}</h4>
                                            <div className="flex space-x-2">
                                                <button onClick={() => openConnectModal(c)} className="text-gray-500 hover:text-[#DC2626]"><Edit size={16}/></button>
                                                <button onClick={() => triggerDelete('connect', c.id)} className="text-gray-500 hover:text-red-600"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                        <p className="text-gray-800 text-xl font-semibold">{c.name}</p>
                                        <p className="text-gray-600 mt-2"><User size={14} className="inline mr-2"/>Líder: {c.leaderName}</p>
                                        <p className="text-gray-600"><Calendar size={14} className="inline mr-2"/>{c.schedule}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Lista de Membros</h3>
                    <div className="mb-4">
                         <input
                            type="text"
                            placeholder="Buscar membro pelo nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full max-w-md bg-white text-gray-900 rounded-md p-3 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626] focus:outline-none shadow-sm"
                        />
                    </div>
                    {loading ? <LoadingSpinner /> : (
                        <div className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200">
                           <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-3 text-sm font-semibold tracking-wide text-gray-600">Nome</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide text-gray-600 hidden md:table-cell">Celular</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide text-gray-600 hidden lg:table-cell">Connect</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide text-gray-600">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredMembers.map(member => (
                                        <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3">
                                                <p className="font-bold text-gray-800">{member.name}</p>
                                                <p className="text-gray-500 text-sm md:hidden">{member.phone}</p>
                                            </td>
                                            <td className="p-3 text-gray-600 hidden md:table-cell">{member.phone}</td>
                                            <td className="p-3 text-gray-600 hidden lg:table-cell">{getConnectName(member.connectId)}</td>
                                            <td className="p-3">
                                                <div className="flex items-center space-x-3">
                                                    <button onClick={() => openMemberModal(member)} className="text-gray-500 hover:text-[#DC2626]"><Edit size={18}/></button>
                                                    <button onClick={() => triggerDelete('member', member.id)} className="text-gray-500 hover:text-red-600"><Trash2 size={18}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}