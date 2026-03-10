import React, { useState, useMemo } from 'react';
import BirthdayWidget from '../components/widgets/BirthdayWidget';
import FollowUpWidget from '../components/widgets/FollowUpWidget';
import MetricCard from '../components/widgets/MetricCard';
import ConnectAttendanceChart from '../components/ConnectAttendanceChart';
import CourseAttendanceChart from '../components/CourseAttendanceChart';
import PendingDecisionsWidget from '../components/widgets/PendingDecisionsWidget';

import { Users, UserPlus, TrendingUp, DollarSign } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

// Função para encontrar o domingo de uma determinada semana
const getSundayOfWeek = (date) => {
    const dateObj = new Date(date);
    const day = dateObj.getUTCDay();
    const diff = dateObj.getUTCDate() - day;
    return new Date(dateObj.setUTCDate(diff));
};

const DashboardPage = ({ members = [], connects = [], reports = [], courses = [], attendanceAlerts = [], getConnectName = () => 'N/A', allDecisions = [], handleUpdateDecisionStatus }) => {
    const [chartType, setChartType] = useState('connectAttendance');
    const [selectedCourse, setSelectedCourse] = useState(() => {
        return Array.isArray(courses) && courses.length > 0 ? courses[0]?.id || '' : '';
    });

    // Permissão: líderes, supervisores, auxiliares ou admins
    const { currentUserData, isAdmin } = useAuthStore();
    const userEmail = (currentUserData?.email || '').toLowerCase();
    const isLeader = !!(currentUserData && connects.some(c => c.leaderId === currentUserData.id || (c.leaderEmail || '').toLowerCase() === userEmail));
    const isSupervisor = !!(currentUserData && connects.some(c => (c.supervisorEmail || '').toLowerCase() === userEmail));
    const isAuxLeader = !!(currentUserData && connects.some(c => c.auxLeaderId === currentUserData.id || (c.auxLeaderEmail || '').toLowerCase() === userEmail || (Array.isArray(c.auxLeaders) && c.auxLeaders.some(l => l.id === currentUserData.id || (l.email || '').toLowerCase() === userEmail))));

    const hasDecisionAccess = isAdmin || isLeader || isSupervisor || isAuxLeader;

    // Filtrar todas as decisões para o usuário logado
    const visibleDecisions = useMemo(() => {
        if (!hasDecisionAccess || !allDecisions || allDecisions.length === 0) return [];

        if (isAdmin) {
            return [...allDecisions].sort((a, b) => {
                const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dB - dA;
            });
        }

        const allowedConnectIds = connects.filter(c => {
            const isL = c.leaderId === currentUserData?.id || (c.leaderEmail || '').toLowerCase() === userEmail;
            const isS = (c.supervisorEmail || '').toLowerCase() === userEmail;
            const isAux = c.auxLeaderId === currentUserData?.id || (c.auxLeaderEmail || '').toLowerCase() === userEmail || (Array.isArray(c.auxLeaders) && c.auxLeaders.some(l => l.id === currentUserData?.id || (l.email || '').toLowerCase() === userEmail));
            return isL || isS || isAux;
        }).map(c => c.id);

        return allDecisions.filter(d => allowedConnectIds.includes(d.connectId)).sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA; // Ordenar da mais recente para a mais antiga
        });
    }, [allDecisions, connects, currentUserData, isAdmin, hasDecisionAccess, userEmail]);

    const dashboardMetrics = useMemo(() => {
        const validReports = reports.filter(r => r && r.reportDate && typeof r.attendance === 'object');

        if (!validReports || validReports.length === 0) {
            return { avgAttendance: 0, totalGuests: 0, totalOffering: 0 };
        }

        const reportsByWeek = validReports.reduce((acc, report) => {
            const dateObj = report.reportDate.toDate ? report.reportDate.toDate() : report.reportDate;
            const sundayOfWeek = getSundayOfWeek(dateObj).toISOString().split('T')[0];

            if (!acc[sundayOfWeek]) acc[sundayOfWeek] = [];
            acc[sundayOfWeek].push(report);
            return acc;
        }, {});

        const recentWeeks = Object.keys(reportsByWeek)
            .sort((a, b) => new Date(b) - new Date(a))
            .slice(0, 4);

        let totalPresentLastWeeks = 0;
        recentWeeks.forEach(week => {
            reportsByWeek[week].forEach(report => {
                totalPresentLastWeeks += Object.values(report.attendance).filter(s => s === 'presente').length;
            });
        });

        const avgAttendance = recentWeeks.length > 0 ? Math.round(totalPresentLastWeeks / recentWeeks.length) : 0;

        const currentMonth = new Date().getMonth();
        const monthlyReports = validReports.filter(r => {
            const dateObj = r.reportDate.toDate ? r.reportDate.toDate() : r.reportDate;
            return dateObj.getMonth() === currentMonth;
        });

        const totalGuests = monthlyReports.reduce((sum, r) => sum + (Number(r.guests) || 0), 0);
        const totalOffering = monthlyReports.reduce((sum, r) => sum + (Number(r.offering) || 0), 0);

        return { avgAttendance, totalGuests, totalOffering };

    }, [reports]);

    return (
        <div className="p-3 sm:p-4 lg:p-6 space-y-6 sm:space-y-8">
            <div className="mb-4 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Dashboard</h2>
                <p className="text-sm sm:text-base text-gray-600">Bem-vindo ao sistema de gestão da Tenda Church</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
                <MetricCard icon={TrendingUp} title="Média de Presentes (Semana)" value={dashboardMetrics.avgAttendance} color="#3B82F6" />
                <MetricCard icon={UserPlus} title="Convidados (Mês)" value={dashboardMetrics.totalGuests} color="#22C55E" />
                <MetricCard icon={DollarSign} title="Ofertas (Mês)" value={dashboardMetrics.totalOffering.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} color="#EAB308" />
                <MetricCard icon={Users} title="Total de Membros" value={members.length} color="#EF4444" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                <div className="lg:col-span-2 bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-md">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-start sm:items-center mb-4">
                        <select
                            value={chartType}
                            onChange={(e) => setChartType(e.target.value)}
                            className="w-full sm:w-auto p-2 border rounded-md bg-gray-50 text-sm"
                        >
                            <option value="connectAttendance">Frequência dos Connects</option>
                            <option value="courseAttendance">Frequência dos Cursos</option>
                        </select>

                        {chartType === 'courseAttendance' && (
                            <select
                                value={selectedCourse}
                                onChange={(e) => setSelectedCourse(e.target.value)}
                                className="w-full sm:w-auto p-2 border rounded-md bg-gray-50 text-sm"
                            >
                                <option value="">Selecione um curso</option>
                                {Array.isArray(courses) && courses.map(course => (
                                    <option key={course.id} value={course.id}>{course.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        {chartType === 'connectAttendance' && <ConnectAttendanceChart reports={reports} allMembers={members} connectId={null} />}
                        {chartType === 'courseAttendance' && <CourseAttendanceChart courseId={selectedCourse} courseName={Array.isArray(courses) ? courses.find(c => c.id === selectedCourse)?.name : ''} />}
                    </div>

                </div>
                <div className="lg:col-span-1 space-y-4 sm:space-y-6 lg:space-y-8">
                    {hasDecisionAccess && (
                        <PendingDecisionsWidget
                            decisions={visibleDecisions}
                            onContacted={handleUpdateDecisionStatus}
                            getConnectName={getConnectName}
                        />
                    )}
                    {isLeader && (
                        <FollowUpWidget alerts={attendanceAlerts} getConnectName={getConnectName} />
                    )}
                    <BirthdayWidget members={(() => {
                        if (isAdmin) return members;
                        const userEmail = (currentUserData?.email || '').toLowerCase();
                        const linkedConnectIds = connects.filter(c => {
                            const isL = c.leaderId === currentUserData?.id || (c.leaderEmail || '').toLowerCase() === userEmail;
                            const isS = (c.supervisorEmail || '').toLowerCase() === userEmail;
                            const isAux = Array.isArray(c.auxLeaders) ? c.auxLeaders.some(l => l.id === currentUserData?.id || (l.email || '').toLowerCase() === userEmail) : (c.auxLeaderId === currentUserData?.id || (c.auxLeaderEmail || '').toLowerCase() === userEmail);
                            return isL || isS || isAux;
                        }).map(c => c.id);

                        // Also include user's own connect if they are just a member
                        const myMemberRecord = members.find(m => m.id === currentUserData?.id || (m.email || '').toLowerCase() === userEmail);
                        if (myMemberRecord && myMemberRecord.connectId && !linkedConnectIds.includes(myMemberRecord.connectId)) {
                            linkedConnectIds.push(myMemberRecord.connectId);
                        }

                        return members.filter(m => linkedConnectIds.includes(m.connectId));
                    })()} />
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;