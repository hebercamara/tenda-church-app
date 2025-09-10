import React, { useState, useEffect, useMemo, useCallback } from 'react';
import damerau from 'damerau-levenshtein';
import { useAuthStore } from './store/authStore';
import { useMultipleLoadingStates } from './hooks/useLoadingState';
import LoadingMessage from './components/LoadingMessage';

// Firebase
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, doc, setDoc, getDocs, deleteDoc, updateDoc, query, writeBatch, where, getDoc } from 'firebase/firestore';
import { db, auth, appId } from './firebaseConfig';

// (O resto das importações continua igual...)
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import LoadingSpinner from './components/LoadingSpinner';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import ConnectsPage from './pages/ConnectsPage';
import CoursesPage from './pages/CoursesPage';
import ProfilePage from './pages/ProfilePage';
import ConnectTrackPage from './pages/ConnectTrackPage';
import LeadershipHierarchyPage from './pages/LeadershipHierarchyPage';
import BulkImportPage from './pages/BulkImportPage';
import Modal from './components/Modal';
import ConfirmationModal from './components/ConfirmationModal';
import MemberForm from './components/MemberForm';
import ConnectForm from './components/ConnectForm';
import CourseForm from './components/CourseForm';
import CourseTemplateForm from './components/CourseTemplateForm';
import ManageCourseModal from './components/ManageCourseModal';
import ConnectReportModal from './components/ConnectReportModal';
import ConnectFullReportModal from './components/ConnectFullReportModal';
import LeadershipTrackModal from './components/LeadershipTrackModal';
import DuplicateMemberModal from './components/DuplicateMemberModal';
import UserAccessHelper from './components/UserAccessHelper';

const ADMIN_EMAIL = "tendachurchgbi@batistavida.com.br";

// (As funções de utilidade `calculateFinalGradeForStudent`, `getStudentStatusInfo`, `areNamesSimilar` continuam as mesmas aqui...)
// --- FUNÇÕES DE UTILIDADE (HELPERS) ---
const calculateFinalGradeForStudent = (student, course) => {
    const scores = student.scores;
    const { assessment } = course;
    if (!scores || !assessment) return 0;
    let total = 0;
    total += (scores.tests || []).reduce((sum, score) => sum + (Number(score) || 0), 0);
    total += (scores.assignments || []).reduce((sum, score) => sum + (Number(score) || 0), 0);
    total += ((scores.activities || []).filter(done => done).length) * (assessment.activities.value || 0);
    return parseFloat(total.toFixed(2));
};

const getStudentStatusInfo = (student, course, attendanceRecords) => {
    if (!attendanceRecords || !course || !student) return 'Pendente';
    
    let presentCount = 0;
    attendanceRecords.forEach(record => {
        if (record.statuses && (record.statuses[student.id] === 'presente' || record.statuses[student.id] === 'justificado')) {
            presentCount++;
        }
    });
    const attendancePercentage = attendanceRecords.length > 0 ? Math.round((presentCount / attendanceRecords.length) * 100) : 0;
    
    const finalGrade = calculateFinalGradeForStudent(student, course);
    
    const { passingCriteria } = course;
    if (!passingCriteria) return 'Cursando';
    if (attendancePercentage < passingCriteria.minAttendance) return 'Reprovado por Falta';
    if (finalGrade < passingCriteria.minGrade) return 'Reprovado por Nota';
    
    return 'Aprovado';
};

const areNamesSimilar = (nameA, nameB, threshold) => {
    const normalize = (str) => str.toLowerCase().trim().replace(/\s+/g, ' ');

    const tokensA = normalize(nameA).split(' ');
    const tokensB = normalize(nameB).split(' ');

    if (tokensA.length === 0 || tokensB.length === 0) {
        return false;
    }
    const firstNameA = tokensA[0];
    const firstNameB = tokensB[0];
    if (damerau(firstNameA, firstNameB).similarity < threshold) {
        return false;
    }
    if (tokensA.length === 1 && tokensB.length === 1) {
        return true;
    }
    const surnamesA = tokensA.slice(1);
    const surnamesB = tokensB.slice(1);
    if (surnamesA.length === 0 || surnamesB.length === 0) {
        return true;
    }
    for (const surnameA of surnamesA) {
        for (const surnameB of surnamesB) {
            if (damerau(surnameA, surnameB).similarity >= threshold) {
                return true;
            }
        }
    }
    return false;
};

export default function App() {
    const { user, isAdmin, currentUserData, setAuthData, clearAuthData } = useAuthStore();
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [activePage, setActivePage] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [allMembers, setAllMembers] = useState([]);
    const [allConnects, setAllConnects] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [allCourseTemplates, setAllCourseTemplates] = useState([]);
    const [allConnectReports, setAllConnectReports] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [connectionError, setConnectionError] = useState(null);
    const [operationStatus, setOperationStatus] = useState({ type: null, message: null });
    
    // Loading states para operações específicas
    const loadingStates = useMultipleLoadingStates([
        'saveMember', 'saveConnect', 'saveCourse', 'saveCourseTemplate', 
        'saveReport', 'deleteMember', 'deleteConnect', 'deleteCourse', 
        'reactivateMember', 'saveAttendance'
    ]);
    const [isMemberModalOpen, setMemberModalOpen] = useState(false);
    const [isConnectModalOpen, setConnectModalOpen] = useState(false);
    const [isCourseModalOpen, setCourseModalOpen] = useState(false);
    const [isCourseTemplateModalOpen, setCourseTemplateModalOpen] = useState(false);
    const [isManageCourseModalOpen, setManageCourseModalOpen] = useState(false);
    const [isReportModalOpen, setReportModalOpen] = useState(false);
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
    const [isConnectFullReportModalOpen, setConnectFullReportModalOpen] = useState(false);
    const [isLeadershipTrackModalOpen, setLeadershipTrackModalOpen] = useState(false);
    const [isDuplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [existingMemberForCheck, setExistingMemberForCheck] = useState(null);
    const [newMemberForCheck, setNewMemberForCheck] = useState(null);
    const [editingMember, setEditingMember] = useState(null);
    const [editingConnect, setEditingConnect] = useState(null);
    const [editingCourse, setEditingCourse] = useState(null);
    const [editingCourseTemplate, setEditingCourseTemplate] = useState(null);
    const [managingCourse, setManagingCourse] = useState(null);
    const [reportingConnect, setReportingConnect] = useState(null);
    const [generatingReportForConnect, setGeneratingReportForConnect] = useState(null);
    const [viewingMember, setViewingMember] = useState(null);
    const [viewingConnectTrack, setViewingConnectTrack] = useState(null);
    const [membersWithCourses, setMembersWithCourses] = useState([]);
    const [completedCourses, setCompletedCourses] = useState([]);
    const [deleteAction, setDeleteAction] = useState(null);
    const [memberConnectHistoryDetails, setMemberConnectHistoryDetails] = useState([]);

    // --- Efeitos ---

    // CORRIGIDO: useEffect 1 - Apenas para autenticação
    useEffect(() => {
        const authUnsub = onAuthStateChanged(auth, (currentUser) => {
            setAuthData({
                user: currentUser,
                isAdmin: currentUser?.email === ADMIN_EMAIL,
                currentUserData: null // Será preenchido pelo próximo useEffect
            });
            setIsLoadingAuth(false);
        });
        return () => authUnsub();
    }, [setAuthData]);

    // CORRIGIDO: useEffect 2 - Para buscar todos os membros e encontrar o dado do usuário logado
    useEffect(() => {
        if (!user) {
            setAllMembers([]); // Limpa a lista de membros se não houver usuário
            return;
        }
        const membersUnsub = onSnapshot(
            collection(db, `artifacts/${appId}/public/data/members`), 
            (snapshot) => {
                const membersList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllMembers(membersList);
                
                // Encontra e atualiza os dados do usuário logado no store
                const memberData = membersList.find(m => m.email?.toLowerCase() === user.email?.toLowerCase());
                
                setAuthData({ user, isAdmin, currentUserData: memberData || null });
            },
            (error) => {
                console.error('Erro ao carregar membros:', error);
                setConnectionError('Erro de conexão: Não foi possível carregar os dados dos membros.');
                setAllMembers([]);
                setAuthData({ user, isAdmin, currentUserData: null });
            }
        );
        return () => membersUnsub();
    }, [user, isAdmin, setAuthData]); // Depende do 'user' do store

    // CORRIGIDO: useEffect 3 - Para buscar os outros dados (Connects, Cursos, etc.)
    useEffect(() => {
        if (!user) {
            setLoadingData(false);
            // Limpa os dados se o usuário fizer logout
            setAllConnects([]);
            setAllCourses([]);
            setAllCourseTemplates([]);
            setAllConnectReports([]);
            return;
        }
        setLoadingData(true);
        const unsubs = [
            onSnapshot(
                collection(db, `artifacts/${appId}/public/data/connects`), 
                (s) => setAllConnects(s.docs.map(d => ({ id: d.id, ...d.data() }))),
                (error) => {
                    console.error('Erro ao carregar connects:', error);
                    setConnectionError('Erro de conexão: Não foi possível carregar os dados dos connects.');
                    setAllConnects([]);
                }
            ),
            onSnapshot(
                collection(db, `artifacts/${appId}/public/data/courses`), 
                (s) => setAllCourses(s.docs.map(d => ({ id: d.id, ...d.data() }))),
                (error) => {
                    console.error('Erro ao carregar cursos:', error);
                    setConnectionError('Erro de conexão: Não foi possível carregar os dados dos cursos.');
                    setAllCourses([]);
                }
            ),
            onSnapshot(
                collection(db, `artifacts/${appId}/public/data/courseTemplates`), 
                (s) => setAllCourseTemplates(s.docs.map(d => ({ id: d.id, ...d.data() }))),
                (error) => {
                    console.error('Erro ao carregar templates de curso:', error);
                    setConnectionError('Erro de conexão: Não foi possível carregar os templates de curso.');
                    setAllCourseTemplates([]);
                }
            ),
            onSnapshot(
                collection(db, `artifacts/${appId}/public/data/connect_reports`), 
                (s) => setAllConnectReports(s.docs.map(d => ({ id: d.id, ...d.data() }))),
                (error) => {
                    console.error('Erro ao carregar relatórios:', error);
                    setConnectionError('Erro de conexão: Não foi possível carregar os relatórios.');
                    setAllConnectReports([]);
                }
            )
        ];
        // Um delay para dar a percepção de carregamento e evitar piscar a tela
        setTimeout(() => setLoadingData(false), 500);
        return () => unsubs.forEach(unsub => unsub());
    }, [user]);

    // O resto do arquivo permanece o mesmo...

    const { visibleMembers, visibleConnects, visibleCourses, visibleReports } = useMemo(() => {
        if (!user || !currentUserData) return { visibleMembers: [], visibleConnects: [], visibleCourses: [], visibleReports: [] };
        
        if (isAdmin) {
            return { visibleMembers: allMembers, visibleConnects: allConnects, visibleCourses: allCourses, visibleReports: allConnectReports };
        }
        
        const userEmail = currentUserData.email?.toLowerCase();
        const supervisedConnects = allConnects.filter(c => c.supervisorEmail?.toLowerCase() === userEmail);
        const ledConnects = allConnects.filter(c => c.leaderEmail?.toLowerCase() === userEmail);
        const taughtCourses = allCourses.filter(c => c.teacherEmail?.toLowerCase() === userEmail);

        const visibleConnectsSet = new Set([...supervisedConnects, ...ledConnects]);
        const visibleConnects = Array.from(visibleConnectsSet);
        const visibleConnectIds = visibleConnects.map(c => c.id);
        
        const visibleMembers = allMembers.filter(m => visibleConnectIds.includes(m.connectId));
        const visibleReports = allConnectReports.filter(r => visibleConnectIds.includes(r.connectId));

        return { visibleMembers, visibleConnects, visibleCourses: taughtCourses, visibleReports };

    }, [user, isAdmin, currentUserData, allMembers, allConnects, allCourses, allConnectReports]);
    
    const attendanceAlerts = useMemo(() => {
        const alerts = [];
        if (!allMembers.length || !allConnectReports.length) {
            return alerts;
        }
        const sortedReports = [...allConnectReports].sort((a, b) => {
            const dateA = a.reportDate.toDate ? a.reportDate.toDate() : new Date(a.reportDate);
            const dateB = b.reportDate.toDate ? b.reportDate.toDate() : new Date(b.reportDate);
            return dateB - dateA;
        });
        const membersByConnect = allMembers.reduce((acc, member) => {
            if (member.connectId) {
                if (!acc[member.connectId]) acc[member.connectId] = [];
                acc[member.connectId].push(member);
            }
            return acc;
        }, {});
        
        for (const connectId in membersByConnect) {
            const members = membersByConnect[connectId];
            const reportsForConnect = sortedReports.filter(r => r.connectId === connectId);

            if (reportsForConnect.length < 4) continue;

            for (const member of members) {
                let consecutiveAbsences = 0;
                for (let i = 0; i < 4; i++) {
                    if (!reportsForConnect[i]) break;
                    const report = reportsForConnect[i];
                    const attendanceStatus = report.attendance?.[member.id];
                    if (attendanceStatus === 'ausente') {
                        consecutiveAbsences++;
                    } else {
                        break;
                    }
                }

                if (consecutiveAbsences >= 4) {
                    let totalConsecutiveAbsences = 0;
                    for (const report of reportsForConnect) {
                        const attendanceStatus = report.attendance?.[member.id];
                        if (attendanceStatus === 'ausente') {
                            totalConsecutiveAbsences++;
                        } else {
                            break;
                        }
                    }

                    alerts.push({
                        memberId: member.id,
                        memberName: member.name,
                        connectId: connectId,
                        absences: totalConsecutiveAbsences,
                        status: totalConsecutiveAbsences >= 6 ? 'inactive' : 'alert'
                    });
                }
            }
        }
        return alerts;
    }, [allMembers, allConnectReports]);

    const openMemberModal = (member = null) => { setEditingMember(member); setMemberModalOpen(true); };
    const closeMemberModal = () => setMemberModalOpen(false);
    const openConnectModal = (connect = null) => { setEditingConnect(connect); setConnectModalOpen(true); };
    const closeConnectModal = () => setConnectModalOpen(false);
    const openCourseModal = (course = null) => { setEditingCourse(course); setCourseModalOpen(true); };
    const closeCourseModal = () => { setEditingCourse(null); setCourseModalOpen(false); };
    const openCourseTemplateModal = (template = null) => { setEditingCourseTemplate(template); setCourseTemplateModalOpen(true); };
    const closeCourseTemplateModal = () => { setEditingCourseTemplate(null); setCourseTemplateModalOpen(false); };
    const openManageCourseModal = (course) => { setManagingCourse(course); setManageCourseModalOpen(true); };
    const closeManageCourseModal = () => setManageCourseModalOpen(false);
    const openReportModal = (connect) => { setReportingConnect(connect); setReportModalOpen(true); };
    const closeReportModal = () => setReportModalOpen(false);
    const openConnectFullReportModal = (connect) => { setGeneratingReportForConnect(connect); setConnectFullReportModalOpen(true); };
    const closeConnectFullReportModal = () => setConnectFullReportModalOpen(false);
    
    const openLeadershipTrackModal = async (member) => {
        if (!member) return;
        setViewingMember(member);
        
        try {
            const coursesRef = collection(db, `artifacts/${appId}/public/data/members/${member.id}/completedCourses`);
            const querySnapshot = await getDocs(coursesRef);
            const courses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCompletedCourses(courses);

            let historyDetails = [];
            if (member.connectHistory && member.connectHistory.length > 0) {
                for (const historyEntry of member.connectHistory) {
                    const connectName = getConnectName(historyEntry.connectId);
                    const relevantReports = allConnectReports.filter(report => {
                        const reportDate = report.reportDate.toDate ? report.reportDate.toDate() : new Date(report.reportDate);
                        const startDate = historyEntry.startDate.toDate ? historyEntry.startDate.toDate() : new Date(historyEntry.startDate);
                        const endDate = historyEntry.endDate ? (historyEntry.endDate.toDate ? historyEntry.endDate.toDate() : new Date(historyEntry.endDate)) : null;
                        
                        return report.connectId === historyEntry.connectId &&
                               reportDate >= startDate &&
                               (!endDate || reportDate <= endDate);
                    });
                    
                    let presenceCount = 0;
                    let absenceCount = 0;
                    relevantReports.forEach(report => {
                        const status = report.attendance?.[member.id];
                        if (status === 'presente' || status === 'justificado') {
                            presenceCount++;
                        } else if (status === 'ausente') {
                            absenceCount++;
                        }
                    });

                    historyDetails.push({
                        ...historyEntry,
                        connectName,
                        presenceCount,
                        absenceCount
                    });
                }
            }
            setMemberConnectHistoryDetails(historyDetails.sort((a, b) => (b.startDate.toDate ? b.startDate.toDate() : new Date(b.startDate)) - (a.startDate.toDate ? a.startDate.toDate() : new Date(a.startDate))));
            
        } catch (error) {
            console.error("Erro ao buscar dados para o Trilho de Liderança:", error);
            setCompletedCourses([]);
            setMemberConnectHistoryDetails([]);
        }

        setLeadershipTrackModalOpen(true);
    };
    const closeLeadershipTrackModal = () => {
        setLeadershipTrackModalOpen(false);
        setViewingMember(null);
        setCompletedCourses([]);
        setMemberConnectHistoryDetails([]);
    };

    const openConnectTrackPage = async (connect) => {
        if (!connect) return;
        setViewingConnectTrack(connect);
        
        const connectMembers = allMembers.filter(m => m.connectId === connect.id);
        const membersWithCoursesPromises = connectMembers.map(async (member) => {
            const coursesRef = collection(db, `artifacts/${appId}/public/data/members/${member.id}/completedCourses`);
            const querySnapshot = await getDocs(coursesRef);
            const completedCourses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { ...member, completedCourses };
        });

        const membersWithData = await Promise.all(membersWithCoursesPromises);
        setMembersWithCourses(membersWithData);
        setActivePage('connectTrack');
    };
    const closeConnectTrackPage = () => {
        setViewingConnectTrack(null);
        setMembersWithCourses([]);
        setActivePage('connects');
    };
    const triggerDelete = (type, id) => {
        let message = "Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.";
        if (type === 'connect') {
            message = "Atenção! Excluir este Connect removerá a associação de todos os membros a ele. Deseja continuar?";
        }
        setDeleteAction({ type, id, message });
        setConfirmModalOpen(true);
    };

    const handleLogout = async () => { await signOut(auth); clearAuthData(); setActivePage('dashboard'); };
    
    const handleSaveMember = async (memberData, originalMember = null) => {
        const collectionPath = `artifacts/${appId}/public/data/members`;
        const today = new Date();
        
        loadingStates.setLoading('saveMember', 'Salvando membro...');
        
        try {
            let dataToSave = { ...memberData };
            
            if (originalMember && originalMember.connectId !== dataToSave.connectId) {
                const history = originalMember.connectHistory || [];
                const lastEntry = history.find(entry => !entry.endDate);
                
                if (lastEntry) {
                    lastEntry.endDate = today;
                }
                
                if (dataToSave.connectId) {
                    history.push({ connectId: dataToSave.connectId, startDate: today, endDate: null });
                }
                dataToSave.connectHistory = history;
            } else if (!originalMember && dataToSave.connectId) {
                dataToSave.connectHistory = [{ connectId: dataToSave.connectId, startDate: today, endDate: null }];
            }

            if (editingMember || originalMember) {
                const memberId = editingMember?.id || originalMember?.id;
                await setDoc(doc(db, collectionPath, memberId), dataToSave);
            } else {
                await addDoc(collection(db, collectionPath), dataToSave);
            }
            
            loadingStates.setSuccess('saveMember', 'Membro salvo com sucesso!');
            closeMemberModal();
        } catch (error) {
            console.error("Erro ao salvar membro:", error);
            loadingStates.setError('saveMember', 'Erro ao salvar membro. Tente novamente.');
        }
    };
    
    const handleCheckDuplicate = async (newMemberData) => {
        const SIMILARITY_THRESHOLD = 0.8;
        const newEmail = newMemberData.email.toLowerCase().trim();
        const newPhone = newMemberData.phone.replace(/\D/g, '');
        const newDob = newMemberData.dob;
        let potentialDuplicate = null;
        for (const existingMember of allMembers) {
            if (!existingMember.name) continue;
            const existingEmail = existingMember.email?.toLowerCase().trim();
            const existingPhone = existingMember.phone?.replace(/\D/g, '');
            const existingDob = existingMember.dob;
            const isEmailMatch = newEmail && newEmail === existingEmail;
            const isPhoneMatch = newPhone && newPhone === existingPhone;
            const isDobMatch = newDob && newDob === existingDob;
            if (isEmailMatch || isPhoneMatch || isDobMatch) {
                const isNameSimilar = areNamesSimilar(newMemberData.name, existingMember.name, SIMILARITY_THRESHOLD);
                if (isNameSimilar) {
                    potentialDuplicate = existingMember;
                    break;
                }
            }
        }
        if (potentialDuplicate) {
            setExistingMemberForCheck(potentialDuplicate);
            setNewMemberForCheck(newMemberData);
            setDuplicateModalOpen(true);
            closeMemberModal();
        } else {
            handleSaveMember(newMemberData, null);
        }
    };
    
    const handleRejectDuplicate = () => {
        handleSaveMember(newMemberForCheck, null);
        setDuplicateModalOpen(false);
    };
    
    const handleConfirmDuplicate = () => {
        if (existingMemberForCheck?.connectId) {
            const connect = allConnects.find(c => c.id === existingMemberForCheck.connectId);
            const leader = allMembers.find(m => m.id === connect?.leaderId);
            alert(`Este membro já pertence ao Connect ${connect?.number} - ${connect?.name}.\n\nPor favor, entre em contato com o líder: ${leader?.name} (${leader?.phone}) para atualizar o cadastro existente.`);
        } else {
            alert(`Este membro já está no sistema. Para evitar a criação de uma duplicata, por favor, feche esta janela e edite o cadastro existente de "${existingMemberForCheck.name}" na lista de membros.`);
        }
        setDuplicateModalOpen(false);
    };

    const handleSaveConnect = async (connectData) => {
        const collectionPath = `artifacts/${appId}/public/data/connects`;
        
        loadingStates.setLoading('saveConnect', 'Salvando connect...');
        
        try {
            let connectId = editingConnect?.id;
            if (editingConnect) {
                await setDoc(doc(db, collectionPath, connectId), connectData);
            } else {
                const q = query(collection(db, collectionPath), where("number", "==", connectData.number));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    loadingStates.setError('saveConnect', 'Já existe um Connect com este número.');
                    return;
                }
                const newDocRef = await addDoc(collection(db, collectionPath), connectData);
                connectId = newDocRef.id;
            }
            const leaderRef = doc(db, `artifacts/${appId}/public/data/members`, connectData.leaderId);
            await updateDoc(leaderRef, { connectId: connectId });
            
            loadingStates.setSuccess('saveConnect', 'Connect salvo com sucesso!');
            closeConnectModal();
        } catch (error) {
            console.error("Erro ao salvar connect:", error);
            loadingStates.setError('saveConnect', 'Erro ao salvar connect. Tente novamente.');
        }
    };
    const generateAttendanceRecords = async (courseId, courseData) => { const batch = writeBatch(db); const weekDaysMap = { "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3, "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6 }; const targetDay = weekDaysMap[courseData.classDay]; let currentDate = new Date(courseData.startDate + 'T00:00:00'); const endDate = new Date(courseData.endDate + 'T00:00:00'); while (currentDate <= endDate) { if (currentDate.getUTCDay() === targetDay) { const dateString = currentDate.toISOString().split('T')[0]; const attendanceRef = doc(db, `artifacts/${appId}/public/data/courses/${courseId}/attendance/${dateString}`); const initialStatuses = courseData.students.reduce((acc, student) => { acc[student.id] = 'pendente'; return acc; }, {}); batch.set(attendanceRef, { date: currentDate, statuses: initialStatuses }); } currentDate.setDate(currentDate.getDate() + 1); } await batch.commit(); };
    const handleSaveCourse = async (courseData) => {
        const collectionPath = `artifacts/${appId}/public/data/courses`;
        
        loadingStates.setLoading('saveCourse', 'Salvando curso...');
        
        try {
            if (editingCourse) {
                await setDoc(doc(db, collectionPath, editingCourse.id), courseData);
            } else {
                const newCourseRef = await addDoc(collection(db, collectionPath), courseData);
                await generateAttendanceRecords(newCourseRef.id, courseData);
            }
            
            loadingStates.setSuccess('saveCourse', 'Curso salvo com sucesso!');
            closeCourseModal();
        } catch (error) {
            console.error("Erro ao salvar curso:", error);
            loadingStates.setError('saveCourse', 'Erro ao salvar curso. Tente novamente.');
        }
    };
    const handleSaveCourseTemplate = async (templateData) => { const collectionPath = `artifacts/${appId}/public/data/courseTemplates`; try { if (editingCourseTemplate) { await setDoc(doc(db, collectionPath, editingCourseTemplate.id), templateData); } else { await addDoc(collection(db, collectionPath), templateData); } closeCourseTemplateModal(); } catch (error) { console.error("Erro ao salvar modelo de curso:", error); } };
    const handleSaveCourseStudents = async (courseId, students) => { const courseRef = doc(db, `artifacts/${appId}/public/data/courses/${courseId}`); try { await updateDoc(courseRef, { students: students }); } catch (error) { console.error("Erro ao salvar alunos do curso:", error); } };
    const handleSaveAttendance = async (courseId, dateId, statuses) => { const attendanceRef = doc(db, `artifacts/${appId}/public/data/courses/${courseId}/attendance/${dateId}`); try { await updateDoc(attendanceRef, { statuses: statuses }); } catch (error) { console.error("Erro ao salvar presença:", error); } };
    const handleSaveConnectReport = async (reportData) => {
        const dateString = reportData.reportDate.toISOString().split('T')[0];
        const reportId = `${reportData.connectId}_${dateString}`;
        const reportRef = doc(db, `artifacts/${appId}/public/data/connect_reports`, reportId);
        
        loadingStates.setLoading('saveReport', 'Salvando relatório...');
        
        try {
            await setDoc(reportRef, reportData);
            loadingStates.setSuccess('saveReport', 'Relatório salvo com sucesso!');
        } catch (error) {
            console.error("Erro ao salvar relatório do Connect:", error);
            loadingStates.setError('saveReport', 'Erro ao salvar relatório. Tente novamente.');
        }
    };
    // Funções de atualização de perfil removidas temporariamente (não utilizadas)
    const handleSaveMilestones = async (memberId, milestones) => {
        if (!memberId) throw new Error("ID do membro não fornecido.");
        const memberRef = doc(db, `artifacts/${appId}/public/data/members`, memberId);
        const milestonesToSave = { ...milestones };
        Object.keys(milestonesToSave).forEach(key => {
            milestonesToSave[key].completed = !!milestonesToSave[key].date;
        });
        await updateDoc(memberRef, { milestones: milestonesToSave });
    };
    const handleFinalizeCourse = async (course) => {
        if (!course || !course.id) return;
        const confirmation = window.confirm(`Tem certeza que deseja finalizar o curso "${course.name}" e processar os resultados? Esta ação não pode ser desfeita.`);
        if (!confirmation) return;
        try {
            const attendanceRef = collection(db, `artifacts/${appId}/public/data/courses/${course.id}/attendance`);
            const attendanceSnapshot = await getDocs(attendanceRef);
            const attendanceRecords = attendanceSnapshot.docs.map(d => d.data());
            let approvedCount = 0;
            const students = course.students || [];
            for (const student of students) {
                const status = getStudentStatusInfo(student, course, attendanceRecords);
                if (status === 'Aprovado') {
                    approvedCount++;
                    const finalGrade = calculateFinalGradeForStudent(student, course);
                    const completedCourseRef = doc(db, `artifacts/${appId}/public/data/members/${student.id}/completedCourses/${course.id}`);
                    await setDoc(completedCourseRef, {
                        courseName: course.name,
                        completionDate: new Date(),
                        finalGrade: finalGrade,
                        templateId: course.templateId || null,
                    });
                }
            }
            const courseRef = doc(db, `artifacts/${appId}/public/data/courses`, course.id);
            await updateDoc(courseRef, { finalized: true });
            alert(`Curso "${course.name}" finalizado com sucesso! ${approvedCount} de ${students.length} alunos foram aprovados e tiveram seus registros atualizados.`);
        } catch (error) {
            console.error("Erro ao finalizar o curso:", error);
            alert("Ocorreu um erro ao processar os resultados do curso.");
        }
    };
    const handleReopenCourse = async (course) => {
        if (!course || !course.id) return;
        const confirmation = window.confirm(`Tem certeza que deseja reabrir o curso "${course.name}"? Isso permitirá novas edições de notas e presenças, mas não removerá os registros do Trilho de Liderança já criados.`);
        if (!confirmation) return;
        try {
            const courseRef = doc(db, `artifacts/${appId}/public/data/courses`, course.id);
            await updateDoc(courseRef, { finalized: false });
            alert(`Curso "${course.name}" foi reaberto com sucesso.`);
        } catch (error) {
            console.error("Erro ao reabrir o curso:", error);
            alert("Ocorreu um erro ao reabrir o curso.");
        }
    };
    const handleReactivateMember = async (member, connectId) => {
        if (!member || !connectId) return;
        const confirmation = window.confirm(`Tem certeza que deseja reativar ${member.name}? Isso registrará uma presença para este membro na data de hoje.`);
        if (!confirmation) return;
        try {
            const today = new Date();
            const dateString = today.toISOString().split('T')[0];
            const reportId = `${connectId}_${dateString}`;
            const reportRef = doc(db, `artifacts/${appId}/public/data/connect_reports`, reportId);
            const reportSnap = await getDoc(reportRef);
            let attendanceData = {};
            if (reportSnap.exists()) {
                attendanceData = reportSnap.data().attendance || {};
            }
            attendanceData[member.id] = 'presente';
            const connect = allConnects.find(c => c.id === connectId);
            const reportData = {
                connectId: connectId,
                connectName: connect?.name || '',
                leaderId: connect?.leaderId || '',
                leaderName: connect?.leaderName || '',
                reportDate: today,
                guests: reportSnap.exists() ? reportSnap.data().guests || 0 : 0,
                offering: reportSnap.exists() ? reportSnap.data().offering || 0 : 0,
                attendance: attendanceData
            };
            await setDoc(reportRef, reportData, { merge: true });
            alert(`${member.name} foi reativado com sucesso.`);
        } catch (error) {
            console.error("Erro ao reativar membro:", error);
            alert("Ocorreu um erro ao tentar reativar o membro.");
        }
    };
    const handleConfirmDelete = async () => {
        if (!deleteAction) return;
        const { type, id } = deleteAction;
        
        loadingStates.setLoading('delete', 'Excluindo...');
        
        try {
            let collectionPath = `artifacts/${appId}/public/data/${type}s`;
            if (type === 'courseTemplate') {
                collectionPath = `artifacts/${appId}/public/data/courseTemplates`;
            }
            
            if (type === 'connect') {
                const batch = writeBatch(db);
                const membersToUpdateQuery = query(collection(db, `artifacts/${appId}/public/data/members`), where('connectId', '==', id));
                const membersSnapshot = await getDocs(membersToUpdateQuery);
                membersSnapshot.forEach(memberDoc => {
                    batch.update(memberDoc.ref, { connectId: '' });
                });
                const connectRef = doc(db, collectionPath, id);
                batch.delete(connectRef);
                await batch.commit();
            } else {
                await deleteDoc(doc(db, collectionPath, id));
            }
            
            loadingStates.setSuccess('delete', 'Item excluído com sucesso!');
        } catch (error) {
            console.error(`Erro ao deletar ${type}:`, error);
            loadingStates.setError('delete', 'Erro ao excluir item. Tente novamente.');
        } finally {
            setConfirmModalOpen(false);
            setDeleteAction(null);
        }
    };
    const getConnectName = useCallback((connectId) => { if (!connectId) return 'Sem Connect'; const connect = allConnects.find(c => c.id === connectId); return connect ? `${connect.number} - ${connect.name}` : '...'; }, [allConnects]);

    const renderActivePage = () => {
        if (loadingData) return <LoadingSpinner />;
        
        if (activePage === 'connectTrack' && viewingConnectTrack) {
            return <ConnectTrackPage 
                        connect={viewingConnectTrack} 
                        membersInConnect={membersWithCourses}
                        allCourses={allCourses}
                        allConnects={allConnects} 
                        onBack={closeConnectTrackPage}
                        attendanceAlerts={attendanceAlerts}
                        onReactivateMember={handleReactivateMember}
                    />;
        }

        switch (activePage) {
            case 'dashboard':
                return <DashboardPage 
                            members={visibleMembers} 
                            connects={visibleConnects} 
                            reports={visibleReports} 
                            courses={visibleCourses}
                            attendanceAlerts={attendanceAlerts.filter(a => visibleConnects.some(c => c.id === a.connectId))}
                            getConnectName={getConnectName}
                        />;
            case 'members':
                return <MembersPage 
                            onAddMember={openMemberModal} 
                            onEditMember={openMemberModal} 
                            onDeleteMember={triggerDelete} 
                            onViewTrack={openLeadershipTrackModal}
                            getConnectName={getConnectName}
                            isAdmin={isAdmin}
                            currentUserData={currentUserData}
                            allConnects={allConnects}
                        />;
            case 'connects':
                return <ConnectsPage 
                            connects={visibleConnects} 
                            onAddConnect={openConnectModal} 
                            onEditConnect={openConnectModal} 
                            onDeleteConnect={triggerDelete} 
                            onReport={openReportModal} 
                            onGenerateReport={openConnectFullReportModal}
                            onViewTrack={openConnectTrackPage}
                            isAdmin={isAdmin} 
                        />;
            case 'courses':
                return <CoursesPage 
                            courses={visibleCourses} 
                            courseTemplates={allCourseTemplates}
                            onAddCourse={openCourseModal}
                            onAddCourseTemplate={openCourseTemplateModal}
                            onEditCourse={openCourseModal} 
                            onEditCourseTemplate={openCourseTemplateModal}
                            onDelete={triggerDelete}
                            onManageCourse={openManageCourseModal} 
                            onFinalizeCourse={handleFinalizeCourse}
                            onReopenCourse={handleReopenCourse}
                            isAdmin={isAdmin} 
                        />;
            case 'hierarchy':
                return <LeadershipHierarchyPage 
                            connects={allConnects}
                            allMembers={allMembers}
                            isAdmin={isAdmin}
                        />;
            case 'bulk-import':
                return <BulkImportPage />;
            case 'profile':
                return <ProfilePage />;
            default:
                return <DashboardPage 
                            members={visibleMembers} 
                            connects={visibleConnects} 
                            reports={visibleReports} 
                            courses={visibleCourses}
                            attendanceAlerts={attendanceAlerts.filter(a => visibleConnects.some(c => c.id === a.connectId))}
                            getConnectName={getConnectName}
                        />;
        }
    };

    if (isLoadingAuth) return <LoadingSpinner />;
    if (!user) return <LoginPage />;

    // Exibe mensagem de erro de conexão se houver
    if (connectionError) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                    <div className="text-red-600 mb-4">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Erro de Conexão</h2>
                    <p className="text-gray-600 mb-6">{connectionError}</p>
                    <div className="space-y-3">
                        <button 
                            onClick={() => {
                                setConnectionError(null);
                                window.location.reload();
                            }}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                        >
                            Tentar Novamente
                        </button>
                        <button 
                            onClick={handleLogout}
                            className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
                        >
                            Fazer Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar 
                activePage={activePage} 
                setActivePage={setActivePage}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    onLogout={handleLogout} 
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                {/* Mensagens de loading states */}
                <div className="mx-4 md:mx-8 mt-4 space-y-2">
                    {Object.entries(loadingStates.states).map(([operation, state]) => (
                        <LoadingMessage
                            key={operation}
                            state={state.status}
                            message={state.message}
                        />
                    ))}
                </div>
                
                {/* Mensagem de status de operação (legacy) */}
                {operationStatus.message && (
                    <div className={`mx-4 md:mx-8 mt-4 p-3 rounded-md ${
                        operationStatus.type === 'success' 
                            ? 'bg-green-100 border border-green-400 text-green-700' 
                            : 'bg-red-100 border border-red-400 text-red-700'
                    }`}>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                {operationStatus.type === 'success' ? (
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium">{operationStatus.message}</p>
                            </div>
                            <div className="ml-auto pl-3">
                                <button
                                    onClick={() => setOperationStatus({ type: null, message: null })}
                                    className="inline-flex text-sm font-medium hover:opacity-75"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <UserAccessHelper allMembers={allMembers} allConnects={allConnects} />
                    {renderActivePage()}
                </main>
            </div>

            <Modal isOpen={isMemberModalOpen} onClose={closeMemberModal}>
                <MemberForm 
                    onClose={closeMemberModal} 
                    onSave={handleSaveMember} 
                    connects={allConnects} 
                    editingMember={editingMember} 
                    isAdmin={isAdmin} 
                    leaderConnects={visibleConnects} 
                    onCheckDuplicate={handleCheckDuplicate}
                />
            </Modal>
            <Modal isOpen={isConnectModalOpen} onClose={closeConnectModal}><ConnectForm onClose={closeConnectModal} onSave={handleSaveConnect} members={allMembers} editingConnect={editingConnect} /></Modal>
            <Modal isOpen={isCourseModalOpen} onClose={closeCourseModal} size="2xl">
                <CourseForm 
                    onClose={closeCourseModal} 
                    onSave={handleSaveCourse}
                    members={allMembers}
                    allCourseTemplates={allCourseTemplates}
                    editingCourse={editingCourse}
                />
            </Modal>
            <Modal isOpen={isCourseTemplateModalOpen} onClose={closeCourseTemplateModal} size="2xl">
                <CourseTemplateForm
                    onClose={closeCourseTemplateModal}
                    onSave={handleSaveCourseTemplate}
                    editingTemplate={editingCourseTemplate}
                />
            </Modal>
            {reportingConnect && <ConnectReportModal isOpen={isReportModalOpen} onClose={closeReportModal} connect={reportingConnect} members={allMembers} onSave={handleSaveConnectReport} isAdmin={isAdmin} />}
            {managingCourse && <ManageCourseModal course={managingCourse} members={allMembers} isOpen={isManageCourseModalOpen} onClose={closeManageCourseModal} onSaveStudents={handleSaveCourseStudents} onSaveAttendance={handleSaveAttendance} />}
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setConfirmModalOpen(false)} onConfirm={handleConfirmDelete} title="Confirmar Exclusão" message={deleteAction?.message} />
            {generatingReportForConnect && <ConnectFullReportModal isOpen={isConnectFullReportModalOpen} onClose={closeConnectFullReportModal} connect={generatingReportForConnect} allMembers={allMembers} allReports={allConnectReports} />}
            
            {viewingMember && <LeadershipTrackModal 
                isOpen={isLeadershipTrackModalOpen} 
                onClose={closeLeadershipTrackModal} 
                member={viewingMember} 
                allConnects={allConnects} 
                onSave={handleSaveMilestones} 
                isAdmin={isAdmin} 
                completedCourses={completedCourses}
                memberConnectHistoryDetails={memberConnectHistoryDetails}
            />}

            <DuplicateMemberModal
                isOpen={isDuplicateModalOpen}
                onClose={() => setDuplicateModalOpen(false)}
                existingMember={existingMemberForCheck}
                newMemberData={newMemberForCheck}
                onConfirm={handleConfirmDuplicate}
                onReject={handleRejectDuplicate}
            />
        </div>
    );
}