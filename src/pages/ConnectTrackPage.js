import React, { useState, useMemo } from 'react';
import { CheckCircle2, Circle, RotateCcw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMembershipType, getMembershipTypeBadge } from '../utils/memberUtils';

const ConnectTrackPage = ({
    connect,
    membersInConnect = [],
    allCourses = [],
    courseTemplates = [],
    allCourseTemplates = [],
    allConnects = [],
    onBack,
    attendanceAlerts,
    onReactivateMember,
    onEditMember
}) => {
    const navigate = useNavigate();
    const [expandedSections, setExpandedSections] = useState({
        activeMembers: true,
        inactiveMembers: false
    });

    const milestonesDef = [
        { id: 'salvation', label: 'Aceitou a Jesus' },
        { id: 'initialDiscipleship', label: 'Discipulado Inicial' },
        { id: 'baptism', label: 'Batismo' },
        { id: 'membership', label: 'Membresia' },
        { id: 'connectTraining', label: 'Treinamento no Connect' },
        { id: 'connectLeader', label: 'Líder de Connect' },
    ];

    // Modelos de cursos disponíveis (ordenados por prioridade definida no módulo de modelos)
    const availableTemplates = useMemo(() => {
        const rawList = (courseTemplates && courseTemplates.length > 0)
            ? courseTemplates
            : (allCourseTemplates || []);
        return rawList.slice().sort((a, b) => {
            const orderA = typeof a.order === 'number' && !isNaN(a.order) ? a.order : 999;
            const orderB = typeof b.order === 'number' && !isNaN(b.order) ? b.order : 999;
            if (orderA !== orderB) return orderA - orderB;
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [courseTemplates, allCourseTemplates]);

    // Separar membros ativos e inativos
    const { activeMembers, inactiveMembers } = useMemo(() => {
        const active = [];
        const inactive = [];
        
        membersInConnect.forEach(member => {
            if (member.connectId === connect.id) {
                active.push(member);
            } else {
                // Verificar se o membro já esteve neste Connect
                const wasInConnect = member.connectHistory?.some(entry => entry.connectId === connect.id);
                if (wasInConnect) {
                    inactive.push(member);
                }
            }
        });
        
        return { 
            activeMembers: active.sort((a, b) => a.name.localeCompare(b.name)),
            inactiveMembers: inactive.sort((a, b) => a.name.localeCompare(b.name))
        };
    }, [membersInConnect, connect.id]);

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const formatMilestoneDate = (dateVal) => {
        if (!dateVal) return '';
        try {
            if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
                const [year, month, day] = dateVal.split('-');
                return `${day}/${month}/${year}`;
            }
            const d = new Date(dateVal);
            return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
        } catch (e) {
            return '';
        }
    };

    const getMilestoneStatus = (member, milestoneId) => {
        const milestone = member?.milestones?.[milestoneId];
        const hasDate = Boolean(milestone?.date && milestone.date !== null && milestone.date !== '');
        let isCompleted = Boolean(milestone?.completed || hasDate);
        let date = hasDate ? milestone.date : null;

        // Se o marco não está marcado diretamente, verifica se concluiu curso vinculado a este marco
        if (!isCompleted && Array.isArray(member?.completedCourses) && member.completedCourses.length > 0) {
            const matchingCompleted = member.completedCourses.find(c => {
                if (c.templateId) {
                    const tmpl = availableTemplates.find(t => t.id === c.templateId);
                    if (tmpl && tmpl.linkedMilestoneId === milestoneId) return true;
                }
                // Fallback para Aliança de Membresia
                if (milestoneId === 'membership') {
                    const cName = (c?.courseName || c?.name || '').toLowerCase();
                    return cName.includes('aliança') || cName.includes('alianca') || cName.includes('membresia');
                }
                return false;
            });

            if (matchingCompleted) {
                isCompleted = true;
                if (matchingCompleted.completionDate) {
                    date = matchingCompleted.completionDate.toDate
                        ? matchingCompleted.completionDate.toDate().toISOString().split('T')[0]
                        : new Date(matchingCompleted.completionDate).toISOString().split('T')[0];
                }
            }
        }

        return {
            completed: isCompleted,
            pending: Boolean(milestone?.pending),
            date: date
        };
    };

    /**
     * Verifica se o membro concluiu um curso correspondente a um modelo específico.
     * Retorna { completed: boolean, date: string|null }.
     */
    const getTemplateStatus = (member, template) => {
        if (!member) return { completed: false, date: null };

        // 1. Verificar em member.completedCourses
        if (Array.isArray(member.completedCourses) && member.completedCourses.length > 0) {
            const found = member.completedCourses.find(c => {
                // Correspondência direta por templateId
                if (c.templateId && c.templateId === template.id) return true;
                if (c.courseTemplateId && c.courseTemplateId === template.id) return true;

                // Correspondência pela turma associada
                if (c.courseId || c.id) {
                    const courseObj = allCourses.find(course => course.id === (c.courseId || c.id));
                    if (courseObj && courseObj.templateId === template.id) return true;
                }

                // Correspondência por nome do modelo/curso
                const cName = (c.courseName || c.name || '').trim().toLowerCase();
                const tName = (template.name || '').trim().toLowerCase();
                if (cName && tName && (cName === tName || cName.startsWith(tName))) return true;

                return false;
            });

            if (found) {
                let completionDate = null;
                if (found.completionDate) {
                    completionDate = found.completionDate.toDate
                        ? found.completionDate.toDate().toISOString().split('T')[0]
                        : new Date(found.completionDate).toISOString().split('T')[0];
                }
                return { completed: true, date: completionDate };
            }
        }

        // 2. Se o modelo estiver vinculado a um marco do trilho (ex: linkedMilestoneId === 'membership')
        if (template.linkedMilestoneId && member.milestones?.[template.linkedMilestoneId]) {
            const m = member.milestones[template.linkedMilestoneId];
            const hasDate = Boolean(m.date && m.date !== null && m.date !== '');
            if (m.completed || hasDate) {
                return { completed: true, date: hasDate ? m.date : null };
            }
        }

        // 3. Fallback especial para Aliança de Membresia
        const tName = (template.name || '').toLowerCase();
        if ((tName.includes('aliança') || tName.includes('alianca') || tName.includes('membresia')) && member.milestones?.membership) {
            const m = member.milestones.membership;
            const hasDate = Boolean(m.date && m.date !== null && m.date !== '');
            if (m.completed || hasDate) {
                return { completed: true, date: hasDate ? m.date : null };
            }
        }

        return { completed: false, date: null };
    };

    const renderMilestoneCell = (member, milestone) => {
        const status = getMilestoneStatus(member, milestone.id);
        
        if (status.completed) {
            return (
                <div className="flex flex-col items-center">
                    <CheckCircle2 size={16} className="text-green-500" />
                    {status.date && (
                        <span className="text-xs text-gray-500 mt-1">
                            {formatMilestoneDate(status.date)}
                        </span>
                    )}
                </div>
            );
        } else if (status.pending) {
            return (
                <div className="flex flex-col items-center">
                    <Circle size={16} className="text-yellow-500" />
                    <span className="text-xs text-yellow-600 mt-1">Pendente</span>
                </div>
            );
        } else {
            return <Circle size={16} className="text-gray-300" />;
        }
    };

    const renderTemplateCell = (member, template) => {
        const status = getTemplateStatus(member, template);
        if (status.completed) {
            return (
                <div className="flex flex-col items-center">
                    <CheckCircle2 size={16} className="text-green-500" />
                    {status.date && (
                        <span className="text-xs text-gray-500 mt-1">
                            {formatMilestoneDate(status.date)}
                        </span>
                    )}
                </div>
            );
        }
        return <Circle size={16} className="text-gray-300" />;
    };

    const handleReactivateMember = (member) => {
        if (onReactivateMember) {
            onReactivateMember(member, connect.id);
        }
    };

    const handleEditMember = (member) => {
        if (onEditMember) {
            onEditMember(member, true); // true indica que deve abrir em modo de edição
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onBack ? onBack() : navigate('/connects')}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span>Voltar</span>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Trilho de Liderança</h1>
                        <p className="text-gray-600">{connect.name}</p>
                    </div>
                </div>
            </div>

            {/* Membros Ativos */}
            <div className="mb-8">
                <button
                    onClick={() => toggleSection('activeMembers')}
                    className="flex items-center justify-between w-full p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors mb-4"
                >
                    <h2 className="text-lg font-semibold text-green-800">
                        Membros Ativos ({activeMembers.length})
                    </h2>
                    <span className={`transform transition-transform ${expandedSections.activeMembers ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </button>

                {expandedSections.activeMembers && (
                    <div className="overflow-x-auto">
                        <table className="w-full bg-white rounded-lg shadow">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                                        Membro
                                    </th>
                                    {milestonesDef.map(milestone => (
                                        <th key={milestone.id} className="p-3 text-center font-semibold text-gray-700 min-w-[120px]">
                                            <div className="text-xs">{milestone.label}</div>
                                        </th>
                                    ))}
                                    {availableTemplates.map((template, idx) => (
                                        <th key={template.id} className="p-3 text-center font-semibold text-gray-700 min-w-[120px]">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded-full" title={`Prioridade #${template.order || idx + 1} no Trilho`}>
                                                    #{template.order || idx + 1}
                                                </span>
                                                <span className="text-xs font-semibold text-gray-800">{template.name}</span>
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-normal">Modelo de Curso</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activeMembers.map(member => {
                                    const memberType = getMembershipType(member, availableTemplates);
                                    const badge = getMembershipTypeBadge(memberType);
                                    return (
                                        <tr 
                                            key={member.id} 
                                            className="border-t hover:bg-blue-50 cursor-pointer transition-colors"
                                            onClick={() => handleEditMember(member)}
                                            title="Clique para editar o trilho do membro"
                                        >
                                            <td className="p-3 font-medium text-gray-800 sticky left-0 bg-white hover:bg-blue-50 z-10">
                                                <div className="flex items-center gap-2">
                                                    <span>{member.name}</span>
                                                    <span
                                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.bg} ${badge.color} ${badge.border}`}
                                                        title={badge.title}
                                                    >
                                                        {badge.label}
                                                    </span>
                                                </div>
                                            </td>
                                            {milestonesDef.map(milestone => (
                                                <td key={milestone.id} className="p-3 text-center">
                                                    {renderMilestoneCell(member, milestone)}
                                                </td>
                                            ))}
                                            {availableTemplates.map(template => (
                                                <td key={template.id} className="p-3 text-center">
                                                    {renderTemplateCell(member, template)}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        
                        {activeMembers.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                Nenhum membro ativo neste Connect
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Membros Inativos */}
            {inactiveMembers.length > 0 && (
                <div className="mb-8">
                    <button
                        onClick={() => toggleSection('inactiveMembers')}
                        className="flex items-center justify-between w-full p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors mb-4"
                    >
                        <h2 className="text-lg font-semibold text-red-800">
                            Membros Inativos ({inactiveMembers.length})
                        </h2>
                        <span className={`transform transition-transform ${expandedSections.inactiveMembers ? 'rotate-180' : ''}`}>
                            ▼
                        </span>
                    </button>

                    {expandedSections.inactiveMembers && (
                        <div className="overflow-x-auto">
                            <table className="w-full bg-white rounded-lg shadow">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3 text-left font-semibold text-gray-700">Membro</th>
                                        <th className="p-3 text-center font-semibold text-gray-700">Connect Atual</th>
                                        <th className="p-3 text-center font-semibold text-gray-700">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inactiveMembers.map(member => (
                                        <tr key={member.id} className="border-t hover:bg-gray-50">
                                            <td className="p-3 font-medium text-gray-800">{member.name}</td>
                                            <td className="p-3 text-center text-gray-600">
                                                {member.connectId ? 
                                                    allConnects.find(c => c.id === member.connectId)?.name || 'Connect não encontrado' :
                                                    'Sem Connect'
                                                }
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handleReactivateMember(member)}
                                                    className="flex items-center gap-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors mx-auto"
                                                    title="Reativar neste Connect"
                                                >
                                                    <RotateCcw size={14} />
                                                    <span className="text-sm">Reativar</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ConnectTrackPage;