import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Fallback de carregamento para divisão de código
import LoadingSpinner from './components/LoadingSpinner';

// Code splitting: carregar páginas sob demanda
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const MembersPage = React.lazy(() => import('./pages/MembersPage'));
const ConnectsPage = React.lazy(() => import('./pages/ConnectsPage'));
const MultiplyConnectPage = React.lazy(() => import('./pages/MultiplyConnectPage'));
const ConnectTrackPage = React.lazy(() => import('./pages/ConnectTrackPage'));
const CoursesPage = React.lazy(() => import('./pages/CoursesPage'));
const LeadershipHierarchyPage = React.lazy(() => import('./pages/LeadershipHierarchyPage'));
const BulkImportPage = React.lazy(() => import('./pages/BulkImportPage'));
const MyStudentsPage = React.lazy(() => import('./pages/MyStudentsPage'));
const PersonalPortalPage = React.lazy(() => import('./pages/PersonalPortalPage'));
const DecisionFormPage = React.lazy(() => import('./pages/DecisionFormPage'));

const AppRouter = ({
    allMembers,
    allConnects,
    allCourses,
    allCourseTemplates,
    allConnectReports,
    allDecisions,
    membersWithCourses,
    completedCourses,
    memberConnectHistoryDetails,
    loadingStates,
    operationStatus,
    setOperationStatus,
    // Handlers para modais
    handleAddMember,
    handleEditMember,
    handleDeleteMember,
    handleReactivateMember,
    handleAddConnect,
    handleEditConnect,
    handleDeleteConnect,
    handleAddCourse,
    handleEditCourse,
    handleDeleteCourse,
    handleManageCourse,
    handleAddCourseTemplate,
    handleEditCourseTemplate,
    handleDeleteCourseTemplate,
    handleGenerateReport,
    handleGenerateFullReport,
    handleViewMember,
    handleViewConnectTrack,
    handleLeadershipTrack,
    handleSetAuxLeader,
    handleRemoveAuxLeader,
    handleSetAuxTeacher,
    handleFinalizeCourse,
    handleReopenCourse,
    handleUpdateDecisionStatus,
    // Funções de utilidade
    calculateFinalGradeForStudent,
    getStudentStatusInfo,
    areNamesSimilar,
    attendanceAlerts,
    getConnectName
}) => {
    const { isAdmin, currentUserData } = useAuthStore();
    const navigate = useNavigate();

    // Perfis derivados (líder, supervisor e professor) para controle de rotas
    const userEmail = (currentUserData?.email || '').toLowerCase();
    const isLeader = !!(currentUserData && (
        currentUserData.isLeader ||
        allConnects.some(c => c.leaderId === currentUserData.id) ||
        allConnects.some(c => (c.leaderEmail || '').toLowerCase() === userEmail)
    ));
    const isSupervisor = !!(currentUserData && (
        currentUserData.isSupervisor ||
        allConnects.some(c => (c.supervisorEmail || '').toLowerCase() === userEmail)
    ));
    const isAuxLeader = !!(currentUserData && (
        // Novo: verifica lista de auxiliares
        allConnects.some(c => Array.isArray(c.auxLeaders) && c.auxLeaders.some(l => l.id === currentUserData.id || (l.email || '').toLowerCase() === userEmail)) ||
        // Legado: mantém suporte aos campos antigos
        allConnects.some(c => c.auxLeaderId === currentUserData.id) ||
        allConnects.some(c => (c.auxLeaderEmail || '').toLowerCase() === userEmail)
    ));
    const isTeacher = !!(currentUserData && (
        allCourses.some(course => (course.teacherEmail || '').toLowerCase() === userEmail) ||
        allCourses.some(course => {
            if (!course.substituteTeacher || !course.substituteTeacher.teacherId) return false;
            const substituteMember = allMembers.find(m => m.id === course.substituteTeacher.teacherId);
            if (!substituteMember || (substituteMember.email || '').toLowerCase() !== userEmail) return false;
            const today = new Date();
            const startDate = new Date(course.substituteTeacher.startDate);
            if (course.substituteTeacher.isIndefinite) {
                return today >= startDate;
            }
            const endDate = new Date(course.substituteTeacher.endDate);
            return today >= startDate && today <= endDate;
        })
    ));

    const isAuxTeacher = !!(currentUserData && (
        allCourses.some(course => (course.auxTeacherEmail || '').toLowerCase() === userEmail) ||
        allCourses.some(course => course.auxTeacherId === currentUserData.id)
    ));

    // Conjunto de Connects que o usuário pode ver (lidera, supervisiona ou é auxiliar)
    const visibleConnectIds = allConnects
        .filter(c => {
            const isLeader = c.leaderId === currentUserData?.id || (c.leaderEmail || '').toLowerCase() === userEmail;
            const isSupervisor = (c.supervisorEmail || '').toLowerCase() === userEmail;
            const isAux = (
                Array.isArray(c.auxLeaders) && c.auxLeaders.some(l => l.id === currentUserData?.id || (l.email || '').toLowerCase() === userEmail)
            ) || c.auxLeaderId === currentUserData?.id || (c.auxLeaderEmail || '').toLowerCase() === userEmail;

            return isLeader || isSupervisor || isAux;
        })
        .map(c => c.id);

    // Membros visíveis ao usuário corrente
    const visibleMembers = isAdmin ? allMembers : allMembers.filter(m => visibleConnectIds.includes(m.connectId));

    return (
        <Suspense fallback={<LoadingSpinner />}>
            <Routes>
                {/* Rota padrão - redireciona para dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Dashboard */}
                <Route
                    path="/dashboard"
                    element={
                        <DashboardPage
                            members={allMembers}
                            connects={allConnects}
                            courses={allCourses}
                            reports={allConnectReports}
                            attendanceAlerts={attendanceAlerts}
                            getConnectName={getConnectName}
                            allDecisions={allDecisions}
                            handleUpdateDecisionStatus={handleUpdateDecisionStatus}
                        />
                    }
                />

                {/* Membros - visível para Admins, Líderes e Supervisores */}
                {(isAdmin || isLeader || isSupervisor || isAuxLeader) && (
                    <Route
                        path="/membros"
                        element={
                            <MembersPage
                                allMembers={isAdmin ? allMembers : visibleMembers}
                                allConnects={allConnects}
                                isAdmin={isAdmin}
                                currentUserData={currentUserData}
                                onAddMember={handleAddMember}
                                onEditMember={handleEditMember}
                                onDeleteMember={handleDeleteMember}
                                onReactivateMember={handleReactivateMember}
                                onViewMember={handleViewMember}
                                onViewTrack={handleViewMember}
                                loadingStates={loadingStates}
                                operationStatus={operationStatus}
                                setOperationStatus={setOperationStatus}
                                areNamesSimilar={areNamesSimilar}
                                getConnectName={getConnectName}
                                onBulkImport={() => navigate('/importacao-lote')}
                            />
                        }
                    />
                )}

                {/* Connects - visível para Admins, Líderes e Supervisores */}
                {(isAdmin || isLeader || isSupervisor || isAuxLeader) && (
                    <Route
                        path="/connects"
                        element={
                            <ConnectsPage
                                connects={allConnects}
                                allMembers={allMembers}
                                allConnectReports={allConnectReports}
                                onAddConnect={handleAddConnect}
                                onEditConnect={handleEditConnect}
                                onDeleteConnect={handleDeleteConnect}
                                onGenerateReport={handleGenerateReport}
                                onGenerateFullReport={handleGenerateFullReport}
                                onViewTrack={handleViewConnectTrack}
                                onReport={handleGenerateReport}
                                onSetAuxLeader={handleSetAuxLeader}
                                onRemoveAuxLeader={handleRemoveAuxLeader}
                                loadingStates={loadingStates}
                                operationStatus={operationStatus}
                                setOperationStatus={setOperationStatus}
                            />
                        }
                    />
                )}

                {/* Multiplicação de Connects - visível para Admins, Líderes e Supervisores */}
                {(isAdmin || isLeader || isSupervisor || isAuxLeader) && (
                    <Route
                        path="/multiplicar-connect/:connectId"
                        element={
                            <MultiplyConnectPage
                                allConnects={allConnects}
                                allMembers={allMembers}
                                operationStatus={operationStatus}
                                setOperationStatus={setOperationStatus}
                            />
                        }
                    />
                )}

                {/* Trilho de Connect - visível para Admins, Líderes e Supervisores */}
                {(isAdmin || isLeader || isSupervisor) && (
                    <Route
                        path="/connect-track/:connectId"
                        element={
                            <ConnectTrackWrapper
                                allConnects={allConnects}
                                allMembers={allMembers}
                                allCourses={allCourses}
                                attendanceAlerts={attendanceAlerts}
                                handleViewMember={handleViewMember}
                                handleReactivateMember={handleReactivateMember}
                            />
                        }
                    />
                )}

                {/* Cursos - Admins, Professores e Auxiliares de Professor */}
                {(isAdmin || isTeacher || isAuxTeacher) && (
                    <Route
                        path="/cursos"
                        element={
                            <CoursesPage
                                courses={allCourses}
                                courseTemplates={allCourseTemplates}
                                allMembers={allMembers}
                                onAddCourse={handleAddCourse}
                                onEditCourse={handleEditCourse}
                                onDeleteCourse={handleDeleteCourse}
                                onManageCourse={handleManageCourse}
                                onAddCourseTemplate={handleAddCourseTemplate}
                                onEditCourseTemplate={handleEditCourseTemplate}
                                onDeleteCourseTemplate={handleDeleteCourseTemplate}
                                loadingStates={loadingStates}
                                operationStatus={operationStatus}
                                setOperationStatus={setOperationStatus}
                                calculateFinalGradeForStudent={calculateFinalGradeForStudent}
                                getStudentStatusInfo={getStudentStatusInfo}
                                onSetAuxTeacher={handleSetAuxTeacher}
                            />
                        }
                    />
                )}

                {/* Hierarquia de Liderança - visível para Admins, Líderes e Supervisores */}
                {(isAdmin || isLeader || isSupervisor) && (
                    <Route
                        path="/hierarquia-lideranca"
                        element={
                            <LeadershipHierarchyPage
                                connects={allConnects}
                                allMembers={allMembers}
                                onLeadershipTrack={handleLeadershipTrack}
                                operationStatus={operationStatus}
                                setOperationStatus={setOperationStatus}
                            />
                        }
                    />
                )}

                {/* Importação em Lote - apenas para admins */}
                {isAdmin && (
                    <Route
                        path="/importacao-lote"
                        element={
                            <BulkImportPage
                                allMembers={allMembers}
                                allConnects={allConnects}
                                operationStatus={operationStatus}
                                setOperationStatus={setOperationStatus}
                                areNamesSimilar={areNamesSimilar}
                            />
                        }
                    />
                )}

                {/* Meus Alunos - Professores e Líderes */}
                {(isTeacher || isLeader) && (
                    <Route
                        path="/meus-alunos"
                        element={
                            <MyStudentsPage
                                allMembers={allMembers}
                                allConnects={allConnects}
                                allConnectReports={allConnectReports}
                                allCourses={allCourses}
                                currentUserData={currentUserData}
                                onGenerateReport={handleGenerateReport}
                                loadingStates={loadingStates}
                                operationStatus={operationStatus}
                                setOperationStatus={setOperationStatus}
                            />
                        }
                    />
                )}

                {/* Portal Pessoal - para todos os usuários logados */}
                <Route
                    path="/portal-pessoal"
                    element={
                        <PersonalPortalPage
                            allMembers={allMembers}
                            allCourses={allCourses}
                            allConnects={allConnects}
                            currentUserData={currentUserData}
                            membersWithCourses={membersWithCourses}
                            completedCourses={completedCourses}
                            operationStatus={operationStatus}
                            setOperationStatus={setOperationStatus}
                            calculateFinalGradeForStudent={calculateFinalGradeForStudent}
                            getStudentStatusInfo={getStudentStatusInfo}
                        />
                    }
                />
                {/* Alias para "Minha Área" */}
                <Route
                    path="/minha-area"
                    element={
                        <PersonalPortalPage
                            allMembers={allMembers}
                            allCourses={allCourses}
                            allConnects={allConnects}
                            currentUserData={currentUserData}
                            membersWithCourses={membersWithCourses}
                            completedCourses={completedCourses}
                            operationStatus={operationStatus}
                            setOperationStatus={setOperationStatus}
                            calculateFinalGradeForStudent={calculateFinalGradeForStudent}
                            getStudentStatusInfo={getStudentStatusInfo}
                        />
                    }
                />

                {/* Página de Nova Decisão */}
                <Route path="/nova-decisao" element={<DecisionFormPage />} />

                {/* Rota 404 - redireciona para dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Suspense>
    );
};

// Componente wrapper para ConnectTrackPage que usa useParams
const ConnectTrackWrapper = ({ allConnects, allMembers, allCourses, attendanceAlerts, handleViewMember, handleReactivateMember }) => {
    const { connectId } = useParams();
    const [membersWithCourses, setMembersWithCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const connect = allConnects.find(c => c.id === connectId);

    useEffect(() => {
        const loadMembersWithCourses = async () => {
            if (!connect || !allMembers) return;

            setLoading(true);
            const connectMembers = allMembers.filter(m => m.connectId === connect.id);
            const membersWithCoursesPromises = connectMembers.map(async (member) => {
                try {
                    const appId = process.env.REACT_APP_FIREBASE_APP_ID || 'default';
                    const coursesRef = collection(db, `artifacts/${appId}/public/data/members/${member.id}/completedCourses`);
                    const querySnapshot = await getDocs(coursesRef);
                    const completedCourses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    return { ...member, completedCourses };
                } catch (error) {
                    console.error(`Erro ao carregar cursos do membro ${member.name}:`, error);
                    return { ...member, completedCourses: [] };
                }
            });

            const membersWithData = await Promise.all(membersWithCoursesPromises);
            setMembersWithCourses(membersWithData);
            setLoading(false);
        };

        loadMembersWithCourses();
    }, [connect, allMembers]);

    if (!connect) {
        return <Navigate to="/connects" replace />;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-gray-600">Carregando dados do Connect...</div>
            </div>
        );
    }

    return (
        <ConnectTrackPage
            connect={connect}
            membersInConnect={membersWithCourses}
            allCourses={allCourses}
            allConnects={allConnects}
            attendanceAlerts={attendanceAlerts}
            onEditMember={handleViewMember}
            onReactivateMember={handleReactivateMember}
        />
    );
};

export default AppRouter;
