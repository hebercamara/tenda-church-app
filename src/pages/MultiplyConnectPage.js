import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CopyPlus, UserCheck, UserMinus, Plus, Star, User } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { writeBatch, collection, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuthStore } from '../store/authStore';

const MultiplyConnectPage = ({
    allConnects,
    allMembers,
    operationStatus,
    setOperationStatus
}) => {
    const { connectId } = useParams();
    const navigate = useNavigate();
    const { isAdmin, currentUserData } = useAuthStore();
    const { width, height } = useWindowSize();

    // Estado da animação
    const [showConfetti, setShowConfetti] = useState(true);

    // Dados originais
    const [originalConnect, setOriginalConnect] = useState(null);
    const [originalMembers, setOriginalMembers] = useState([]);

    // Estado dos membros selecionados para o novo connect
    const [membersForNewConnect, setMembersForNewConnect] = useState([]);

    // Estado do formulário do NOVO connect
    const [newConnectData, setNewConnectData] = useState({
        number: '',
        name: '',
        leaderId: '',
        leaderName: '',
        leaderEmail: '',
        supervisorId: '',
        supervisorName: '',
        supervisorEmail: '',
        pastorId: '', // Mantendo o padrão se existir, senão nulo
        pastorName: '',
        weekday: '',
        time: '',
        address: '',
        cep: '',
        street: '',
        numberAddr: '',
        neighborhood: '',
        city: '',
        state: '',
        religion: '',
        link: '',
    });

    // Loading e permissões
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);

    // Estado do Modal de Confirmação
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [modalLeaderEmail, setModalLeaderEmail] = useState('');

    useEffect(() => {
        // Encerra confete após 6 segundos
        const timer = setTimeout(() => setShowConfetti(false), 6000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!allConnects || allConnects.length === 0 || !allMembers) return;

        const connect = allConnects.find(c => c.id === connectId);

        if (!connect) {
            navigate('/connects');
            return;
        }

        // Verifica permissão (Admin, Líder ou Supervisor do Connect atual)
        const userEmail = (currentUserData?.email || '').toLowerCase();
        const isConnectLeader = connect.leaderId === currentUserData?.id || (connect.leaderEmail || '').toLowerCase() === userEmail;
        const isConnectSupervisor = (connect.supervisorEmail || '').toLowerCase() === userEmail;

        if (!isAdmin && !isConnectLeader && !isConnectSupervisor) {
            navigate('/connects'); // Sem permissão para esta página
            return;
        }

        setHasPermission(true);
        setOriginalConnect(connect);

        // Membros deste connect especificamente
        const members = allMembers.filter(m => m.connectId === connect.id);
        // Ordena membros alfabeticamente para facilitar a seleção
        members.sort((a, b) => a.name.localeCompare(b.name));
        setOriginalMembers(members);

        // Calcular próximo número
        const highestNumber = Math.max(...allConnects.map(c => Number(c.number) || 0));
        const nextNumber = highestNumber + 1;

        // Preencher dados iniciais do novo connect
        // O antigo Líder vira Supervisor. O Pastor se mantém se existir (mesmo a estrutura não tendo estritamente, mapeamos do objeto antigo).
        setNewConnectData({
            number: nextNumber,
            name: `Connect ${nextNumber}`,
            leaderId: '', // Vai ser selecionado pelo usuário
            leaderName: '',
            leaderEmail: '',
            supervisorId: connect.leaderId || '',
            supervisorName: connect.leaderName || '',
            supervisorEmail: connect.leaderEmail || '',
            pastorId: connect.pastorId || '',
            pastorName: connect.pastorName || '',
            weekday: connect.weekday || '',
            time: connect.time || '',
            address: connect.address || '',
            cep: connect.cep || '',
            street: connect.street || '',
            numberAddr: '', // Provavelmente outro número de rua
            neighborhood: connect.neighborhood || '',
            city: connect.city || '',
            state: connect.state || '',
            religion: connect.religion || '',
            link: '',
        });

        setLoading(false);
    }, [allConnects, allMembers, connectId, navigate, isAdmin, currentUserData]);

    const handleMemberToggle = (memberId) => {
        setMembersForNewConnect(prev => {
            if (prev.includes(memberId)) {
                return prev.filter(id => id !== memberId);
            } else {
                return [...prev, memberId];
            }
        });
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setNewConnectData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleLeaderSelect = (memberId) => {
        const selectedMember = originalMembers.find(m => m.id === memberId);
        if (!selectedMember) return;

        // Se o membro selecionado para líder não estiver na lista "membersForNewConnect", adicionamos automaticamente
        if (!membersForNewConnect.includes(memberId)) {
            setMembersForNewConnect(prev => [...prev, memberId]);
        }

        const newName = `Connect ${selectedMember.name.split(' ')[0]}`;

        setNewConnectData(prev => ({
            ...prev,
            leaderId: memberId,
            leaderName: selectedMember.name,
            leaderEmail: selectedMember.email || '',
            name: newName // Auto-naming
        }));

        // Pre-fill default email para o modal se existir
        setModalLeaderEmail(selectedMember.email || '');
    };

    const requestSave = (e) => {
        e.preventDefault();

        if (membersForNewConnect.length === 0) {
            window.alert('Selecione pelo menos um membro para o novo Connect.');
            return;
        }

        if (!newConnectData.name || !newConnectData.leaderId) {
            window.alert('Selecione quem será o NOVO LÍDER clicando no ícone de estrela nas opções de transferência de membros.');
            return;
        }

        setIsConfirmModalOpen(true);
    };

    const confirmAndSave = async () => {

        if (!modalLeaderEmail || modalLeaderEmail.trim() === '') {
            window.alert('O líder selecionado precisa ter um e-mail cadastrado. Por favor, preencha o campo de e-mail.');
            return;
        }

        setIsConfirmModalOpen(false);
        setSaving(true);
        setOperationStatus({ type: 'info', message: 'Multiplicando Connect... Por favor, aguarde.' });

        try {
            const appId = process.env.REACT_APP_FIREBASE_APP_ID || 'default';
            const batch = writeBatch(db);

            // 1. Criar novo Connect
            const newConnectRef = doc(collection(db, `artifacts/${appId}/public/data/connects`));
            const newConnectId = newConnectRef.id;

            const now = new Date().toISOString();

            const connectToSave = {
                ...newConnectData,
                number: Number(newConnectData.number),
                createdAt: now,
                updatedAt: now,
                createdBy: currentUserData?.id || 'unknown',
                history: [
                    {
                        date: now,
                        action: 'multiplication_created',
                        details: `Criado a partir da multiplicação do Connect ${originalConnect.number}`,
                        user: currentUserData?.name || 'Sistema'
                    }
                ]
            };

            batch.set(newConnectRef, connectToSave);

            // 2. Transferir membros para o novo Connect e atualizar connectHistory
            for (const memberId of membersForNewConnect) {
                const memberRef = doc(db, `artifacts/${appId}/public/data/members`, memberId);
                const memberData = originalMembers.find(m => m.id === memberId);

                if (memberData) {
                    // Prepara histórico de Connect
                    const oldHistory = Array.isArray(memberData.connectHistory) ? [...memberData.connectHistory] : [];

                    // Fecha o período no connect antigo
                    const lastEntryIndex = oldHistory.length > 0 ? oldHistory.length - 1 : -1;
                    if (lastEntryIndex >= 0 && !oldHistory[lastEntryIndex].endDate) {
                        oldHistory[lastEntryIndex].endDate = now.split('T')[0];
                        oldHistory[lastEntryIndex].reason = 'Multiplicação de Connect';
                    } else if (lastEntryIndex === -1 && memberData.connectId) {
                        // Fallback se não tinha histórico válido antes
                        oldHistory.push({
                            connectId: memberData.connectId,
                            connectNumber: originalConnect.number,
                            startDate: memberData.createdAt?.split('T')[0] || '2000-01-01',
                            endDate: now.split('T')[0],
                            reason: 'Multiplicação de Connect'
                        });
                    }

                    // Inicia período no novo Connect
                    oldHistory.push({
                        connectId: newConnectId,
                        connectNumber: connectToSave.number,
                        startDate: now.split('T')[0],
                        endDate: null,
                    });

                    batch.update(memberRef, {
                        connectId: newConnectId,
                        connectHistory: oldHistory,
                        updatedAt: now,
                        lastModifiedBy: currentUserData?.id || 'unknown'
                    });
                }
            }

            // 2.5 Atualizar o e-mail do Líder (se foi recém-adicionado)
            const leaderMember = originalMembers.find(m => m.id === newConnectData.leaderId);
            if (leaderMember && leaderMember.email !== modalLeaderEmail) {
                const leaderRef = doc(db, `artifacts/${appId}/public/data/members`, newConnectData.leaderId);
                batch.update(leaderRef, {
                    email: modalLeaderEmail,
                    updatedAt: now,
                    lastModifiedBy: currentUserData?.id || 'unknown'
                });
            }

            // 3. Opcional: Adicionar evento no histórico do Connect antigo (apenas para registro)
            const oldConnectRef = doc(db, `artifacts/${appId}/public/data/connects`, originalConnect.id);
            const oldConnectHistory = Array.isArray(originalConnect.history) ? [...originalConnect.history] : [];
            oldConnectHistory.push({
                date: now,
                action: 'multiplied',
                details: `Multiplicado para gerar o Connect ${connectToSave.number} (${membersForNewConnect.length} membros transferidos)`,
                user: currentUserData?.name || 'Sistema'
            });

            batch.update(oldConnectRef, {
                history: oldConnectHistory,
                updatedAt: now,
                lastMultipliedAt: now
            });

            await batch.commit();

            setOperationStatus({ type: 'success', message: 'Connect multiplicado com sucesso! O novo Connect herdou as presenças passadas automaticamente na vida dos membros transferidos.' });

            // Navegat de volta após sucesso
            setTimeout(() => navigate('/connects'), 2000);

        } catch (error) {
            console.error("Erro ao multiplicar connect: ", error);
            setOperationStatus({ type: 'error', message: 'Erro ao multiplicar o Connect. Tente novamente.' });
            setSaving(false);
        }
    };


    if (loading || !hasPermission) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-gray-500">Carregando dados para multiplicação...</div>
            </div>
        );
    }

    return (
        <div className="pb-20 md:pb-8 max-w-6xl mx-auto">
            {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={300} />}

            <div className="flex items-center mb-6">
                <button
                    onClick={() => navigate('/connects')}
                    className="mr-4 p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    aria-label="Voltar para Connects"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center">
                        <CopyPlus className="mr-3 text-[#DC2626]" size={32} />
                        Multiplicação de Connect
                    </h2>
                    <p className="text-[#DC2626] font-medium mt-1">Parabéns pela multiplicação! O crescimento é o maior sinal de saúde de um Connect!</p>
                </div>
            </div>

            <form onSubmit={requestSave} className="space-y-6">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* COLUNA ESQUERDA: DEFINIÇÃO DO NOVO CONNECT E LIDERANÇA */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-[#DC2626]">
                            <h3 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">Novo Connect Gerado</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Número Alocado Automaticamente</label>
                                    <input
                                        type="text"
                                        value={newConnectData.number}
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none bg-gray-100 font-bold text-lg text-gray-700 font-mono"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">O próximo número disponível no sistema.</p>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Nome de Exibição do Novo Connect</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={newConnectData.name}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#DC2626]"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Dia da Reunião</label>
                                    <select
                                        name="weekday"
                                        value={newConnectData.weekday}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#DC2626]"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Domingo">Domingo</option>
                                        <option value="Segunda-feira">Segunda-feira</option>
                                        <option value="Terça-feira">Terça-feira</option>
                                        <option value="Quarta-feira">Quarta-feira</option>
                                        <option value="Quinta-feira">Quinta-feira</option>
                                        <option value="Sexta-feira">Sexta-feira</option>
                                        <option value="Sábado">Sábado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Horário</label>
                                    <input
                                        type="time"
                                        name="time"
                                        value={newConnectData.time}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#DC2626]"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Bairro</label>
                                    <input
                                        type="text"
                                        name="neighborhood"
                                        value={newConnectData.neighborhood}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#DC2626]"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Endereço Completo</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={newConnectData.address}
                                        onChange={handleFormChange}
                                        placeholder="Ex: Rua A, 123"
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#DC2626]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: SELEÇÃO DE MEMBROS */}
                    <div className="bg-white rounded-lg shadow-md flex flex-col h-full border-t-4 border-[#DC2626]">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-800 mb-1">Transferência de Membros</h3>
                            <p className="text-sm text-gray-600">Selecione quem fará parte do Novo Connect {newConnectData.number}. Eles serão automaticamente removidos do Connect original ({originalConnect?.number}).</p>

                            <div className="mt-4 flex justify-between text-sm font-bold bg-gray-100 p-3 rounded">
                                <span>Connect Original: <span className="text-gray-600">{originalMembers.length - membersForNewConnect.length}</span></span>
                                <span>No Novo Connect: <span className="text-[#DC2626]">{membersForNewConnect.length}</span></span>
                            </div>
                        </div>

                        <div className="flex-grow p-0 overflow-hidden flex flex-col" style={{ minHeight: '400px', maxHeight: '600px' }}>
                            {originalMembers.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 flex flex-col items-center justify-center h-full">
                                    <UserMinus size={48} className="mb-4 text-gray-300" />
                                    <p>O Connect Original não tem membros cadastrados.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-100 overflow-y-auto flex-grow p-2">
                                    {originalMembers.map(member => {
                                        const isSelected = membersForNewConnect.includes(member.id);
                                        const isLeader = newConnectData.leaderId === member.id;

                                        return (
                                            <li
                                                key={member.id}
                                                className={`p-3 rounded-lg flex items-center transition-colors mb-2 ${isSelected ? (isLeader ? 'bg-red-100 border border-red-300' : 'bg-red-50 border border-red-200') : 'hover:bg-gray-50 border border-transparent'
                                                    }`}
                                            >
                                                {!isSelected && (
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-gray-200 text-gray-500 font-bold select-none cursor-pointer hover:bg-gray-300 text-xl" onClick={() => handleMemberToggle(member.id)} title="Transferir para o Novo Connect">
                                                        <User size={20} />
                                                    </div>
                                                )}

                                                <div
                                                    className={`flex-grow cursor-pointer ${isSelected ? 'text-right' : 'text-left'}`}
                                                    onClick={() => handleMemberToggle(member.id)}
                                                >
                                                    <span className={`font-semibold block text-base ${isSelected ? 'text-[#DC2626]' : 'text-gray-800'}`}>
                                                        {member.name} {isLeader && <span className="text-xs ml-1 bg-[#DC2626] text-white px-2 py-0.5 rounded-full">NOVO LÍDER</span>}
                                                    </span>
                                                    {member.phone && <span className={`text-xs block ${isSelected ? 'text-red-400' : 'text-gray-500'}`}>{member.phone}</span>}
                                                </div>

                                                {isSelected && (
                                                    <div className="flex items-center ml-3 space-x-2">
                                                        <button
                                                            type="button"
                                                            title={isLeader ? "Este é o Novo Líder" : "Definir como Líder do Novo Connect"}
                                                            onClick={(e) => { e.stopPropagation(); handleLeaderSelect(member.id); }}
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isLeader ? 'bg-yellow-400 text-white shadow-md' : 'bg-gray-200 text-gray-400 hover:bg-yellow-100 hover:text-yellow-600'}`}
                                                        >
                                                            <Star size={16} fill={isLeader ? "currentColor" : "none"} />
                                                        </button>
                                                        <div
                                                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold select-none shadow-sm cursor-pointer ${isLeader ? 'bg-yellow-500 text-white' : 'bg-[#DC2626] text-white'} hover:opacity-80`}
                                                            onClick={(e) => { e.stopPropagation(); handleMemberToggle(member.id); }}
                                                            title="Remover do Novo Connect"
                                                        >
                                                            <UserCheck size={20} />
                                                        </div>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                    <button
                        type="button"
                        onClick={() => navigate('/connects')}
                        className="px-6 py-3 rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 font-bold text-lg font-medium transition-colors w-full sm:w-auto text-center"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className={`font-bold py-3 px-8 rounded-lg flex justify-center items-center transition-all shadow-md w-full sm:w-auto text-lg ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#DC2626] hover:bg-red-700 text-white'
                            }`}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></span>
                                Salvando Multiplicação...
                            </>
                        ) : (
                            <>
                                <CopyPlus className="mr-2" size={24} />
                                Confirmar Multiplicação
                            </>
                        )}
                    </button>
                </div>

            </form>

            {/* Modal de Confirmação */}
            {
                isConfirmModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
                            <div className="bg-[#DC2626] p-4 text-white flex justify-between items-center">
                                <h3 className="text-xl font-bold flex items-center">
                                    <CopyPlus className="mr-2" size={24} /> Confirmar Multiplicação
                                </h3>
                                <button onClick={() => setIsConfirmModalOpen(false)} className="text-red-100 hover:text-white">
                                    <Plus size={24} className="transform rotate-45" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <p className="text-gray-700 italic">Revise os detalhes da multiplicação antes de confirmar. Essa ação criará um novo Connect e atualizará o histórico de todos os envolvidos.</p>

                                <div className="bg-gray-50 rounded p-4 border border-gray-200">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase font-bold block">Novo Connect</span>
                                            <span className="text-lg font-bold text-gray-800">{newConnectData.name} ({newConnectData.number})</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase font-bold block">Reunião</span>
                                            <span className="text-sm font-semibold">{newConnectData.weekday || 'N/A'} às {newConnectData.time || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase font-bold block">Novo Líder (Estrela)</span>
                                            <span className="text-sm font-semibold text-[#DC2626]">{newConnectData.leaderName}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase font-bold block">Novo Supervisor</span>
                                            <span className="text-sm font-semibold text-gray-700">{newConnectData.supervisorName || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <span className="text-xs text-gray-500 uppercase font-bold block">Pastor Responsável</span>
                                        <span className="text-sm font-semibold text-gray-700">{newConnectData.pastorName || 'N/A'}</span>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                                        <span className="font-bold text-gray-600">Membros Transferidos:</span>
                                        <span className="font-bold text-blue-600 text-lg">{membersForNewConnect.length}</span>
                                    </div>
                                </div>

                                {/* Campo de e-mail mandatório */}
                                <div className="mt-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">
                                        E-mail de Acesso do Líder <span className="text-[#DC2626]">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={modalLeaderEmail}
                                        onChange={(e) => setModalLeaderEmail(e.target.value)}
                                        placeholder="email@exemplo.com"
                                        className="w-full px-3 py-3 border border-gray-300 rounded focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                                        required
                                    />
                                    {!originalMembers.find(m => m.id === newConnectData.leaderId)?.email && (
                                        <p className="text-xs text-[#DC2626] mt-1 font-semibold flex items-start">
                                            <Star size={12} className="mr-1 mt-0.5" />
                                            O membro escolhido como líder não posui e-mail no sistema. O e-mail informado aqui será adicionado ao cadastro dele para permitir o login.
                                        </p>
                                    )}
                                </div>

                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        type="button"
                                        className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-50"
                                        onClick={() => setIsConfirmModalOpen(false)}
                                    >
                                        Revisar
                                    </button>
                                    <button
                                        type="button"
                                        className="px-6 py-2 bg-[#DC2626] text-white rounded font-bold hover:bg-red-700 shadow flex items-center"
                                        onClick={confirmAndSave}
                                    >
                                        <Save size={18} className="mr-2" /> Confirmar e Salvar Tudo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default MultiplyConnectPage;
