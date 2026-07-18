import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Fallback de carregamento para divisão de código
import LoadingSpinner from './components/LoadingSpinner';
import NewDecisionAlertModal from './components/NewDecisionAlertModal';

// Code splitting: carregar páginas sob demanda
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const MembersPage = React.lazy(() => import('./pages/MembersPage'));
const ConnectsPage = React.lazy(() => import('./pages/ConnectsPage'));
const MultiplyConnectPage = React.lazy(() => import('./pages/MultiplyConnectPage'));
const ConnectTrackPage = React.lazy(() => import('./pages/ConnectTrackPage'));
const CoursesPage = React.lazy(() => import('./pages/CoursesPage'));
const CertificateEditorPage = React.lazy(() => import('./pages/CertificateEditorPage'));
const LeadershipHierarchyPage = React.lazy(() => import('./pages/LeadershipHierarchyPage'));
const BulkImportPage = React.lazy(() => import('./pages/BulkImportPage'));
const MyStudentsPage = React.lazy(() => import('./pages/MyStudentsPage'));
const PersonalPortalPage = React.lazy(() => import('./pages/PersonalPortalPage'));
const CourseGroupsPage = React.lazy(() => import('./pages/CourseGroupsPage'));
const DecisionFormPage = React.lazy(() => import('./pages/DecisionFormPage'));
const DecisionsHistoryPage = React.lazy(() => import('./pages/DecisionsHistoryPage'));

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const AppRouter = ({
    allMembers,
    allConnects,
    allCourses,
    allCourseTemplates,
    allCertificateTemplates,
    allConnectReports,
    allDecisions,
    allSimpleMembers,
    combinedMembers,
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
    handleDeleteCertificateTemplate,
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
    handleSaveCourseGroups,
    handleSaveSimpleMember,
    handleDeleteSimpleMember,
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
        allConnects.some(c => c.leaderId === currentUserData.id) ||
        allConnects.some(c => (c.leaderEmail || '').toLowerCase() === userEmail)
    ));
    const isSupervisor = !!(currentUserData && (
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
        allCourses.some(course => course.auxTeacherId === currentUserData.id) ||
        allCourses.some(course => Array.isArray(course.groups) && course.groups.some(g => g && (
            g.assistantId === currentUserData.id || 
            (g.assistantEmail || '').toLowerCase() === userEmail ||
            (Array.isArray(g.assistants) && g.assistants.some(a => a.id === currentUserData.id || (a.email || '').toLowerCase() === userEmail))
        )))
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

    // ── Filtro de decisões por Connect ────────────────────────────────────────
    // IDs dos Connects que este usuário lidera, supervisiona ou é auxiliar
    const myConnectIds = useMemo(() => {
        const isPastor = !!(currentUserData?.isPastor);
        if (isAdmin || isPastor) return null; // null = todos
        return visibleConnectIds;
    }, [isAdmin, currentUserData, visibleConnectIds]);

    // Decisões do Connect deste usuário (todas, sem filtro de data — para o histórico)
    const myDecisions = useMemo(() => {
        if (!allDecisions) return [];
        const list = myConnectIds === null
            ? allDecisions
            : allDecisions.filter(d => myConnectIds.includes(d.connectId));
        return [...list].sort((a, b) => {
            const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const db2 = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return db2 - da;
        });
    }, [allDecisions, myConnectIds]);

    // Decisões ativas no Dashboard: pendentes + contatadas há menos de 7 dias
    const activeDecisions = useMemo(() => {
        return myDecisions.filter(d => {
            if (d.status === 'pendente') return true;
            if (d.status === 'contatado') {
                // Usa contactedAt se disponível; caso contrário, usa createdAt como fallback
                // para decisões antigas que foram marcadas antes da adição do campo
                const refDate = d.contactedAt?.toDate
                    ? d.contactedAt.toDate()
                    : (d.createdAt?.toDate ? d.createdAt.toDate() : null);
                // Sem nenhuma data = considera arquivado (não exibe)
                if (!refDate) return false;
                return Date.now() - refDate.getTime() < SEVEN_DAYS_MS;
            }
            return false;
        });
    }, [myDecisions]);

    // ── Modal de alerta ao logar (só para líderes de Connect) ───────────────
    // Aparece toda vez que o site é aberto/recarregado enquanto houver pendentes.
    // Usa useRef para garantir que abra apenas UMA vez por montagem, mesmo que
    // os dados do Firestore cheguem depois do render inicial.
    const [alertOpen, setAlertOpen] = useState(false);
    const alertShownRef = useRef(false); // flag: já exibiu nesta montagem?
    const handleCloseAlert = () => setAlertOpen(false);

    // Decisões pendentes do Connect do líder (para o modal de alerta)
    const alertDecisions = useMemo(() => {
        if (!isLeader) return [];
        return activeDecisions.filter(d => d.status === 'pendente');
    }, [isLeader, activeDecisions]);

    // Abre o modal assim que o líder e as decisões pendentes forem conhecidos
    useEffect(() => {
        if (isLeader && alertDecisions.length > 0 && !alertShownRef.current) {
            alertShownRef.current = true; // marca como exibido nesta montagem
            setAlertOpen(true);
        }
    }, [isLeader, alertDecisions.length]);

    // Fecha o modal se todas as pendentes forem resolvidas enquanto ele está aberto
    useEffect(() => {
        if (alertOpen && alertDecisions.length === 0) {
            setAlertOpen(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alertDecisions.length]);

    return (
        <Suspense fallback={<LoadingSpinner />}>
            {/* Modal de alerta: decisões pendentes — apenas para líderes de Connect */}
            {isLeader && alertDecisions.length > 0 && (
                <NewDecisionAlertModal
                    isOpen={alertOpen}
                    onClose={handleCloseAlert}
                    decisions={alertDecisions}
                    onContacted={handleUpdateDecisionStatus}
                    getConnectName={getConnectName}
                />
            )}
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
                            allDecisions={activeDecisions}
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
                                allSimpleMembers={allSimpleMembers}
                                onSaveSimpleMember={handleSaveSimpleMember}
                                onDeleteSimpleMember={handleDeleteSimpleMember}
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
                                certificateTemplates={allCertificateTemplates}
                                allMembers={allMembers}
                                onAddCourse={handleAddCourse}
                                onEditCourse={handleEditCourse}
                                onDelete={(type, id) => {
                                    if (type === 'course') handleDeleteCourse('course', id);
                                    else if (type === 'courseTemplate') handleDeleteCourseTemplate('courseTemplate', id);
                                    else if (type === 'certificateTemplate') handleDeleteCertificateTemplate('certificateTemplate', id);
                                }}
                                onManageCourse={handleManageCourse}
                                onFinalizeCourse={handleFinalizeCourse}
                                onReopenCourse={handleReopenCourse}
                                onAddCourseTemplate={handleAddCourseTemplate}
                                onEditCourseTemplate={handleEditCourseTemplate}
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

                {/* Gerenciar Grupos do Curso - Visível apenas para Admins, Professores e Substitutos */}
                {(isAdmin || isTeacher) && (
                    <Route
                        path="/curso-grupos/:courseId"
                        element={
                                <CourseGroupsWrapper
                                    allCourses={allCourses}
                                    allMembers={allMembers}
                                    allSimpleMembers={allSimpleMembers}
                                    onSaveGroups={handleSaveCourseGroups}
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

                {/* Editor de Certificados - Admins */}
                {isAdmin && (
                    <Route
                        path="/certificados/editor/:id"
                        element={
                            <CertificateEditorPage
                                allCertificateTemplates={allCertificateTemplates}
                                loadingStates={loadingStates}
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

                {/* Histórico de Decisões - líderes, auxiliares, supervisores, pastores e admins */}
                {(isAdmin || isLeader || isSupervisor || isAuxLeader || currentUserData?.isPastor) && (
                    <Route
                        path="/decisoes"
                        element={
                            <DecisionsHistoryPage
                                allConnects={allConnects}
                                getConnectName={getConnectName}
                                handleUpdateDecisionStatus={handleUpdateDecisionStatus}
                            />
                        }
                    />
                )}

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

// Componente wrapper para CourseGroupsPage que usa useParams
const CourseGroupsWrapper = ({ allCourses, allMembers, allSimpleMembers, onSaveGroups }) => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const course = allCourses.find(c => c.id === courseId);
    
    if (!course) {
        return <Navigate to="/cursos" replace />;
    }
    
    return (
        <CourseGroupsPage
            course={course}
            allMembers={allMembers}
            allSimpleMembers={allSimpleMembers}
            onSaveGroups={onSaveGroups}
            onBack={() => navigate('/cursos')}
        />
    );
};

export default AppRouter;
