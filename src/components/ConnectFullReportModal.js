import React, { useMemo } from 'react';
import Modal from './Modal';
import { Users, Clipboard, Calendar, UserPlus } from 'lucide-react';
import { formatDateToBrazilian } from '../utils/dateUtils';

const ConnectFullReportModal = ({ isOpen, onClose, connect, allMembers, allReports }) => {

    // Função para obter o nome conhecido dos membros com lógica de sobrenome para duplicatas
    const getMemberKnownName = (member, allConnectMembers) => {
        if (!member) return 'Membro não encontrado';
        
        // Obter o nome conhecido ou primeiro nome como fallback
        const knownName = member.knownBy || member.name?.split(' ')[0] || member.name || 'Membro';
        
        // Verificar se há duplicatas do mesmo nome conhecido entre os membros do Connect
        const membersWithSameName = allConnectMembers.filter(m => {
            if (!m || m.id === member.id) return false;
            const otherKnownName = m.knownBy || m.name?.split(' ')[0] || m.name || 'Membro';
            return otherKnownName === knownName;
        });
        
        // Se há duplicatas, adicionar o último sobrenome
        if (membersWithSameName.length > 0) {
            const nameParts = member.name?.split(' ') || [];
            const lastName = nameParts[nameParts.length - 1];
            return lastName && lastName !== knownName ? `${knownName} ${lastName}` : knownName;
        }
        
        return knownName;
    };

    const reportData = useMemo(() => {
        if (!connect) return null;

        // Função para obter membros que estavam no Connect em uma data específica
        const getMembersAtDate = (date) => {
            return allMembers.filter(member => {
                // Se o membro está atualmente no Connect
                if (member.connectId === connect.id) {
                    // Verifica se já estava no Connect na data
                    if (member.connectHistory && member.connectHistory.length > 0) {
                        const currentEntry = member.connectHistory.find(entry => !entry.endDate);
                        if (currentEntry) {
                            const startDate = currentEntry.startDate.toDate ? currentEntry.startDate.toDate() : new Date(currentEntry.startDate);
                            return date >= startDate;
                        }
                    }
                    return true; // Se não tem histórico, considera que sempre esteve
                }
                
                // Se o membro não está atualmente no Connect, verifica o histórico
                if (member.connectHistory && member.connectHistory.length > 0) {
                    return member.connectHistory.some(entry => {
                        if (entry.connectId !== connect.id) return false;
                        
                        const startDate = entry.startDate.toDate ? entry.startDate.toDate() : new Date(entry.startDate);
                        const endDate = entry.endDate ? (entry.endDate.toDate ? entry.endDate.toDate() : new Date(entry.endDate)) : null;
                        
                        return date >= startDate && (!endDate || date <= endDate);
                    });
                }
                
                return false;
            });
        };

        // Membros atualmente no Connect
        const connectMembers = getMembersAtDate(new Date()).sort((a, b) => {
            const knownNameA = getMemberKnownName(a, connectMembers);
            const knownNameB = getMemberKnownName(b, connectMembers);
            return knownNameA.localeCompare(knownNameB);
        });
        
        const connectReports = allReports.filter(r => r && r.reportDate && r.connectId === connect.id).sort((a, b) => {
            const dateA = a.reportDate.toDate ? a.reportDate.toDate() : a.reportDate;
            const dateB = b.reportDate.toDate ? b.reportDate.toDate() : b.reportDate;
            return dateB - dateA;
        });

        // Pega os últimos 6 relatórios para as médias
        const lastSixReports = connectReports.slice(0, 6);

        // --- Cálculos baseados nos últimos 6 encontros ---
        const totalGuestsLastSix = lastSixReports.reduce((sum, r) => sum + (r.guests || 0), 0);
        let totalAttendanceLastSix = 0;
        
        lastSixReports.forEach(report => {
            if (report.attendance) {
                const reportDate = report.reportDate.toDate ? report.reportDate.toDate() : new Date(report.reportDate);
                const membersAtReportDate = getMembersAtDate(reportDate);
                
                // Conta apenas presenças de membros que estavam no Connect na data do relatório
                const validAttendance = Object.entries(report.attendance).filter(([memberId, status]) => {
                    return membersAtReportDate.some(member => member.id === memberId) && status === 'presente';
                });
                
                totalAttendanceLastSix += validAttendance.length;
            }
        });
        
        const avgAttendance = lastSixReports.length > 0 ? (totalAttendanceLastSix / lastSixReports.length).toFixed(1) : 0;
        const avgGuests = lastSixReports.length > 0 ? (totalGuestsLastSix / lastSixReports.length).toFixed(1) : 0;
        
        // --- Cálculos totais ---
        const totalMeetings = connectReports.length;

        return { connectMembers, connectReports, totalMeetings, avgGuests, avgAttendance };
    }, [connect, allMembers, allReports]);

    if (!reportData) return null;

    const { connectMembers, connectReports, totalMeetings, avgGuests, avgAttendance } = reportData;
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="4xl">
            <div className="flex flex-col max-h-[85vh]">
                <div className="flex-shrink-0 pb-4 border-b">
                    <h2 className="text-2xl font-bold text-gray-900">Relatório Completo do Connect {connect.number}</h2>
                    <p className="text-lg text-gray-600">{connect.name}</p>
                    <p className="text-sm text-gray-500">Líder: {connect.leaderName}</p>
                </div>

                <div className="flex-grow overflow-y-auto mt-4 pr-2">
                    {/* Resumo */}
                    <h3 className="text-lg font-semibold mb-2">Resumo Geral</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-100 p-3 rounded-lg text-center"><Clipboard size={18} className="mx-auto mb-1 text-gray-600" /><span className="font-bold text-xl">{totalMeetings}</span><p className="text-xs">Total de Encontros</p></div>
                        <div className="bg-gray-100 p-3 rounded-lg text-center"><Users size={18} className="mx-auto mb-1 text-gray-600" /><span className="font-bold text-xl">{avgAttendance}</span><p className="text-xs">Média Presença (6 últ.)</p></div>
                        <div className="bg-gray-100 p-3 rounded-lg text-center"><UserPlus size={18} className="mx-auto mb-1 text-gray-600" /><span className="font-bold text-xl">{avgGuests}</span><p className="text-xs">Média Convidados (6 últ.)</p></div>
                    </div>

                    {/* Membros */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">Membros ({connectMembers.length})</h3>
                        <ul className="space-y-1 text-sm list-disc list-inside">
                            {connectMembers.map(member => <li key={member.id}>{getMemberKnownName(member, connectMembers)}</li>)}
                        </ul>
                    </div>
                    
                    {/* Histórico */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Histórico de Encontros</h3>
                        <div className="space-y-2">
                            {connectReports.map(report => (
                                <div key={report.id} className="bg-gray-50 p-3 rounded-md border text-sm">
                                    <p className="font-bold"><Calendar size={14} className="inline mr-1" /> Data: {formatDateToBrazilian(report.reportDate.toDate ? report.reportDate.toDate() : report.reportDate)}</p>
                                    <p>Presentes: {Object.values(report.attendance || {}).filter(s => s === 'presente').length}</p>
                                    <p>Convidados: {report.guests || 0}</p>
                                    <p>Oferta: {(report.offering || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                            ))}
                             {connectReports.length === 0 && <p className="text-sm text-gray-500">Nenhum relatório encontrado para este Connect.</p>}
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

export default ConnectFullReportModal;