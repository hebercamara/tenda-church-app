import React, { useMemo } from 'react';
import { CheckCircle2, Circle, ArrowLeft, UserCheck, UserX } from 'lucide-react';

const ConnectTrackPage = ({ connect, membersInConnect, allCourses, allConnects, onBack, attendanceAlerts, onReactivateMember }) => {

    // Separa os membros em ativos e inativos
    const inactiveMemberIds = useMemo(() => 
        new Set(attendanceAlerts.filter(a => a.connectId === connect.id && a.status === 'inactive').map(a => a.memberId)),
        [attendanceAlerts, connect.id]
    );

    const activeMembers = membersInConnect.filter(m => !inactiveMemberIds.has(m.id))
        .sort((a, b) => a.name.localeCompare(b.name));
        
    const inactiveMembers = membersInConnect.filter(m => inactiveMemberIds.has(m.id))
        .sort((a, b) => a.name.localeCompare(b.name));

    const coursesFromTemplates = allCourses.filter(course => course.templateId).sort((a,b) => a.name.localeCompare(b.name));

    const milestonesDef = [
        { id: 'salvation', label: 'Aceitou a Jesus' },
        { id: 'initialDiscipleship', label: 'Discipulado Inicial' },
        { id: 'baptism', label: 'Batismo' },
        { id: 'membership', label: 'Membresia' },
        { id: 'connectTraining', label: 'Treinamento no Connect' },
        { id: 'connectLeader', label: 'Líder de Connect' },
    ];

    const formatDate = (date) => {
        if (!date) return '';
        const dateObj = date.toDate ? date.toDate() : new Date(date);
        return dateObj.toLocaleDateString('pt-BR', {timeZone: 'UTC'});
    };

    const isLeader = (memberId) => {
        return allConnects.some(c => c.leaderId === memberId);
    };

    const MemberRow = React.memo(({ member }) => (
        <tr className="hover:bg-gray-50">
            <td className="p-2 sm:p-3 font-medium text-gray-800 sticky left-0 bg-white hover:bg-gray-50 z-10 text-xs sm:text-sm">
                <div className="truncate max-w-[100px] sm:max-w-none" title={member.name}>{member.name}</div>
            </td>
            {milestonesDef.map(milestone => {
                let isComplete = false;
                let dateInfo = 'Pendente';

                if (milestone.id === 'connectLeader') {
                    isComplete = isLeader(member.id);
                    if (isComplete) dateInfo = "Líder Ativo";
                } else {
                    const milestoneData = member.milestones?.[milestone.id];
                    isComplete = milestoneData?.completed;
                    if (isComplete) dateInfo = `Concluído em: ${formatDate(milestoneData.date)}`;
                }

                return (
                    <td key={`${member.id}-${milestone.id}`} className="p-2 sm:p-3 text-center" title={dateInfo}>
                        {isComplete ? <CheckCircle2 size={16} className="sm:w-5 sm:h-5 mx-auto text-green-500" /> : <Circle size={16} className="sm:w-5 sm:h-5 mx-auto text-gray-300" />}
                    </td>
                );
            })}
            {coursesFromTemplates.map(course => {
                const completedCourse = member.completedCourses?.find(c => c.id === course.id);
                const isComplete = !!completedCourse;
                const dateInfo = isComplete ? `Concluído em: ${formatDate(completedCourse.completionDate)} | Nota: ${completedCourse.finalGrade}` : 'Não concluído';

                return (
                    <td key={`${member.id}-${course.id}`} className="p-2 sm:p-3 text-center" title={dateInfo}>
                        {isComplete ? <CheckCircle2 size={16} className="sm:w-5 sm:h-5 mx-auto text-green-500" /> : <Circle size={16} className="sm:w-5 sm:h-5 mx-auto text-gray-300" />}
                    </td>
                );
            })}
        </tr>
    ));

    return (
        <div>
            <div className="flex items-start mb-4 sm:mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 mr-3 sm:mr-4 flex-shrink-0">
                    <ArrowLeft size={20} className="sm:w-6 sm:h-6 text-gray-700" />
                </button>
                <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 leading-tight">Trilho de Liderança do Connect {connect.number}</h2>
                    <p className="text-sm sm:text-base lg:text-lg text-gray-600 truncate">{connect.name}</p>
                </div>
            </div>

            <div className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200">
                <div className="p-3 sm:p-4 border-b">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-700 flex items-center"><UserCheck size={20} className="sm:w-6 sm:h-6 mr-2 text-green-600"/> Membros Ativos</h3>
                </div>
                <div className="overflow-x-auto">
                    <div className="min-w-max">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-2 sm:p-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[120px]">Membro</th>
                                    {milestonesDef.map(milestone => (
                                        <th key={milestone.id} className="p-2 sm:p-3 font-semibold text-gray-600 text-center whitespace-nowrap min-w-[80px] text-xs sm:text-sm">
                                            <span className="hidden sm:inline">{milestone.label}</span>
                                            <span className="sm:hidden">{milestone.label.split(' ')[0]}</span>
                                        </th>
                                    ))}
                                    {coursesFromTemplates.map(course => (
                                        <th key={course.id} className="p-2 sm:p-3 font-semibold text-gray-600 text-center whitespace-nowrap min-w-[80px] text-xs sm:text-sm">
                                            <span className="hidden sm:inline">{course.name}</span>
                                            <span className="sm:hidden">{course.name.substring(0, 10)}...</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {activeMembers.map(member => <MemberRow key={member.id} member={member} />)}
                            </tbody>
                        </table>
                    </div>
                    {activeMembers.length === 0 && <p className="p-3 sm:p-4 text-gray-500 italic">Nenhum membro ativo neste Connect.</p>}
                </div>
            </div>

            <div className="mt-8 bg-white rounded-lg overflow-hidden shadow-md border border-gray-200">
                <div className="p-3 sm:p-4 border-b bg-red-50">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-700 flex items-center"><UserX size={20} className="sm:w-6 sm:h-6 mr-2 text-red-600"/> Membros Inativos (6+ faltas consecutivas)</h3>
                </div>
                <ul className="divide-y divide-gray-200">
                    {inactiveMembers.map(member => (
                        <li key={member.id} className="p-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <span className="font-medium text-gray-600 text-sm sm:text-base">{member.name}</span>
                            <button 
                                onClick={() => onReactivateMember(member, connect.id)}
                                className="px-3 py-2 text-xs sm:text-sm bg-green-500 hover:bg-green-600 text-white font-semibold rounded-md transition-all self-start sm:self-auto">
                                Reativar
                            </button>
                        </li>
                    ))}
                </ul>
                {inactiveMembers.length === 0 && <p className="p-3 sm:p-4 text-gray-500 italic">Nenhum membro inativo neste Connect.</p>}
            </div>
        </div>
    );
};

export default ConnectTrackPage;