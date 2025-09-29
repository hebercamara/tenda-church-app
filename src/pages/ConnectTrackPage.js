import React, { useState, useMemo } from 'react';
import { CheckCircle2, Circle, RotateCcw, Calendar, Edit, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ConnectTrackPage = ({ connect, membersInConnect, allCourses, allConnects, onBack, attendanceAlerts, onReactivateMember, onEditMember }) => {
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

    const coursesFromTemplates = allCourses.filter(course => course.templateId).sort((a,b) => a.name.localeCompare(b.name));

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

    const getMilestoneStatus = (member, milestoneId) => {
        // Verificar se o membro tem marcos definidos
        if (!member.milestones || !member.milestones[milestoneId]) {
            return { completed: false };
        }
        
        const milestone = member.milestones[milestoneId];
        const hasDate = milestone.date && milestone.date !== null;
        
        return {
            completed: hasDate,
            date: hasDate ? milestone.date : null
        };
    };

    const getCourseStatus = (member, course) => {
        // Verificar se o membro concluiu este curso
        // Os cursos concluídos estão em member.completedCourses (carregados do Firebase)
        if (!member.completedCourses || member.completedCourses.length === 0) {
            return false;
        }
        
        return member.completedCourses.some(completedCourse => 
            completedCourse.courseId === course.id || 
            completedCourse.id === course.id ||
            completedCourse.name === course.name
        );
    };

    const renderMilestoneCell = (member, milestone) => {
        const status = getMilestoneStatus(member, milestone.id);
        
        if (status.completed) {
            return (
                <div className="flex flex-col items-center">
                    <CheckCircle2 size={16} className="text-green-500" />
                    {status.date && (
                        <span className="text-xs text-gray-500 mt-1">
                            {new Date(status.date).toLocaleDateString('pt-BR')}
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

    const renderCourseCell = (member, course) => {
        const completed = getCourseStatus(member, course);
        return completed ? 
            <CheckCircle2 size={16} className="text-green-500" /> : 
            <Circle size={16} className="text-gray-300" />;
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
                                    <th className="p-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">
                                        Membro
                                    </th>
                                    {milestonesDef.map(milestone => (
                                        <th key={milestone.id} className="p-3 text-center font-semibold text-gray-700 min-w-[120px]">
                                            <div className="text-xs">{milestone.label}</div>
                                        </th>
                                    ))}
                                    {coursesFromTemplates.slice(0, 5).map(course => (
                                        <th key={course.id} className="p-3 text-center font-semibold text-gray-700 min-w-[100px]">
                                            <div className="text-xs">{course.name}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activeMembers.map(member => (
                                    <tr 
                                        key={member.id} 
                                        className="border-t hover:bg-blue-50 cursor-pointer transition-colors"
                                        onClick={() => handleEditMember(member)}
                                        title="Clique para editar o trilho do membro"
                                    >
                                        <td className="p-3 font-medium text-gray-800 sticky left-0 bg-white hover:bg-blue-50 z-10">
                                            {member.name}
                                        </td>
                                        {milestonesDef.map(milestone => (
                                            <td key={milestone.id} className="p-3 text-center">
                                                {renderMilestoneCell(member, milestone)}
                                            </td>
                                        ))}
                                        {coursesFromTemplates.slice(0, 5).map(course => (
                                            <td key={course.id} className="p-3 text-center">
                                                {renderCourseCell(member, course)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
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