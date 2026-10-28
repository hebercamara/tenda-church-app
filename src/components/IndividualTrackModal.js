import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Edit, Calendar, Loader2, Check } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getTenantId } from '../utils/tenantUtils';

const formatMilestoneDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }
        return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
        return dateStr;
    }
};

const milestonesDef = [
    { id: 'salvation', label: 'Aceitou a Jesus' },
    { id: 'initialDiscipleship', label: 'Discipulado Inicial' },
    { id: 'baptism', label: 'Batismo' },
    { id: 'membership', label: 'Membresia' },
    { id: 'connectTraining', label: 'Treinamento no Connect' },
    { id: 'connectLeader', label: 'Líder de Connect' },
];

const IndividualTrackModal = ({ member, completedCourses, memberConnectHistoryDetails, onBack, onSave, title }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [milestoneData, setMilestoneData] = useState(() => {
        const initial = {};
        milestonesDef.forEach(m => {
            initial[m.id] = { completed: false, date: '' };
        });
        return initial;
    });

    // Carregar dados reais dos marcos do membro
    useEffect(() => {
        if (member) {
            const memberMilestones = {};
            milestonesDef.forEach(mDef => {
                const raw = member.milestones?.[mDef.id] || {};
                const isCompleted = Boolean(raw.completed || (raw.date && raw.date !== null && raw.date !== ''));
                memberMilestones[mDef.id] = {
                    completed: isCompleted,
                    date: raw.date || ''
                };
            });
            setMilestoneData(memberMilestones);
        }
    }, [member]);

    const handleCheckboxChange = (milestoneId, checked) => {
        const todayIso = new Date().toISOString().split('T')[0];
        setMilestoneData(prev => {
            const current = prev[milestoneId] || {};
            return {
                ...prev,
                [milestoneId]: {
                    completed: checked,
                    // Se marcou como concluído e não tinha data, preenche automaticamente com a data de hoje
                    date: checked ? (current.date || todayIso) : ''
                }
            };
        });
    };

    const handleDateChange = (milestoneId, dateValue) => {
        setMilestoneData(prev => ({
            ...prev,
            [milestoneId]: {
                completed: Boolean(dateValue),
                date: dateValue
            }
        }));
    };

    const handleEdit = async () => {
        if (isEditing) {
            setIsSaving(true);
            setSaveSuccess(false);

            try {
                const todayIso = new Date().toISOString().split('T')[0];
                const milestonesToSave = {};

                milestonesDef.forEach(mDef => {
                    const current = milestoneData[mDef.id] || {};
                    const isCompleted = Boolean(current.completed || current.date);
                    milestonesToSave[mDef.id] = {
                        completed: isCompleted,
                        date: isCompleted ? (current.date || todayIso) : null
                    };
                });

                if (onSave) {
                    await onSave(member.id, milestonesToSave);
                } else {
                    const memberRef = doc(db, `artifacts/${getTenantId()}/public/data/members`, member.id);
                    await updateDoc(memberRef, {
                        milestones: milestonesToSave
                    });
                }

                // Atualiza o objeto do membro em memória para reflexo imediato
                if (member) {
                    member.milestones = milestonesToSave;
                }

                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 2000);
            } catch (error) {
                console.error('Erro ao salvar marcos:', error);
                alert('Erro ao salvar os dados. Tente novamente.');
                setIsSaving(false);
                return;
            } finally {
                setIsSaving(false);
            }
        }
        setIsEditing(!isEditing);
    };

    return (
        <div className="p-4">
            {/* Nome da Pessoa e Botão de Editar */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">{member?.name}</h3>
                    {saveSuccess && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5">
                            <Check size={14} /> Salvo com sucesso!
                        </span>
                    )}
                </div>
                <button 
                    onClick={handleEdit}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        isEditing 
                            ? 'bg-[#DC2626] text-white hover:bg-[#991B1B] shadow-xs' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    {isSaving ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Salvando...</span>
                        </>
                    ) : isEditing ? (
                        <>
                            <Check size={16} />
                            <span>Salvar</span>
                        </>
                    ) : (
                        <>
                            <Edit size={16} />
                            <span>Editar</span>
                        </>
                    )}
                </button>
            </div>

            {/* Marcos Principais */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-gray-800 uppercase tracking-wider text-xs">Marcos Principais</h2>
                </div>
                
                <div className="space-y-2">
                    {milestonesDef.map((milestone, index) => {
                        const milestoneInfo = milestoneData[milestone.id] || { completed: false, date: '' };
                        return (
                            <div 
                                key={milestone.id} 
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                    milestoneInfo.completed 
                                        ? 'bg-green-50/70 border-green-200' 
                                        : 'bg-gray-50/70 border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                {isEditing ? (
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 text-[#DC2626] rounded focus:ring-[#DC2626] cursor-pointer"
                                        checked={milestoneInfo.completed}
                                        onChange={(e) => handleCheckboxChange(milestone.id, e.target.checked)}
                                    />
                                ) : (
                                    milestoneInfo.completed ? (
                                        <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                                    ) : (
                                        <Circle size={20} className="text-gray-300 flex-shrink-0" />
                                    )
                                )}
                                
                                <span className="text-gray-700 text-sm font-medium flex-1">
                                    {index + 1}. {milestone.label}
                                </span>
                                
                                {/* Campo de Data */}
                                <div className="flex items-center gap-2">
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={milestoneInfo.date}
                                            onChange={(e) => handleDateChange(milestone.id, e.target.value)}
                                            className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded bg-white focus:ring-2 focus:ring-[#DC2626] focus:outline-none"
                                        />
                                    ) : (
                                        milestoneInfo.date && (
                                            <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                                                <Calendar size={13} className="text-gray-400" />
                                                <span>{formatMilestoneDate(milestoneInfo.date)}</span>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Trilho de Cursos */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-gray-800 uppercase tracking-wider text-xs">Trilho de Cursos</h2>
                </div>
                
                <div className="space-y-2">
                    {completedCourses && completedCourses.length > 0 ? (
                        completedCourses.map((course, index) => (
                            <div key={course.id} className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50/60 border-blue-200">
                                <CheckCircle2 size={20} className="text-blue-600 flex-shrink-0" />
                                <span className="text-gray-700 text-sm font-medium flex-1">
                                    {index + 1}. {course.name}
                                </span>
                                {course.completionDate && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500 font-medium ml-auto">
                                        <Calendar size={13} className="text-gray-400" />
                                        <span>
                                            {formatMilestoneDate(
                                                course.completionDate.toDate 
                                                    ? course.completionDate.toDate().toISOString().split('T')[0]
                                                    : new Date(course.completionDate).toISOString().split('T')[0]
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg text-sm border border-dashed border-gray-300">
                            Nenhum curso concluído ainda
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IndividualTrackModal;