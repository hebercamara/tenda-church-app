import React, { useState, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { Users, User, Plus, Trash2, Save, ChevronLeft, BookOpen, Mail } from 'lucide-react';
import LoadingButton from '../components/LoadingButton';

const CourseGroupsPage = ({ course, allMembers, onSaveGroups, onBack }) => {
    // Alunos matriculados na turma
    const enrolledStudents = useMemo(() => {
        const studentIds = (course.students || []).map(s => s.id);
        return allMembers.filter(m => studentIds.includes(m.id));
    }, [course.students, allMembers]);

    // Alunos elegíveis para serem auxiliares (precisam ter e-mail)
    const assistantOptions = useMemo(() => {
        return enrolledStudents.filter(m => m.email);
    }, [enrolledStudents]);

    // Carregar grupos iniciais da turma (ou array vazio)
    const [groups, setGroups] = useState(() => {
        const initial = Array.isArray(course.groups) ? course.groups : [];
        return initial.map(g => ({
            id: g.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: g.name || '',
            assistantId: g.assistantId || '',
            assistantName: g.assistantName || '',
            assistantEmail: g.assistantEmail || '',
            studentIds: Array.isArray(g.studentIds) ? g.studentIds : []
        }));
    });

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Alunos sem grupo (alunos matriculados que não estão em nenhum group)
    const unassignedStudents = useMemo(() => {
        const assignedIds = new Set();
        groups.forEach(g => {
            if (Array.isArray(g.studentIds)) {
                g.studentIds.forEach(id => assignedIds.add(id));
            }
        });
        return enrolledStudents.filter(s => !assignedIds.has(s.id));
    }, [enrolledStudents, groups]);

    // Criar novo grupo
    const handleAddGroup = () => {
        const newGroup = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: `Grupo ${groups.length + 1}`,
            assistantId: '',
            assistantName: '',
            assistantEmail: '',
            studentIds: []
        };
        setGroups(prev => [...prev, newGroup]);
    };

    // Excluir grupo
    const handleDeleteGroup = (groupId) => {
        setGroups(prev => prev.filter(g => g.id !== groupId));
    };

    // Atualizar nome do grupo
    const handleRenameGroup = (groupId, newName) => {
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                return { ...g, name: newName };
            }
            return g;
        }));
    };

    // Mudar auxiliar do grupo
    const handleSelectAssistant = (groupId, assistantId) => {
        const member = assistantOptions.find(m => m.id === assistantId);
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                return {
                    ...g,
                    assistantId: assistantId,
                    assistantName: member ? member.name : '',
                    assistantEmail: member ? member.email : ''
                };
            }
            return g;
        }));
    };

    // Mover aluno para um grupo
    const handleMoveToGroup = (studentId, groupId) => {
        setGroups(prev => {
            // Remover de qualquer grupo anterior se necessário
            const cleanGroups = prev.map(g => ({
                ...g,
                studentIds: g.studentIds.filter(id => id !== studentId)
            }));

            // Adicionar ao grupo destino
            return cleanGroups.map(g => {
                if (g.id === groupId) {
                    if (!g.studentIds.includes(studentId)) {
                        return { ...g, studentIds: [...g.studentIds, studentId] };
                    }
                }
                return g;
            });
        });
    };

    // Remover aluno de um grupo (volta a ser sem grupo)
    const handleRemoveFromGroup = (studentId, groupId) => {
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                return { ...g, studentIds: g.studentIds.filter(id => id !== studentId) };
            }
            return g;
        }));
    };

    // Salvar grupos
    const handleSave = async () => {
        // Validações
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
            setTimeout(() => {
                onBack();
            }, 1000);
        } catch (error) {
            console.error(error);
            setErrorMessage('Ocorreu um erro ao salvar os grupos. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
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
                            Turma: {course.name}
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
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {errorMessage}
                </div>
            )}
            {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                    {successMessage}
                </div>
            )}

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Column: Unassigned Students */}
                <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-sm border flex flex-col h-[70vh]">
                    <div className="border-b pb-3 mb-3">
                        <h3 className="font-bold text-gray-800 flex items-center justify-between">
                            <span>Alunos Sem Grupo</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                {unassignedStudents.length}
                            </span>
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {unassignedStudents.map(student => (
                            <div key={student.id} className="p-3 bg-gray-50 border rounded-lg flex flex-col gap-2">
                                <span className="font-medium text-gray-700 text-sm">{student.name}</span>
                                {groups.length > 0 ? (
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleMoveToGroup(student.id, e.target.value);
                                                e.target.value = ''; // Reset select
                                            }
                                        }}
                                        className="w-full bg-white text-xs border rounded p-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Adicionar ao...</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name || 'Grupo sem nome'}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="text-[10px] text-gray-400 italic">Crie um grupo para mover</span>
                                )}
                            </div>
                        ))}

                        {unassignedStudents.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm italic">
                                Todos os alunos já estão em grupos!
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Groups Grid */}
                <div className="lg:col-span-3 space-y-4">
                    {groups.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groups.map(group => {
                                const groupStudents = enrolledStudents.filter(s => group.studentIds.includes(s.id));
                                return (
                                    <div key={group.id} className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-[40vh]">
                                        {/* Card Header */}
                                        <div className="bg-gray-50 border-b p-3 flex items-center justify-between gap-3">
                                            <input
                                                type="text"
                                                value={group.name}
                                                onChange={(e) => handleRenameGroup(group.id, e.target.value)}
                                                className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#DC2626] focus:outline-none font-bold text-gray-800 text-sm px-1 py-0.5 w-full"
                                                placeholder="Nome do grupo..."
                                            />
                                            <button
                                                onClick={() => handleDeleteGroup(group.id)}
                                                className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                title="Remover grupo"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-3 flex-1 flex flex-col min-h-0 space-y-3">
                                            {/* Selector for Group Assistant */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase font-bold text-gray-500 flex items-center">
                                                    <User size={10} className="mr-1" />
                                                    Auxiliar do Grupo
                                                </label>
                                                <select
                                                    value={group.assistantId}
                                                    onChange={(e) => handleSelectAssistant(group.id, e.target.value)}
                                                    className="w-full bg-white border rounded p-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
                                                >
                                                    <option value="">Selecione um auxiliar...</option>
                                                    {assistantOptions.map(opt => (
                                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                                    ))}
                                                </select>
                                                {group.assistantEmail && (
                                                    <p className="text-[10px] text-gray-400 flex items-center px-1">
                                                        <Mail size={10} className="mr-1" />
                                                        {group.assistantEmail}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Group Members List */}
                                            <div className="flex-1 flex flex-col min-h-0">
                                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center justify-between">
                                                    <span>Alunos no Grupo</span>
                                                    <span>{groupStudents.length}</span>
                                                </label>
                                                <div className="flex-1 overflow-y-auto border rounded bg-gray-50 p-2 space-y-1">
                                                    {groupStudents.map(student => (
                                                        <div key={student.id} className="bg-white border p-1.5 rounded flex items-center justify-between text-xs hover:shadow-sm">
                                                            <span className="font-medium text-gray-700 truncate">{student.name}</span>
                                                            <button
                                                                onClick={() => handleRemoveFromGroup(student.id, group.id)}
                                                                className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors"
                                                                title="Remover do grupo"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}

                                                    {groupStudents.length === 0 && (
                                                        <div className="text-center py-6 text-gray-400 text-xs italic">
                                                            Nenhum aluno neste grupo
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
