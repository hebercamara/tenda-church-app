import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, Title, Tooltip, Legend, PointElement } from 'chart.js';
import { formatDateToBrazilian } from '../utils/dateUtils';

// Registra todos os elementos necessários para um gráfico combinado
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

// Função para encontrar o domingo de uma determinada semana
const getSundayOfWeek = (date) => {
    const dateObj = new Date(date);
    const day = dateObj.getUTCDay(); // Usar UTC para consistência
    const diff = dateObj.getUTCDate() - day;
    return new Date(dateObj.setUTCDate(diff));
};

const ConnectAttendanceChart = ({ reports, allMembers, connectId }) => {
  const chartData = useMemo(() => {
    const validReports = reports.filter(r => r && r.reportDate && typeof r.attendance === 'object');

    if (!validReports || validReports.length === 0) return null;

    // Função para obter membros que estavam no Connect em uma data específica
    const getMembersAtDate = (date, targetConnectId = null) => {
      if (!allMembers) return [];
      
      // Se connectId é null, retorna todos os membros (para dashboard geral)
      if (!targetConnectId) return allMembers;
      
      return allMembers.filter(member => {
        // Se o membro está atualmente no Connect
        if (member.connectId === targetConnectId) {
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
            if (entry.connectId !== targetConnectId) return false;
            
            const startDate = entry.startDate.toDate ? entry.startDate.toDate() : new Date(entry.startDate);
            const endDate = entry.endDate ? (entry.endDate.toDate ? entry.endDate.toDate() : new Date(entry.endDate)) : null;
            
            return date >= startDate && (!endDate || date <= endDate);
          });
        }
        
        return false;
      });
    };

    // Agrupa os relatórios por SEMANA (usando o domingo como chave)
    const reportsByWeek = validReports.reduce((acc, report) => {
      const dateObj = report.reportDate.toDate ? report.reportDate.toDate() : report.reportDate;
      const sundayOfWeek = getSundayOfWeek(dateObj).toISOString().split('T')[0];
      
      if (!acc[sundayOfWeek]) {
        acc[sundayOfWeek] = [];
      }
      acc[sundayOfWeek].push(report);
      return acc;
    }, {});

    // Pega as últimas 4 semanas com relatórios
    const recentWeeks = Object.keys(reportsByWeek)
      .sort((a, b) => new Date(b) - new Date(a))
      .slice(0, 4)
      .reverse();

    if (recentWeeks.length === 0) return null;

    const dataByWeek = recentWeeks.map(sundayDate => {
      const reportsForWeek = reportsByWeek[sundayDate];
      
      let totalPresent = 0;
      
      reportsForWeek.forEach(report => {
        const reportDate = report.reportDate.toDate ? report.reportDate.toDate() : new Date(report.reportDate);
        const membersAtReportDate = getMembersAtDate(reportDate, connectId || report.connectId);
        
        // Conta apenas presenças de membros que estavam no Connect na data do relatório
        const validAttendance = Object.entries(report.attendance || {}).filter(([memberId, status]) => {
          return membersAtReportDate.some(member => member.id === memberId) && status === 'presente';
        });
        
        totalPresent += validAttendance.length;
      });

      // --- NOVA LÓGICA ---
      const totalGuests = reportsForWeek.reduce((sum, report) => sum + (Number(report.guests) || 0), 0);
      const reportingConnectsCount = new Set(reportsForWeek.map(r => r.connectId)).size;
      
      // Média de Frequência (Presentes + Convidados)
      const averageTotal = reportingConnectsCount > 0 ? (totalPresent + totalGuests) / reportingConnectsCount : 0;
      // Média apenas de Convidados
      const averageGuests = reportingConnectsCount > 0 ? totalGuests / reportingConnectsCount : 0;
      
      return {
        date: formatDateToBrazilian(new Date(sundayDate + 'T00:00:00'), 'short'),
        averageTotal: averageTotal.toFixed(1),
        averageGuests: averageGuests.toFixed(1)
      };
    });

    return {
      labels: dataByWeek.map(d => `Semana de ${d.date}`),
      datasets: [
        {
          type: 'bar', // Define este dataset como barras
          label: 'Frequência Média (Membros + Convidados)',
          data: dataByWeek.map(d => d.averageTotal),
          backgroundColor: 'rgba(220, 38, 38, 0.6)',
          borderColor: '#991B1B',
          borderWidth: 1,
          order: 2 // Garante que as barras fiquem atrás da linha
        },
        {
          type: 'line', // Define este dataset como linha
          label: 'Média de Convidados',
          data: dataByWeek.map(d => d.averageGuests),
          borderColor: '#75170a',
          backgroundColor: '#75170a',
          tension: 0.2,
          fill: false,
          order: 1 // Garante que a linha fique na frente das barras
        }
      ],
    };
  }, [reports]);

  if (!chartData) {
    return <div className="bg-white p-6 rounded-xl shadow-md text-center">Dados de frequência insuficientes para gerar o gráfico.</div>;
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { 
        display: true, // Habilita a legenda para diferenciar as barras da linha
        position: 'top',
      },
      title: { 
        display: true, 
        text: 'Frequência Semanal dos Connects (Últimas 4 semanas)' // Título atualizado
      },
    },
    scales: { 
        y: { 
            beginAtZero: true,
        } 
    }
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-md">
      <Bar options={options} data={chartData} />
    </div>
  );
};

export default ConnectAttendanceChart;