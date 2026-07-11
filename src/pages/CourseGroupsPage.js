import React, { useState, useMemo, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { Users, User, Plus, Trash2, Save, ChevronLeft, BookOpen, Mail, Search, X, ArrowRight } from 'lucide-react';
import LoadingButton from '../components/LoadingButton';
import PersonAutocomplete from '../components/PersonAutocomplete';

const CourseGroupsPage = ({ course, allMembers, allSimpleMembers, onSaveGroups, onBack }) => {
    // Alunos matriculados na turma
    const enrolledStudents = useMemo(() => {
        const studentIds = (course.students || []).map(s => s.id);
        const combined = [...(Array.isArray(allMembers) ? allMembers : []), ...(Array.isArray(allSimpleMembers) ? allSimpleMembers : [])];
        return combined.filter(m => studentIds.includes(m.id));
    }, [course.students, allMembers, allSimpleMembers]);

    // Alunos elegíveis para serem auxiliares (precisam ter e-mail)
    const assistantOptions = useMemo(() => {
        return enrolledStudents.filter(m => m.email);
    }, [enrolledStudents]);

    // Carregar grupos iniciais da turma (ou array vazio)
    const [groups, setGroups] = useState(() => {
        const initial = Array.isArray(course.groups) ? course.groups : [];
        return initial.map(g => {
            let assistants = Array.isArray(g.assistants) ? g.assistants : [];
            if (assistants.length === 0 && g.assistantId) {
                assistants = [{ id: g.assistantId, name: g.assistantName || '', email: g.assistantEmail || '' }];
            }
            return {
                id: g.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: g.name || '',
                assistants: assistants,
                studentIds: Array.isArray(g.studentIds) ? g.studentIds : []
            };
        });
    });

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // ── Buscas ────────────────────────────────────────────────────────────────
    const [unassignedSearch, setUnassignedSearch] = useState('');
    // Busca por grupo: { [groupId]: string }
    const [groupSearches, setGroupSearches] = useState({});
    const unassignedSearchRef = useRef(null);

    // Alunos sem grupo
    const unassignedStudents = useMemo(() => {
        const assignedIds = new Set();
        groups.forEach(g => {
            if (Array.isArray(g.studentIds)) {
                g.studentIds.forEach(id => assignedIds.add(id));
            }
        });
        return enrolledStudents.filter(s => !assignedIds.has(s.id));
    }, [enrolledStudents, groups]);

    // Alunos sem grupo filtrados pela busca
    const filteredUnassigned = useMemo(() => {
        const q = unassignedSearch.trim().toLowerCase();
        if (!q) return unassignedStudents;
        return unassignedStudents.filter(s => s.name?.toLowerCase().includes(q));
    }, [unassignedStudents, unassignedSearch]);

    // Criar novo grupo
    const handleAddGroup = () => {
        const newGroup = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: `Grupo ${groups.length + 1}`,
            assistants: [],
            studentIds: []
        };
        setGroups(prev => [...prev, newGroup]);
    };

    const handleDeleteGroup = (groupId) => {
        setGroups(prev => prev.filter(g => g.id !== groupId));
    };

    const handleRenameGroup = (groupId, newName) => {
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: newName } : g));
    };

    const handleAddAssistant = (groupId, assistantId) => {
        if (!assistantId) return;
        const member = assistantOptions.find(m => m.id === assistantId);
        if (!member) return;
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                if (g.assistants.some(a => a.id === assistantId)) return g;
                return { ...g, assistants: [...g.assistants, { id: member.id, name: member.name, email: member.email }] };
            }
            return g;
        }));
    };

    const handleRemoveAssistant = (groupId, assistantId) => {
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                return { ...g, assistants: g.assistants.filter(a => a.id !== assistantId) };
            }
            return g;
        }));
    };

    const handleMoveToGroup = (studentId, groupId) => {
        setGroups(prev => {
            const clean = prev.map(g => ({
                ...g,
                studentIds: g.studentIds.filter(id => id !== studentId)
            }));
            return clean.map(g => {
                if (g.id === groupId && !g.studentIds.includes(studentId)) {
                    return { ...g, studentIds: [...g.studentIds, studentId] };
                }
                return g;
            });
        });
    };

    const handleRemoveFromGroup = (studentId, groupId) => {
        setGroups(prev => prev.map(g =>
            g.id === groupId
                ? { ...g, studentIds: g.studentIds.filter(id => id !== studentId) }
                : g
        ));
    };

    const handleSave = async () => {
        if (groups.some(g => !g.name.trim())) {
            setErrorMessage('Todos os grupos precisam ter um nome.');
            return;
        }
        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            await onSaveGroups(course.id, groups);
            setSuccessMessage('Grupos salvos com sucesso!');
            setTimeout(() => onBack(), 1000);
        } catch (error) {
            console.error(error);
            setErrorMessage('Ocorreu um erro ao salvar os grupos. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const setGroupSearch = (groupId, value) => {
        setGroupSearches(prev => ({ ...prev, [groupId]: value }));
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                        title="Voltar para Turmas"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
                            <Users className="mr-2 text-[#DC2626]" size={28} />
                            Gerenciar Grupos
                        </h2>
                        <p className="text-gray-600 mt-1 flex items-center text-sm">
                            <BookOpen size={14} className="mr-1 text-gray-400" />
                            Turma: {course.name} · {enrolledStudents.length} alunos matriculados
                        </p>
                    </div>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={handleAddGroup}
                        className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg flex items-center space-x-2 transition-all"
                    >
                        <Plus size={20} />
                        <span>Novo Grupo</span>
                    </button>
                    <LoadingButton
                        onClick={handleSave}
                        isLoading={isLoading}
                        className="px-5 py-2 bg-[#DC2626] hover:bg-[#991B1B] text-white font-semibold rounded-lg flex items-center space-x-2 transition-all shadow"
                    >
                        <Save size={20} />
                        <span>Salvar Grupos</span>
                    </LoadingButton>
                </div>
            </div>

            {/* Alert Messages */}
            {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{errorMessage}</div>
            )}
            {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">{successMessage}</div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* ── Coluna Esquerda: Alunos Sem Grupo ── */}
                <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-sm border flex flex-col" style={{ maxHeight: '75vh' }}>
                    <div className="border-b pb-3 mb-3 flex-shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-gray-800">Sem Grupo</h3>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                                {unassignedStudents.length}
                            </span>
                        </div>
                        {/* Campo de busca */}
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={unassignedSearchRef}
                                type="text"
                                value={unassignedSearch}
                                onChange={e => setUnassignedSearch(e.target.value)}
                                placeholder="Buscar aluno..."
                                className="w-full pl-8 pr-7 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] bg-gray-50"
                            />
                            {unassignedSearch && (
                                <button
                                    onClick={() => setUnassignedSearch('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        {unassignedSearch && (
                            <p className="text-xs text-gray-400 mt-1">
                                {filteredUnassigned.length} resultado{filteredUnassigned.length !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {filteredUnassigned.map(student => (
                            <div key={student.id} className="p-2.5 bg-gray-50 border rounded-lg flex flex-col gap-1.5 hover:border-red-200 transition">
                                <span className="font-medium text-gray-700 text-sm leading-tight">{student.name}</span>
                                {groups.length > 0 ? (
                                    <select
                                        onChange={e => {
                                            if (e.target.value) {
                                                handleMoveToGroup(student.id, e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        className="w-full bg-white text-xs border rounded p-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Mover para...</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name || 'Grupo sem nome'}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="text-[10px] text-gray-400 italic">Crie um grupo para mover</span>
                                )}
                            </div>
                        ))}

                        {filteredUnassigned.length === 0 && unassignedSearch && (
                            <div className="text-center py-6 text-gray-400 text-sm italic">
                                Nenhum aluno encontrado para "{unassignedSearch}"
                            </div>
                        )}
                        {filteredUnassigned.length === 0 && !unassignedSearch && (
                            <div className="text-center py-8 text-gray-400 text-sm italic">
                                Todos os alunos já estão em grupos! ✓
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Coluna Direita: Grupos ── */}
                <div className="lg:col-span-3 space-y-4">
                    {groups.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groups.map(group => {
                                const groupStudents = enrolledStudents.filter(s => group.studentIds.includes(s.id));
                                const groupSearch = groupSearches[group.id] || '';

                                // Alunos NÃO neste grupo que correspondem à busca (para adicionar rapidamente)
                                const searchResults = groupSearch.trim()
                                    ? unassignedStudents.filter(s =>
                                        s.name?.toLowerCase().includes(groupSearch.toLowerCase())
                                    )
                                    : [];

                                return (
                                    <div key={group.id} className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col" style={{ maxHeight: '75vh' }}>
                                        {/* Card Header */}
                                        <div className="bg-gray-50 border-b p-3 flex items-center justify-between gap-3 flex-shrink-0">
                                            <input
                                                type="text"
                                                value={group.name}
                                                onChange={e => handleRenameGroup(group.id, e.target.value)}
                                                className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#DC2626] focus:outline-none font-bold text-gray-800 text-sm px-1 py-0.5 w-full"
                                                placeholder="Nome do grupo..."
                                            />
                                            <button
                                                onClick={() => handleDeleteGroup(group.id)}
                                                className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                                                title="Remover grupo"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-3 flex-1 flex flex-col min-h-0 space-y-2.5 overflow-y-auto">
                                            {/* Auxiliares */}
                                            <div className="space-y-1 flex-shrink-0">
                                                <label className="text-[10px] uppercase font-bold text-gray-500 flex items-center">
                                                    <User size={10} className="mr-1" /> Auxiliares do Grupo
                                                </label>
                                                <div className="space-y-1">
                                                    {(group.assistants || []).map(a => (
                                                        <div key={a.id} className="flex justify-between items-center bg-slate-700 border border-slate-800 rounded p-1 text-xs">
                                                            <div className="flex-1 truncate" title={a.email}>
                                                                <span className="font-medium text-white">{a.name}</span>
                                                            </div>
                                                            <button onClick={() => handleRemoveAssistant(group.id, a.id)} className="text-red-400 hover:text-red-300 ml-1">
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-1">
                                                    <PersonAutocomplete
                                                        value=""
                                                        onChange={val => handleAddAssistant(group.id, val)}
                                                        placeholder="+ Adicionar auxiliar..."
                                                        options={assistantOptions
                                                            .filter(opt => !(group.assistants || []).some(a => a.id === opt.id))
                                                            .map(opt => ({ label: opt.name, value: opt.id }))}
                                                        className="text-xs"
                                                    />
                                                </div>
                                            </div>

                                            {/* ── Busca rápida para adicionar ao grupo ── */}
                                            <div className="flex-shrink-0">
                                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">
                                                    Adicionar Aluno
                                                </label>
                                                <div className="relative">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={groupSearch}
                                                        onChange={e => setGroupSearch(group.id, e.target.value)}
                                                        placeholder="Buscar nos sem grupo..."
                                                        className="w-full pl-7 pr-7 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#DC2626] bg-gray-50"
                                                    />
                                                    {groupSearch && (
                                                        <button
                                                            onClick={() => setGroupSearch(group.id, '')}
                                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                        >
                                                            <X size={11} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Resultados da busca para adicionar */}
                                                {searchResults.length > 0 && (
                                                    <div className="mt-1 border rounded bg-white shadow-sm max-h-24 overflow-y-auto">
                                                        {searchResults.map(s => (
                                                            <button
                                                                key={s.id}
                                                                onClick={() => {
                                                                    handleMoveToGroup(s.id, group.id);
                                                                    setGroupSearch(group.id, '');
                                                                }}
                                                                className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-red-50 hover:text-[#991B1B] flex items-center justify-between group transition border-b last:border-0"
                                                            >
                                                                <span className="font-medium truncate">{s.name}</span>
                                                                <span className="flex-shrink-0 flex items-center gap-0.5 text-[#DC2626] opacity-0 group-hover:opacity-100 transition text-[10px] font-semibold">
                                                                    Adicionar <ArrowRight size={10} />
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {groupSearch.trim() && searchResults.length === 0 && (
                                                    <p className="text-[10px] text-gray-400 italic mt-1 px-1">
                                                        Nenhum aluno sem grupo encontrado
                                                    </p>
                                                )}
                                            </div>

                                            {/* Lista de membros do grupo */}
                                            <div className="flex-1 flex flex-col min-h-0">
                                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center justify-between flex-shrink-0">
                                                    <span>Alunos no Grupo</span>
                                                    <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                                                        {groupStudents.length}
                                                    </span>
                                                </label>
                                                <div className="flex-1 overflow-y-auto border rounded bg-gray-50 p-1.5 space-y-1">
                                                    {groupStudents.map(student => (
                                                        <div key={student.id} className="bg-white border p-1.5 rounded flex items-center justify-between text-xs hover:shadow-sm group">
                                                            <span className="font-medium text-gray-700 truncate">{student.name}</span>
                                                            <button
                                                                onClick={() => handleRemoveFromGroup(student.id, group.id)}
                                                                className="text-gray-300 hover:text-red-500 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                                                title="Remover do grupo"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {groupStudents.length === 0 && (
                                                        <div className="text-center py-4 text-gray-400 text-xs italic">
                                                            Use a busca acima para adicionar alunos
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white border rounded-xl p-12 text-center text-gray-500">
                            <Users className="mx-auto text-gray-300 mb-4" size={48} />
                            <h4 className="font-bold text-lg text-gray-700">Nenhum grupo criado ainda</h4>
                            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                                Clique em "Novo Grupo" no topo para dividir os alunos em grupos menores e designar auxiliares.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseGroupsPage;
