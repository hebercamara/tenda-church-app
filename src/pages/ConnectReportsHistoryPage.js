import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, MapPin, Clock, Mail, Search, FileText, Users, DollarSign, ClipboardList } from 'lucide-react';
import { formatFullAddress, hasAddressData } from '../utils/addressUtils';
import { formatDateToBrazilian } from '../utils/dateUtils';

const ConnectReportsHistoryPage = ({ allConnects, allConnectReports }) => {
    const navigate = useNavigate();
    
    // Filtros para os Cards de Connect
    const [connectSearchTerm, setConnectSearchTerm] = useState('');
    
    // Filtros para a Tabela Global de Relatórios
    const [reportSearchTerm, setReportSearchTerm] = useState('');
    const [reportStartDate, setReportStartDate] = useState('');
    const [reportEndDate, setReportEndDate] = useState('');

    const filteredConnects = (allConnects || []).filter(c => {
        if (!connectSearchTerm) return true;
        const term = connectSearchTerm.toLowerCase();
        return (
            c.name.toLowerCase().includes(term) ||
            (c.number && c.number.toString().includes(term)) ||
            (c.leaderName && c.leaderName.toLowerCase().includes(term))
        );
    }).sort((a, b) => a.number - b.number);

    const filteredReports = useMemo(() => {
        let reports = [...(allConnectReports || [])];

        if (reportStartDate) {
            const start = new Date(reportStartDate);
            start.setHours(0, 0, 0, 0);
            reports = reports.filter(r => {
                const rDate = r.reportDate?.toDate ? r.reportDate.toDate() : new Date(r.reportDate);
                return rDate >= start;
            });
        }
        
        if (reportEndDate) {
            const end = new Date(reportEndDate);
            end.setHours(23, 59, 59, 999);
            reports = reports.filter(r => {
                const rDate = r.reportDate?.toDate ? r.reportDate.toDate() : new Date(r.reportDate);
                return rDate <= end;
            });
        }

        reports = reports.map(r => {
            const connect = allConnects?.find(c => c.id === r.connectId);
            return {
                ...r,
                connectName: connect?.name || `Connect Desconhecido (ID: ${r.connectId})`,
                connectNumber: connect?.number || '',
                leaderName: connect?.leaderName || 'N/A'
            };
        });

        if (reportSearchTerm) {
            const term = reportSearchTerm.toLowerCase();
            reports = reports.filter(r => 
                r.connectName.toLowerCase().includes(term) ||
                r.leaderName.toLowerCase().includes(term) ||
                (r.connectNumber && r.connectNumber.toString().includes(term))
            );
        }

        reports.sort((a, b) => {
            const dateA = a.reportDate?.toDate ? a.reportDate.toDate() : new Date(a.reportDate);
            const dateB = b.reportDate?.toDate ? b.reportDate.toDate() : new Date(b.reportDate);
            return dateB - dateA;
        });

        return reports;
    }, [allConnectReports, allConnects, reportSearchTerm, reportStartDate, reportEndDate]);

    const handleExportToExcel = () => {
        import('xlsx').then(XLSX => {
            const periodStr = reportStartDate && reportEndDate 
                ? `Período: ${formatDateToBrazilian(new Date(reportStartDate))} a ${formatDateToBrazilian(new Date(reportEndDate))}` 
                : 'Todo o histórico global';

            const wsData = [
                [`Histórico Global de Envios - Relatórios de Connects`],
                [`Filtros: ${periodStr} | Busca: ${reportSearchTerm || 'Nenhuma'}`],
                [], // Linha em branco
                ['Data', 'Connect', 'Líder', 'Presentes', 'Convidados', 'Oferta (R$)'] // Cabeçalhos
            ];

            filteredReports.forEach(report => {
                const reportDate = report.reportDate?.toDate ? report.reportDate.toDate() : new Date(report.reportDate);
                const presentes = Object.values(report.attendance || {}).filter(s => s === 'presente').length;
                
                wsData.push([
                    formatDateToBrazilian(reportDate),
                    report.connectNumber ? `Connect ${report.connectNumber} - ${report.connectName}` : report.connectName,
                    report.leaderName,
                    presentes,
                    report.guests || 0,
                    report.offering || 0
                ]);
            });

            const worksheet = XLSX.utils.aoa_to_sheet(wsData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatórios Globais');
            XLSX.writeFile(workbook, `Relatorios_Globais_Connect_${formatDateToBrazilian(new Date()).replace(/\//g, '-')}.xlsx`);
        });
    };

    return (
        <div className="pb-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Relatórios de Connects</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Selecione um Connect para ver métricas e gráficos detalhados.
                    </p>
                </div>
            </div>

            {/* Busca de Connects */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-100">
                <div className="relative max-w-md">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Connect</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Nome, Número ou Líder..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#991B1B] outline-none transition-shadow"
                            value={connectSearchTerm}
                            onChange={(e) => setConnectSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    </div>
                </div>
            </div>

            {/* Grid de Cards */}
            {filteredConnects.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm mb-10">
                    Nenhum Connect encontrado.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                    {filteredConnects.map(c => (
                        <div
                            key={c.id}
                            className="bg-white rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-xl hover:bg-red-50 border border-gray-100 hover:border-red-100 transition-all duration-200 transform hover:-translate-y-1"
                            onClick={() => navigate(`/historico-relatorios/${c.id}`)}
                            title="Clique para ver o relatório detalhado deste Connect"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-lg text-[#DC2626]">Connect {c.number}</h4>
                            </div>
                            <p className="text-gray-800 text-xl font-semibold mb-3">{c.name}</p>
                            
                            <div className="space-y-1.5 text-sm">
                                <p className="text-gray-600 flex items-center"><User size={14} className="mr-2 text-gray-400" /><span className="font-medium text-gray-700 mr-1">Líder:</span> {c.leaderName || '—'}</p>
                                {c.leaderEmail && <p className="text-gray-600 flex items-center"><Mail size={14} className="mr-2 text-gray-400" />{c.leaderEmail}</p>}
                                <p className="text-gray-600 flex items-center"><Calendar size={14} className="mr-2 text-gray-400" />{c.weekday || '—'}</p>
                                <p className="text-gray-600 flex items-center"><Clock size={14} className="mr-2 text-gray-400" />{c.time || '—'}</p>
                                
                                {hasAddressData(c) ? (
                                    <p className="text-gray-600 flex items-start mt-1">
                                        <MapPin size={14} className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                                        <span className="line-clamp-2 leading-tight">{formatFullAddress(c)}</span>
                                    </p>
                                ) : c.address ? (
                                    <p className="text-gray-600 flex items-start mt-1">
                                        <MapPin size={14} className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                                        <span className="line-clamp-2 leading-tight">{c.address}</span>
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Divisor */}
            <div className="border-t border-gray-200 pt-8 mb-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">Histórico Global de Envios</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Todos os relatórios entregues por todos os Connects.
                        </p>
                    </div>
                    <button
                        onClick={handleExportToExcel}
                        disabled={filteredReports.length === 0}
                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm w-full md:w-auto justify-center"
                    >
                        <ClipboardList size={18} />
                        <span>Exportar Excel</span>
                    </button>
                </div>
            </div>

            {/* Filtros da Tabela Global */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Relatório</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Nome do Connect, Número ou Líder..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#991B1B] outline-none"
                                value={reportSearchTerm}
                                onChange={(e) => setReportSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#991B1B] outline-none text-gray-700"
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#991B1B] outline-none text-gray-700"
                            value={reportEndDate}
                            onChange={(e) => setReportEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Tabela Global */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Connect</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Líder</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Presentes</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Convidados</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Oferta</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredReports.length > 0 ? (
                                filteredReports.map((report) => {
                                    const reportDate = report.reportDate?.toDate ? report.reportDate.toDate() : new Date(report.reportDate);
                                    const presentes = Object.values(report.attendance || {}).filter(s => s === 'presente').length;
                                    const oferta = report.offering || 0;
                                    
                                    return (
                                        <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                <div className="flex items-center">
                                                    <Calendar size={16} className="text-gray-400 mr-2" />
                                                    {formatDateToBrazilian(reportDate)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                {report.connectNumber ? `Connect ${report.connectNumber} - ` : ''}
                                                {report.connectName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {report.leaderName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                <div className="flex items-center justify-center">
                                                    <Users size={16} className="text-blue-500 mr-1" />
                                                    {presentes}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                                {report.guests || 0}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-semibold text-right">
                                                {oferta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        <FileText size={32} className="mx-auto text-gray-300 mb-3" />
                                        Nenhum relatório encontrado com os filtros selecionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ConnectReportsHistoryPage;
