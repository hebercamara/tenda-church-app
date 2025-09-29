import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Edit, Calendar } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../firebaseConfig';

const IndividualTrackModal = ({ member, completedCourses, memberConnectHistoryDetails, onBack, title }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [milestoneData, setMilestoneData] = useState({
        salvation: { completed: false, date: '' },
        initialDiscipleship: { completed: false, date: '' },
        baptism: { completed: false, date: '' },
        membership: { completed: false, date: '' },
        connectTraining: { completed: false, date: '' },
        connectLeader: { completed: false, date: '' },
    });

    // Carregar dados reais dos marcos do membro
    useEffect(() => {
        if (member && member.milestones) {
            const memberMilestones = {};
            Object.keys(milestoneData).forEach(key => {
                const memberMilestone = member.milestones[key];
                memberMilestones[key] = {
                    completed: memberMilestone?.date ? true : false,
                    date: memberMilestone?.date || ''
                };
            });
            setMilestoneData(memberMilestones);
        }
    }, [member]);

    const milestonesDef = [
        { id: 'salvation', label: 'Aceitou a Jesus' },
        { id: 'initialDiscipleship', label: 'Discipulado Inicial' },
        { id: 'baptism', label: 'Batismo' },
        { id: 'membership', label: 'Membresia' },
        { id: 'connectTraining', label: 'Treinamento no Connect' },
        { id: 'connectLeader', label: 'Líder de Connect' },
    ];

    const handleEdit = async () => {
        if (isEditing) {
            // Salvar os dados no Firebase
            try {
                const memberRef = doc(db, `artifacts/${appId}/public/data/members`, member.id);
                const milestonesToSave = {};
                
                Object.keys(milestoneData).forEach(key => {
                    const milestone = milestoneData[key];
                    milestonesToSave[key] = {
                        date: milestone.completed ? milestone.date : null
                    };
                });
                
                await updateDoc(memberRef, {
                    milestones: milestonesToSave
                });
                
                console.log('Marcos salvos com sucesso!');
            } catch (error) {
                console.error('Erro ao salvar marcos:', error);
                alert('Erro ao salvar os dados. Tente novamente.');
                return; // Não sair do modo de edição se houve erro
            }
        }
        setIsEditing(!isEditing);
    };

    const handleMilestoneChange = (milestoneId, field, value) => {
        setMilestoneData(prev => ({
            ...prev,
            [milestoneId]: {
                ...prev[milestoneId],
                [field]: value
            }
        }));
    };

    return (
        <div className="p-4">
            {/* Nome da Pessoa e Botão de Editar */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-800">{member?.name}</h3>
                <button 
                    onClick={handleEdit}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isEditing 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                            : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                >
                    <Edit size={16} />
                    <span>{isEditing ? 'Salvar' : 'Editar'}</span>
                </button>
            </div>

            {/* Marcos Principais */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Marcos Principais</h2>
                </div>
                
                <div className="space-y-3">
                    {milestonesDef.map((milestone, index) => {
                        const milestoneInfo = milestoneData[milestone.id];
                        return (
                            <div key={milestone.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                                {isEditing ? (
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                                        checked={milestoneInfo.completed}
                                        onChange={(e) => handleMilestoneChange(milestone.id, 'completed', e.target.checked)}
                                    />
                                ) : (
                                    milestoneInfo.completed ? (
                                        <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                                    ) : (
                                        <Circle size={20} className="text-gray-300 flex-shrink-0" />
                                    )
                                )}
                                
                                <span className="text-gray-600 flex-1">
                                    {index + 1}. {milestone.label}
                                </span>
                                
                                {/* Campo de Data */}
                                <div className="flex items-center gap-2">
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={milestoneInfo.date}
                                            onChange={(e) => handleMilestoneChange(milestone.id, 'date', e.target.value)}
                                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        />
                                    ) : (
                                        milestoneInfo.date && (
                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                <Calendar size={14} />
                                                <span>{new Date(milestoneInfo.date).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        )
                                    )}
                                </div>
                                
                                {!isEditing && !milestoneInfo.completed && index === 2 && (
                                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                                        Pendente
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Trilho de Cursos */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Trilho de Cursos</h2>
                </div>
                
                <div className="space-y-3">
                    {completedCourses && completedCourses.length > 0 ? (
                        completedCourses.map((course, index) => (
                            <div key={course.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                                <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                                <span className="text-gray-600">
                                    {index + 1}. {course.name}
                                </span>
                                {course.completionDate && (
                                    <div className="flex items-center gap-1 text-sm text-gray-500 ml-auto">
                                        <Calendar size={14} />
                                        <span>{new Date(course.completionDate.toDate()).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-gray-500 text-center py-4">
                            Nenhum curso concluído ainda
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IndividualTrackModal;