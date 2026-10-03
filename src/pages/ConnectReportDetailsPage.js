import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, DollarSign, UserPlus, ClipboardList, TrendingUp } from 'lucide-react';
import { formatDateToBrazilian } from '../utils/dateUtils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ConnectReportDetailsPage = ({ allConnects, allConnectReports, allMembers }) => {
    const { connectId } = useParams();
    const navigate = useNavigate();

    const connect = allConnects?.find(c => c.id === connectId);
    
    // Configura data inicial (ex: 3 meses atrás) e final (hoje)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    const reportData = useMemo(() => {
        if (!connect) return null;

        let reports = (allConnectReports || []).filter(r => r.connectId === connectId);

        // Ordenar do mais antigo pro mais novo para o gráfico
        reports.sort((a, b) => {
            const dateA = a.reportDate?.toDate ? a.reportDate.toDate() : new Date(a.reportDate);
            const dateB = b.reportDate?.toDate ? b.reportDate.toDate() : new Date(b.reportDate);
            return dateA - dateB;
        });

        // Filtrar pelo período selecionado
        const start = startDate ? new Date(startDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        
        const end = endDate ? new Date(endDate) : null;
        if (end) end.setHours(23, 59, 59, 999);

        const filteredReports = reports.filter(r => {
            const rDate = r.reportDate?.toDate ? r.reportDate.toDate() : new Date(r.reportDate);
            if (start && rDate < start) return false;
            if (end && rDate > end) return false;
            return true;
        });

        // Somatórias e médias
        const totalMeetings = filteredReports.length;
        let totalOffering = 0;
        let totalGuests = 0;
        let totalAttendance = 0;

        const chartLabels = [];
        const chartAttendanceData = [];
        const chartGuestsData = [];
        const chartOfferingData = [];

        filteredReports.forEach(report => {
            const rDate = report.reportDate?.toDate ? report.reportDate.toDate() : new Date(report.reportDate);
            chartLabels.push(formatDateToBrazilian(rDate).substring(0,5)); // Ex: 10/10

            const presentes = Object.values(report.attendance || {}).filter(s => s === 'presente').length;
            const convidados = report.guests || 0;
            const oferta = report.offering || 0;

            totalAttendance += presentes;
            totalGuests += convidados;
            totalOffering += oferta;

            chartAttendanceData.push(presentes);
            chartGuestsData.push(convidados);
            chartOfferingData.push(oferta);
        });

        const avgAttendance = totalMeetings > 0 ? (totalAttendance / totalMeetings).toFixed(1) : 0;
        const avgGuests = totalMeetings > 0 ? (totalGuests / totalMeetings).toFixed(1) : 0;

        return {
            filteredReports: [...filteredReports].reverse(), // Reverso para a tabela (mais novo 1º)
            totalMeetings,
            totalOffering,
            avgAttendance,
            avgGuests,
            chartLabels,
            chartAttendanceData,
            chartGuestsData,
            chartOfferingData
        };

    }, [connectId, connect, allConnectReports, startDate, endDate]);

    if (!connect) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <p className="text-xl text-gray-600">Connect não encontrado.</p>
                <button onClick={() => navigate('/historico-relatorios')} className="mt-4 text-[#DC2626] hover:underline">
                    Voltar para a lista
                </button>
            </div>
        );
    }

    const {
        filteredReports, totalMeetings, totalOffering, avgAttendance, avgGuests,
        chartLabels, chartAttendanceData, chartGuestsData, chartOfferingData
    } = reportData;

    // Configurações do Gráfico de Presença/Convidados
    const attendanceChartData = {
        labels: chartLabels,
        datasets: [
            {
                type: 'line',
                label: 'Presentes',
                data: chartAttendanceData,
                borderColor: 'rgb(59, 130, 246)', // Blue
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
            },
            {
                type: 'bar',
                label: 'Convidados',
                data: chartGuestsData,
                backgroundColor: 'rgba(245, 158, 11, 0.7)', // Amber
                borderRadius: 4,
            }
        ],
    };

    const attendanceChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            title: { display: false }
        },
        scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
        }
    };

    // Configurações do Gráfico de Ofertas
    const offeringChartData = {
        labels: chartLabels,
        datasets: [
            {
                label: 'Oferta (R$)',
                data: chartOfferingData,
                borderColor: 'rgb(16, 185, 129)', // Emerald
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
            }
        ],
    };

    const offeringChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            title: { display: false }
        },
        scales: {
            y: { beginAtZero: true }
        }
    };


    // Função para exportar os relatórios detalhados para Excel
    const handleExportToExcel = () => {
        import('xlsx').then(XLSX => {
            const periodStr = startDate && endDate 
                ? `Período: ${formatDateToBrazilian(new Date(startDate))} a ${formatDateToBrazilian(new Date(endDate))}` 
                : 'Todo o histórico';

            const wsData = [
                [`Relatório Analítico - Connect ${connect.number} (${connect.name})`],
                [`Líder: ${connect.leaderName} | ${periodStr}`],
                [], // Linha em branco
                ['Data', 'Presentes', 'Convidados', 'Oferta (R$)'] // Cabeçalhos
            ];

            filteredReports.forEach(report => {
                const reportDate = report.reportDate?.toDate ? report.reportDate.toDate() : new Date(report.reportDate);
                const presentes = Object.values(report.attendance || {}).filter(s => s === 'presente').length;
                
                wsData.push([
                    formatDateToBrazilian(reportDate),
                    presentes,
                    report.guests || 0,
                    report.offering || 0
                ]);
            });

            const worksheet = XLSX.utils.aoa_to_sheet(wsData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatórios Connect');
            XLSX.writeFile(workbook, `Relatorios_Connect_${connect.number}_${formatDateToBrazilian(new Date()).replace(/\//g, '-')}.xlsx`);
        });
    };

    return (
        <div className="pb-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => navigate('/historico-relatorios')}
                        className="p-2 bg-white rounded-full shadow hover:bg-gray-50 transition-colors text-gray-600"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                            Relatório Analítico <span className="text-[#DC2626]">Connect {connect.number}</span>
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Líder: {connect.leaderName} | {connect.name}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleExportToExcel}
                    disabled={filteredReports.length === 0}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    <ClipboardList size={18} />
                    <span>Exportar Excel</span>
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center">
                    <Calendar size={16} className="mr-2 text-gray-400" />
                    Período de Análise
                </h3>
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Data Inicial</label>
                        <input
                            type="date"
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#991B1B] outline-none transition-shadow text-sm"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Data Final</label>
                        <input
                            type="date"
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#991B1B] outline-none transition-shadow text-sm"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center">
                    <div className="p-3 rounded-lg bg-blue-50 text-blue-600 mr-4">
                        <ClipboardList size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Encontros no Período</p>
                        <h3 className="text-2xl font-bold text-gray-800">{totalMeetings}</h3>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center">
                    <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 mr-4">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Média de Presença</p>
                        <h3 className="text-2xl font-bold text-gray-800">{avgAttendance}</h3>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center">
                    <div className="p-3 rounded-lg bg-amber-50 text-amber-600 mr-4">
                        <UserPlus size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Média Convidados</p>
                        <h3 className="text-2xl font-bold text-gray-800">{avgGuests}</h3>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center">
                    <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 mr-4">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Soma de Ofertas</p>
                        <h3 className="text-2xl font-bold text-emerald-600">
                            {totalOffering.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Gráficos */}
            {totalMeetings > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <TrendingUp size={18} className="mr-2 text-indigo-500" />
                            Evolução de Presença e Convidados
                        </h3>
                        <div className="h-64">
                            <Chart type="bar" data={attendanceChartData} options={attendanceChartOptions} />
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <TrendingUp size={18} className="mr-2 text-emerald-500" />
                            Evolução de Ofertas
                        </h3>
                        <div className="h-64">
                            <Line data={offeringChartData} options={offeringChartOptions} />
                        </div>
                    </div>
                </div>
            )}

            {/* Tabela de Histórico */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">Detalhamento dos Encontros</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
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
                                                {formatDateToBrazilian(reportDate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                                                    {presentes}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">
                                                    {report.guests || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-semibold text-right">
                                                {oferta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                        Nenhum encontro registrado no período selecionado.
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

export default ConnectReportDetailsPage;
