import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Importando as páginas
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import ConnectsPage from './pages/ConnectsPage';
import ConnectTrackPage from './pages/ConnectTrackPage';
import CoursesPage from './pages/CoursesPage';
import LeadershipHierarchyPage from './pages/LeadershipHierarchyPage';
import BulkImportPage from './pages/BulkImportPage';
import MyStudentsPage from './pages/MyStudentsPage';
import PersonalPortalPage from './pages/PersonalPortalPage';

const AppRouter = ({ 
    allMembers, 
    allConnects, 
    allCourses, 
    allCourseTemplates,
    allConnectReports,
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
    // Funções de utilidade
    calculateFinalGradeForStudent,
    getStudentStatusInfo,
    areNamesSimilar,
    attendanceAlerts,
    getConnectName
}) => {
    const { isAdmin, currentUserData } = useAuthStore();

    return (
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
                    />
                } 
            />
            
            {/* Membros - apenas para admins */}
            {isAdmin && (
                <Route 
                    path="/membros" 
                    element={
                        <MembersPage 
                            allMembers={allMembers}
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
                        />
                    } 
                />
            )}
            
            {/* Connects - apenas para admins */}
            {isAdmin && (
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
                        loadingStates={loadingStates}
                        operationStatus={operationStatus}
                        setOperationStatus={setOperationStatus}
                    />
                    } 
                />
            )}
            
            {/* Trilho de Connect - apenas para admins */}
            {isAdmin && (
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
            
            {/* Cursos - apenas para admins */}
            {isAdmin && (
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
                        />
                    } 
                />
            )}
            

            
            {/* Hierarquia de Liderança - apenas para admins */}
            {isAdmin && (
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
                            operationStatus={operationStatus}
                            setOperationStatus={setOperationStatus}
                            areNamesSimilar={areNamesSimilar}
                        />
                    } 
                />
            )}
            
            {/* Meus Alunos - apenas para líderes */}
            {currentUserData?.isLeader && (
                <Route 
                    path="/meus-alunos" 
                    element={
                        <MyStudentsPage 
                            allMembers={allMembers}
                            allConnects={allConnects}
                            allConnectReports={allConnectReports}
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
            
            {/* Rota 404 - redireciona para dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
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