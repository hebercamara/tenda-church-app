import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { CheckCircle2, Circle, Edit, Save, GraduationCap, History } from 'lucide-react';
// NOVO: Importando o store
import { useAuthStore } from '../store/authStore';
import { formatDateToBrazilian, formatDateForInput, convertBrazilianDateToISO } from '../utils/dateUtils';

// ALTERADO: O componente não recebe mais `currentUserData` e `isAdmin`
const LeadershipTrackModal = ({ isOpen, onClose, member, allConnects, onSave, completedCourses, memberConnectHistoryDetails }) => {
    // NOVO: Buscando os dados diretamente do store
    const { currentUserData, isAdmin } = useAuthStore();
    
    const [isEditing, setIsEditing] = useState(false);
    const [milestonesData, setMilestonesData] = useState({});

    useEffect(() => {
        if (member) {
            setMilestonesData(member.milestones || {});
        }
    }, [member]);

    const canEdit = useMemo(() => {
        if (!member || !currentUserData) return false;
        if (isAdmin) return true;
        
        const userLedConnects = allConnects.filter(c => c.leaderId === currentUserData.id).map(c => c.id);
        return userLedConnects.includes(member.connectId);
    }, [isAdmin, currentUserData, member, allConnects]);

    const leadershipTrackData = useMemo(() => {
        if (!member) return null;
        const connectLeaderInfo = allConnects.find(c => c.leaderId === member.id);
        const milestones = [
            { id: 'salvation', label: '1. Aceitou a Jesus', data: milestonesData.salvation },
            { id: 'initialDiscipleship', label: '2. Discipulado Inicial', data: milestonesData.initialDiscipleship },
            { id: 'baptism', label: '3. Batismo', data: milestonesData.baptism },
            { id: 'membership', label: '4. Membresia', data: milestonesData.membership },
            { id: 'connectTraining', label: '5. Treinamento no Connect', data: milestonesData.connectTraining },
            { 
                id: 'connectLeader', 
                label: '6. Líder de Connect', 
                isAutomatic: true,
                data: { 
                    completed: !!connectLeaderInfo, 
                    date: connectLeaderInfo ? `Líder do Connect ${connectLeaderInfo.number}` : null 
                }
            },
        ];
        return { milestones };
    }, [member, allConnects, milestonesData]);

    const handleDateChange = (milestoneId, date) => {
        // Converte a data brasileira para ISO antes de salvar
        const isoDate = convertBrazilianDateToISO(date);
        setMilestonesData(prev => ({
            ...prev,
            [milestoneId]: { ...prev[milestoneId], date: isoDate }
        }));
    };

    const handleSaveChanges = async () => {
        try {
            await onSave(member.id, milestonesData);
            setIsEditing(false);
        } catch (error) {
            console.error("Erro ao salvar marcos:", error);
            alert("Não foi possível salvar as alterações.");
        }
    };

    if (!isOpen || !leadershipTrackData) return null;

    const { milestones } = leadershipTrackData;

    const formatDate = (date) => {
        if (!date) return '';
        const dateObj = date.toDate ? date.toDate() : new Date(date);
        return formatDateToBrazilian(dateObj);
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
            <div className="flex flex-col max-h-[85vh]">
                <div className="flex-shrink-0 pb-4 border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Trilho de Liderança</h2>
                        <p className="text-lg text-gray-600">{member.name}</p>
                    </div>
                    {canEdit && !isEditing && (
                        <button onClick={() => setIsEditing(true)} className="flex items-center space-x-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                            <Edit size={16} />
                            <span>Editar</span>
                        </button>
                    )}
                    {isEditing && (
                         <button onClick={handleSaveChanges} className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                            <Save size={16} />
                            <span>Salvar</span>
                        </button>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto mt-4 pr-2">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3">Marcos Principais</h3>
                        <div className="space-y-3">
                            {milestones.map(milestone => (
                                <div key={milestone.id} className={`flex items-center p-3 rounded-md transition-all ${isEditing && !milestone.isAutomatic ? 'bg-blue-50' : 'bg-gray-50'}`} title={milestone.data?.completed ? (milestone.id === 'connectLeader' ? milestone.data.date : `Concluído em: ${formatDate(milestone.data.date)}`) : 'Pendente'}>
                                    {milestone.data?.completed || (milestone.data?.date && isEditing) ? <CheckCircle2 size={20} className="text-green-500 mr-3 flex-shrink-0" /> : <Circle size={20} className="text-gray-300 mr-3 flex-shrink-0" />}
                                    <div className="flex-grow">
                                        <span className={milestone.data?.completed ? "text-gray-800" : "text-gray-500"}>{milestone.label}</span>
                                        {isEditing && !milestone.isAutomatic ? (
                                            <input 
                                                type="text" 
                                                value={milestone.data?.date ? formatDateToBrazilian(milestone.data.date) : ''} 
                                                onChange={(e) => handleDateChange(milestone.id, e.target.value)} 
                                                placeholder="dd/mm/aaaa"
                                                className="block w-full mt-1 text-sm bg-white rounded-md p-1 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            />
                                        ) : !isEditing && milestone.data?.date && (
                                            <p className="text-xs text-gray-500">{milestone.id === 'connectLeader' ? milestone.data.date : `Concluído em: ${formatDate(milestone.data.date)}`}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">Cursos Concluídos</h3>
                        <div className="space-y-2">
                            {completedCourses && completedCourses.length > 0 ? (
                                completedCourses.sort((a,b) => b.completionDate.toDate() - a.completionDate.toDate()).map(course => (
                                    <div key={course.id} className="flex items-start p-3 bg-gray-50 rounded-md">
                                        <GraduationCap className="text-blue-500 mr-3 mt-1 flex-shrink-0" size={20} />
                                        <div>
                                            <p className="font-semibold text-gray-800">{course.courseName}</p>
                                            <p className="text-xs text-gray-500">Concluído em: {formatDate(course.completionDate)} | Nota Final: {course.finalGrade}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 italic">Nenhum curso concluído ainda.</p>
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Histórico de Connects</h3>
                        <div className="space-y-2">
                            {memberConnectHistoryDetails && memberConnectHistoryDetails.length > 0 ? (
                                memberConnectHistoryDetails.map((history, index) => (
                                    <div key={index} className="flex items-start p-3 bg-gray-50 rounded-md">
                                        <History className="text-purple-500 mr-3 mt-1 flex-shrink-0" size={20}/>
                                        <div>
                                            <p className="font-semibold text-gray-800">{history.connectName}</p>
                                            <p className="text-xs text-gray-500">
                                                Período: {formatDate(history.startDate)} até {history.endDate ? formatDate(history.endDate) : 'Atual'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Frequência: {history.presenceCount} presença(s), {history.absenceCount} falta(s)
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 italic">Membro não possui histórico em outros Connects.</p>
                            )}
                        </div>
                    </div>
                </div>

                 <div className="flex-shrink-0 flex justify-end space-x-3 pt-4 border-t mt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all">Fechar</button>
                </div>
            </div>
        </Modal>
    );
};

export default LeadershipTrackModal;
