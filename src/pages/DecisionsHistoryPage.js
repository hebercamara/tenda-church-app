import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db, appId } from '../firebaseConfig';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import DecisionDetailsModal from '../components/DecisionDetailsModal';
import {
    Search, Plus, Edit2, Trash2, CheckCircle, Clock, PhoneCall,
    ArrowLeft, History, X, User, Phone, Mail, MapPin, FileText, RotateCcw
} from 'lucide-react';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ── Formulário de edição de decisão ────────────────────────────────────────────
const EditDecisionModal = ({ isOpen, onClose, decision, onSave, connects }) => {
    const [form, setForm] = useState({});
    useEffect(() => { if (decision) setForm({ ...decision }); }, [decision]);
    if (!isOpen || !decision) return null;

    const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSave = () => { onSave(decision.id, form); onClose(); };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" title="Editar Decisão">
            <div className="p-4 space-y-4">
                {[
                    { name: 'name', label: 'Nome Completo', type: 'text' },
                    { name: 'phone', label: 'Telefone/WhatsApp', type: 'tel' },
                    { name: 'email', label: 'E-mail', type: 'email' },
                    { name: 'address', label: 'Endereço', type: 'text' },
                ].map(({ name, label, type }) => (
                    <div key={name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                        <input
                            type={type}
                            name={name}
                            value={form[name] || ''}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>
                ))}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Connect</label>
                    <select
                        name="connectId"
                        value={form.connectId || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        <option value="">Selecione...</option>
                        {connects.map(c => (
                            <option key={c.id} value={c.id}>{c.number} - {c.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                        name="status"
                        value={form.status || 'pendente'}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        <option value="pendente">Pendente</option>
                        <option value="contatado">Contatado</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                    <textarea
                        name="observations"
                        value={form.observations || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onClose} className="px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-[#991B1B] text-white rounded-md text-sm font-semibold hover:bg-red-800">Salvar</button>
                </div>
            </div>
        </Modal>
    );
};

// ── Página principal ────────────────────────────────────────────────────────────
const DecisionsHistoryPage = ({ allConnects = [], getConnectName, handleUpdateDecisionStatus }) => {
    const { isAdmin, currentUserData } = useAuthStore();
    const navigate = useNavigate();

    const userEmail = (currentUserData?.email || '').toLowerCase();

    // Perfis do usuário
    const isLeader = allConnects.some(c =>
        c.leaderId === currentUserData?.id || (c.leaderEmail || '').toLowerCase() === userEmail
    );
    const isSupervisor = allConnects.some(c =>
        (c.supervisorEmail || '').toLowerCase() === userEmail
    );
    const isPastor = !!(currentUserData?.isPastor);
    const isAuxLeader = allConnects.some(c =>
        (Array.isArray(c.auxLeaders) && c.auxLeaders.some(l =>
            l.id === currentUserData?.id || (l.email || '').toLowerCase() === userEmail
        )) ||
        c.auxLeaderId === currentUserData?.id ||
        (c.auxLeaderEmail || '').toLowerCase() === userEmail
    );

    const hasAccess = isAdmin || isLeader || isSupervisor || isPastor || isAuxLeader;

    // Redireciona se não tem acesso
    useEffect(() => {
        if (currentUserData && !hasAccess) navigate('/dashboard');
    }, [currentUserData, hasAccess, navigate]);

    // IDs dos Connects visíveis
    const visibleConnectIds = useMemo(() => {
        if (isAdmin || isPastor) return null; // null = todos
        return allConnects
            .filter(c => {
                const l = c.leaderId === currentUserData?.id || (c.leaderEmail || '').toLowerCase() === userEmail;
                const s = (c.supervisorEmail || '').toLowerCase() === userEmail;
                const a = (Array.isArray(c.auxLeaders) && c.auxLeaders.some(x =>
                    x.id === currentUserData?.id || (x.email || '').toLowerCase() === userEmail
                )) || c.auxLeaderId === currentUserData?.id || (c.auxLeaderEmail || '').toLowerCase() === userEmail;
                return l || s || a;
            })
            .map(c => c.id);
    }, [allConnects, currentUserData, isAdmin, isPastor, userEmail]);

    // Estado
    const [decisions, setDecisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedDecision, setSelectedDecision] = useState(null);
    const [editDecision, setEditDecision] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Carregar decisões em tempo real
    useEffect(() => {
        const ref = collection(db, `artifacts/${appId}/public/data/decisions`);
        const unsub = onSnapshot(ref, snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setDecisions(list);
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
    }, []);

    // Filtragem
    const filtered = useMemo(() => {
        let list = decisions;
        if (visibleConnectIds !== null) {
            list = list.filter(d => visibleConnectIds.includes(d.connectId));
        }
        if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);
        if (search.trim()) {
            const s = search.toLowerCase();
            list = list.filter(d =>
                d.name?.toLowerCase().includes(s) ||
                d.phone?.includes(s) ||
                d.email?.toLowerCase().includes(s)
            );
        }
        return [...list].sort((a, b) => {
            const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const db2 = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return db2 - da;
        });
    }, [decisions, visibleConnectIds, statusFilter, search]);

    // Handlers
    const handleEdit = useCallback(async (id, form) => {
        const ref = doc(db, `artifacts/${appId}/public/data/decisions`, id);
        const update = {
            name: form.name || '',
            phone: form.phone || '',
            email: form.email || '',
            address: form.address || '',
            connectId: form.connectId || '',
            observations: form.observations || '',
            status: form.status || 'pendente',
        };
        if (form.status === 'contatado' && !form.contactedAt) {
            update.contactedAt = serverTimestamp();
        }
        // Ao reverter para pendente, limpa o contactedAt
        if (form.status === 'pendente') {
            update.contactedAt = null;
        }
        await updateDoc(ref, update);
    }, []);

    // Desmarca como contatado — volta para pendente e limpa contactedAt
    const handleUnmark = useCallback(async (id) => {
        const ref = doc(db, `artifacts/${appId}/public/data/decisions`, id);
        await updateDoc(ref, { status: 'pendente', contactedAt: null });
    }, []);

    const handleDelete = useCallback(async (id) => {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/decisions`, id));
        setDeleteConfirm(null);
    }, []);

    const handleAdd = useCallback(async (form) => {
        await addDoc(collection(db, `artifacts/${appId}/public/data/decisions`), {
            ...form,
            status: 'pendente',
            createdAt: serverTimestamp(),
        });
        setShowAddModal(false);
    }, []);

    const pendingCount = filtered.filter(d => d.status === 'pendente').length;
    const contactedCount = filtered.filter(d => d.status === 'contatado').length;

    const isExpired = (decision) => {
        if (decision.status !== 'contatado') return false;
        const contactedDate = decision.contactedAt?.toDate
            ? decision.contactedAt.toDate()
            : null;
        if (!contactedDate) return false;
        return Date.now() - contactedDate.getTime() > SEVEN_DAYS_MS;
    };

    if (!hasAccess) return null;

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
            {/* Cabeçalho */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <History className="w-5 h-5 text-red-600" />
                            Histórico de Decisões
                        </h1>
                        <p className="text-sm text-gray-500">
                            {filtered.length} decisão{filtered.length !== 1 ? 'ões' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#991B1B] text-white rounded-lg font-semibold text-sm hover:bg-red-800 transition shadow"
                >
                    <Plus className="w-4 h-4" />
                    Nova Decisão
                </button>
            </div>

            {/* Badges de resumo */}
            <div className="flex flex-wrap gap-3 mb-5">
                <span className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-full px-3 py-1 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5" /> {pendingCount} Pendente{pendingCount !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 rounded-full px-3 py-1 text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> {contactedCount} Contatado{contactedCount !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, telefone ou e-mail..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                    <option value="all">Todos os status</option>
                    <option value="pendente">Pendente</option>
                    <option value="contatado">Contatado</option>
                </select>
            </div>

            {/* Lista */}
            {loading ? (
                <div className="text-center py-12 text-gray-400">Carregando...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma decisão encontrada.</p>
                </div>
            ) : (
                <div className="border rounded-xl overflow-hidden bg-white shadow-sm divide-y divide-gray-100">
                    {filtered.map(decision => {
                        const date = decision.createdAt?.toDate ? decision.createdAt.toDate() : new Date(decision.createdAt || 0);
                        const dateStr = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(date);
                        const expired = isExpired(decision);

                        return (
                            <div
                                key={decision.id}
                                className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50 transition"
                            >
                                {/* Informações */}
                                <div
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => setSelectedDecision(decision)}
                                >
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-gray-800">{decision.name}</span>
                                        {decision.status === 'pendente' ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                                                <Clock className="w-3 h-3" /> Pendente
                                            </span>
                                        ) : (
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${expired ? 'text-gray-500 bg-gray-100' : 'text-green-700 bg-green-100'}`}>
                                                <CheckCircle className="w-3 h-3" />
                                                {expired ? 'Arquivado' : 'Contatado'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {decision.phone}
                                        </span>
                                        <span>·</span>
                                        <span>{getConnectName ? getConnectName(decision.connectId) : decision.connectId}</span>
                                        <span>·</span>
                                        <span>{dateStr}</span>
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                        onClick={() => setEditDecision(decision)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                        title="Editar"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    {decision.status !== 'contatado' ? (
                                        <button
                                            onClick={() => handleUpdateDecisionStatus && handleUpdateDecisionStatus(decision.id, 'contatado')}
                                            className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition"
                                            title="Marcar como Contatado"
                                        >
                                            <PhoneCall className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleUnmark(decision.id)}
                                            className="p-2 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition"
                                            title="Desmarcar Contatado (voltar para Pendente)"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setDeleteConfirm(decision)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                                        title="Excluir"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de detalhes */}
            {selectedDecision && (
                <DecisionDetailsModal
                    isOpen={!!selectedDecision}
                    onClose={() => setSelectedDecision(null)}
                    decision={selectedDecision}
                    onContacted={handleUpdateDecisionStatus}
                    getConnectName={getConnectName}
                />
            )}

            {/* Modal de edição */}
            {editDecision && (
                <EditDecisionModal
                    isOpen={!!editDecision}
                    onClose={() => setEditDecision(null)}
                    decision={editDecision}
                    onSave={handleEdit}
                    connects={allConnects}
                />
            )}

            {/* Modal de adicionar */}
            {showAddModal && (
                <EditDecisionModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    decision={{ name: '', phone: '', email: '', address: '', connectId: '', observations: '', status: 'pendente' }}
                    onSave={(_, form) => handleAdd(form)}
                    connects={allConnects}
                />
            )}

            {/* Confirmação de exclusão */}
            {deleteConfirm && (
                <Modal isOpen onClose={() => setDeleteConfirm(null)} size="sm" title="Confirmar Exclusão">
                    <div className="p-4 space-y-4">
                        <p className="text-gray-600 text-sm">
                            Tem certeza que deseja excluir a decisão de <strong>{deleteConfirm.name}</strong>? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
                            <button
                                onClick={() => handleDelete(deleteConfirm.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DecisionsHistoryPage;
