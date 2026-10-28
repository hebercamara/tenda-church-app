import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Edit, Calendar, Loader2, Check } from 'lucide-react';

const formatMilestoneDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        // Formato ISO yyyy-mm-dd: formatar diretamente sem criar objeto Date (evita fuso horário)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        }
        // Fallback para outros formatos
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR');
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

/**
 * Modal de Trilho de Liderança Individual.
 *
 * Regras de negócio:
 * - Um marco pode ser marcado como concluído SEM necessariamente ter data.
 * - A data é opcional — serve apenas como registro histórico.
 * - Ao marcar o checkbox, completed=true e date permanece como estava (vazio ou com valor).
 * - Ao desmarcar o checkbox, completed=false e date é limpa.
 * - Ao preencher a data, apenas a data é atualizada; completed NÃO é alterado automaticamente.
 * - O que é persistido: { completed: boolean, date: string | null }
 */
const IndividualTrackModal = ({ member, completedCourses, memberConnectHistoryDetails, onBack, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [milestoneData, setMilestoneData] = useState({});

    // Sempre que o membro mudar (abertura inicial ou atualização após save), sincronizar state
    useEffect(() => {
        if (!member) return;
        const loaded = {};
        milestonesDef.forEach(mDef => {
            const raw = member.milestones?.[mDef.id] ?? {};
            // Marco concluído = campo completed explicitamente true, OU data preenchida (compatibilidade retroativa)
            const isCompleted = raw.completed === true || (typeof raw.completed === 'undefined' && Boolean(raw.date));
            loaded[mDef.id] = {
                completed: Boolean(isCompleted),
                date: raw.date || '',
            };
        });
        setMilestoneData(loaded);
        // Ao trocar de membro, sai do modo edição automaticamente
        setIsEditing(false);
    }, [member?.id]); // Usa member.id para garantir re-execução ao trocar de membro

    const handleCheckboxChange = (milestoneId, checked) => {
        setMilestoneData(prev => ({
            ...prev,
            [milestoneId]: {
                // Mantém a data como estava — não força data automática
                date: checked ? prev[milestoneId]?.date ?? '' : '',
                completed: checked,
            }
        }));
    };

    const handleDateChange = (milestoneId, dateValue) => {
        setMilestoneData(prev => ({
            ...prev,
            [milestoneId]: {
                // Data é só um registro histórico, não altera o completed
                completed: prev[milestoneId]?.completed ?? false,
                date: dateValue,
            }
        }));
    };

    const handleSaveClick = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            // Monta o objeto de marcos para salvar
            const milestonesToSave = {};
            milestonesDef.forEach(mDef => {
                const current = milestoneData[mDef.id] ?? {};
                milestonesToSave[mDef.id] = {
                    completed: Boolean(current.completed),
                    // Salva a data se preenchida, null caso contrário
                    date: current.date || null,
                };
            });

            if (onSave) {
                await onSave(member.id, milestonesToSave);
            }

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
            setIsEditing(false);
        } catch (error) {
            console.error('Erro ao salvar marcos:', error);
            alert('Erro ao salvar os dados. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
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
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => { setIsEditing(false); }}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveClick}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-[#DC2626] text-white hover:bg-[#991B1B] transition-all"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} />
                                        <span>Salvar</span>
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                        >
                            <Edit size={16} />
                            <span>Editar</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Marcos Principais */}
            <div className="mb-8">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Marcos Principais</h2>

                <div className="space-y-2">
                    {milestonesDef.map((milestone, index) => {
                        const info = milestoneData[milestone.id] ?? { completed: false, date: '' };
                        return (
                            <div
                                key={milestone.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                    info.completed
                                        ? 'bg-green-50/70 border-green-200'
                                        : 'bg-gray-50/70 border-gray-200'
                                }`}
                            >
                                {isEditing ? (
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-[#DC2626] cursor-pointer flex-shrink-0"
                                        checked={info.completed}
                                        onChange={(e) => handleCheckboxChange(milestone.id, e.target.checked)}
                                    />
                                ) : (
                                    info.completed
                                        ? <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                                        : <Circle size={20} className="text-gray-300 flex-shrink-0" />
                                )}

                                <span className="text-gray-700 text-sm font-medium flex-1">
                                    {index + 1}. {milestone.label}
                                </span>

                                {/* Campo de Data (opcional) */}
                                <div className="flex items-center gap-2">
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={info.date}
                                            onChange={(e) => handleDateChange(milestone.id, e.target.value)}
                                            className="px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:ring-2 focus:ring-[#DC2626] focus:outline-none"
                                        />
                                    ) : (
                                        info.date && (
                                            <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                                                <Calendar size={13} className="text-gray-400" />
                                                <span>{formatMilestoneDate(info.date)}</span>
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
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Trilho de Cursos</h2>

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
                                                course.completionDate?.toDate
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