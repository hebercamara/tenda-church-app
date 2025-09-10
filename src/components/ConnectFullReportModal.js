import React, { useMemo } from 'react';
import Modal from './Modal';
import { Users, Clipboard, Calendar, UserPlus } from 'lucide-react';
import { formatDateToBrazilian } from '../utils/dateUtils';

const ConnectFullReportModal = ({ isOpen, onClose, connect, allMembers, allReports }) => {

    const reportData = useMemo(() => {
        if (!connect) return null;

        const connectMembers = allMembers.filter(m => m.connectId === connect.id).sort((a,b) => a.name.localeCompare(b.name));
        
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
                totalAttendanceLastSix += Object.values(report.attendance).filter(status => status === 'presente').length;
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
                            {connectMembers.map(member => <li key={member.id}>{member.name}</li>)}
                        </ul>
                    </div>
                    
                    {/* Histórico */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Histórico de Encontros</h3>
                        <div className="space-y-2">
                            {connectReports.map(report => (
                                <div key={report.id} className="bg-gray-50 p-3 rounded-md border text-sm">
                                    <p className="font-bold"><Calendar size={14} className="inline mr-1" /> Data: {formatDateToBrazilian(report.reportDate)}</p>
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