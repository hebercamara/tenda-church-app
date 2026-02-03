import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter, useNavigate, Routes, Route } from 'react-router-dom';
import damerau from 'damerau-levenshtein';
import { useAuthStore } from './store/authStore';
import { useMultipleLoadingStates } from './hooks/useLoadingState';
import LoadingMessage from './components/LoadingMessage';

// Firebase
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, doc, setDoc, getDocs, deleteDoc, updateDoc, query, writeBatch, where, getDoc, orderBy } from 'firebase/firestore';
import { db, auth, appId } from './firebaseConfig';

// Dados de exemplo para desenvolvimento
import {
    sampleMembers,
    sampleConnects,
    sampleCourses,
    sampleConnectReports,
    sampleCourseTemplates
} from './data/sampleData';

// Componentes
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import LoadingSpinner from './components/LoadingSpinner';
import AppRouter from './AppRouter';


import Modal from './components/Modal';
import ConfirmationModal from './components/ConfirmationModal';
import MemberForm from './components/MemberForm';
import ConnectForm from './components/ConnectForm';
import CourseForm from './components/CourseForm';
import CourseTemplateForm from './components/CourseTemplateForm';
import ManageCourseModal from './components/ManageCourseModal';
import ConnectReportModal from './components/ConnectReportModal';
import ConnectFullReportModal from './components/ConnectFullReportModal';
import IndividualTrackModal from './components/IndividualTrackModal';
import DuplicateMemberModal from './components/DuplicateMemberModal';
import ConnectTrackPage from './pages/ConnectTrackPage';
import MemberDetailsModal from './components/MemberDetailsModal';

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
    // Considerar somente dias válidos (não ignorados e não "sem aula")
    const consideredRecords = attendanceRecords.filter(r => !r.ignoreAttendance && !r.noClass);
    let presentCount = 0;
    consideredRecords.forEach(record => {
        if (record.statuses && (record.statuses[student.id] === 'presente' || record.statuses[student.id] === 'justificado')) {
            presentCount++;
        }
    });
    const attendancePercentage = consideredRecords.length > 0 ? Math.round((presentCount / consideredRecords.length) * 100) : 0;

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

function AppContent() {
    const { user, isAdmin, currentUserData, setAuthData, clearAuthData } = useAuthStore();
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const navigate = useNavigate();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [allMembers, setAllMembers] = useState(sampleMembers);
    const [allConnects, setAllConnects] = useState(sampleConnects);
    const [allCourses, setAllCourses] = useState(sampleCourses);
    const [allCourseTemplates, setAllCourseTemplates] = useState(sampleCourseTemplates);
    const [allConnectReports, setAllConnectReports] = useState(sampleConnectReports);
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
                isAdmin: false, // Será determinado quando os dados do membro forem carregados
                currentUserData: null // Será preenchido pelo próximo useEffect
            });
            setIsLoadingAuth(false);
        });
        return () => authUnsub();
    }, [setAuthData]);

    // CORRIGIDO: useEffect 2 - Para buscar todos os membros e encontrar o dado do usuário logado
    useEffect(() => {
        if (!user) {
            setAllMembers(sampleMembers); // Usa dados de exemplo se não houver usuário
            return;
        }
        const membersUnsub = onSnapshot(
            collection(db, `artifacts/${appId}/public/data/members`),
            (snapshot) => {
                const membersList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                // Se não há dados no Firebase, usa dados de exemplo
                const finalMembersList = membersList.length > 0 ? membersList : sampleMembers;
                setAllMembers(finalMembersList);

                // Encontra e atualiza os dados do usuário logado no store
                const memberData = finalMembersList.find(m => m.email?.toLowerCase() === user.email?.toLowerCase());

                // Determina se é admin: email fixo OU campo isAdmin do membro
                const userIsAdmin = user.email === ADMIN_EMAIL || (memberData?.isAdmin === true);

                setAuthData({ user, isAdmin: userIsAdmin, currentUserData: memberData || null });
            },
            (error) => {
                console.error('Erro ao carregar membros:', error);
                setConnectionError('Erro de conexão: Não foi possível carregar os dados dos membros. Usando dados de exemplo.');
                setAllMembers(sampleMembers); // Usa dados de exemplo em caso de erro
                // Em caso de erro, mantém apenas o admin principal
                const userIsAdmin = user.email === ADMIN_EMAIL;
                setAuthData({ user, isAdmin: userIsAdmin, currentUserData: null });
            }
        );
        return () => membersUnsub();
    }, [user, setAuthData]); // Depende do 'user' do store

    // CORRIGIDO: useEffect 3 - Para buscar os outros dados (Connects, Cursos, etc.)
    useEffect(() => {
        if (!user) {
            setLoadingData(false);
            // Mantém dados de exemplo se o usuário fizer logout
            setAllConnects(sampleConnects);
            setAllCourses(sampleCourses);
            setAllCourseTemplates(sampleCourseTemplates);
            setAllConnectReports(sampleConnectReports);
            return;
        }
        setLoadingData(true);
        const unsubs = [
            onSnapshot(
                collection(db, `artifacts/${appId}/public/data/connects`),
                (s) => {
                    const connectsList = s.docs.map(d => ({ id: d.id, ...d.data() }));
                    // Se não há dados no Firebase, usa dados de exemplo
                    const finalConnectsList = connectsList.length > 0 ? connectsList : sampleConnects;
                    setAllConnects(finalConnectsList);
                },
                (error) => {
                    console.error('Erro ao carregar connects:', error);
                    setConnectionError('Erro de conexão: Não foi possível carregar os dados dos connects. Usando dados de exemplo.');
                    setAllConnects(sampleConnects); // Usa dados de exemplo em caso de erro
                }
            ),
            onSnapshot(
                collection(db, `artifacts/${appId}/public/data/courses`),
                (s) => {
                    const coursesList = s.docs.map(d => ({ id: d.id, ...d.data() }));
                    const finalCoursesList = coursesList.length > 0 ? coursesList : sampleCourses;
                    setAllCourses(finalCoursesList);
                },
                (error) => {
                    console.error('Erro ao carregar cursos:', error);
                    setConnectionError('Erro de conexão: Não foi possível carregar os dados dos cursos. Usando dados de exemplo.');
                    setAllCourses(sampleCourses);
                }
            ),
            onSnapshot(
                collection(db, `artifacts/${appId}/public/data/courseTemplates`),
                (s) => {
                    const templatesList = s.docs.map(d => ({ id: d.id, ...d.data() }));
                    const finalTemplatesList = templatesList.length > 0 ? templatesList : sampleCourseTemplates;
                    setAllCourseTemplates(finalTemplatesList);
                },
                (error) => {
                    console.error('Erro ao carregar templates de curso:', error);
                    setConnectionError('Erro de conexão: Não foi possível carregar os templates de curso. Usando dados de exemplo.');
                    setAllCourseTemplates(sampleCourseTemplates);
                }
            ),
            onSnapshot(
                collection(db, `artifacts/${appId}/public/data/connect_reports`),
                (s) => {
                    const reportsList = s.docs.map(d => ({ id: d.id, ...d.data() }));
                    const finalReportsList = reportsList.length > 0 ? reportsList : sampleConnectReports;
                    setAllConnectReports(finalReportsList);
                },
                (error) => {
                    console.error('Erro ao carregar relatórios:', error);
                    setConnectionError('Erro de conexão: Não foi possível carregar os relatórios. Usando dados de exemplo.');
                    setAllConnectReports(sampleConnectReports);
                }
            )
        ];
        // Remove artificial delay for better performance
        setLoadingData(false);
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

        // Função para verificar se o usuário é professor substituto ativo
        const isActiveSubstitute = (course) => {
            if (!course.substituteTeacher || !course.substituteTeacher.teacherId) return false;

            const substituteTeacher = allMembers.find(m => m.id === course.substituteTeacher.teacherId);
            if (!substituteTeacher || substituteTeacher.email?.toLowerCase() !== userEmail) return false;

            const today = new Date();
            const startDate = new Date(course.substituteTeacher.startDate);

            // Se é indefinido, verifica apenas se já começou
            if (course.substituteTeacher.isIndefinite) {
                return today >= startDate;
            }

            // Se tem data de fim, verifica se está no período
            const endDate = new Date(course.substituteTeacher.endDate);
            return today >= startDate && today <= endDate;
        };

        const taughtCourses = allCourses.filter(c =>
            c.teacherEmail?.toLowerCase() === userEmail || isActiveSubstitute(c)
        );

        const auxConnects = allConnects.filter(c => {
            const isAux = (
                Array.isArray(c.auxLeaders) && c.auxLeaders.some(l => l.id === currentUserData?.id || (l.email || '').toLowerCase() === userEmail)
            ) || c.auxLeaderId === currentUserData?.id || (c.auxLeaderEmail || '').toLowerCase() === userEmail;
            return isAux;
        });

        const visibleConnectsSet = new Set([...supervisedConnects, ...ledConnects, ...auxConnects]);
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

        // Função para verificar se um membro estava em um Connect em uma data específica
        const wasMemberInConnectAtDate = (member, connectId, date) => {
            // Se o membro está atualmente no Connect
            if (member.connectId === connectId) {
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
                    if (entry.connectId !== connectId) return false;

                    const startDate = entry.startDate.toDate ? entry.startDate.toDate() : new Date(entry.startDate);
                    const endDate = entry.endDate ? (entry.endDate.toDate ? entry.endDate.toDate() : new Date(entry.endDate)) : null;

                    return date >= startDate && (!endDate || date <= endDate);
                });
            }

            return false;
        };

        const sortedReports = [...allConnectReports].sort((a, b) => {
            const dateA = a.reportDate.toDate ? a.reportDate.toDate() : new Date(a.reportDate);
            const dateB = b.reportDate.toDate ? b.reportDate.toDate() : new Date(b.reportDate);
            return dateB - dateA;
        });

        // Agrupa membros por Connect atual
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
                    const reportDate = report.reportDate.toDate ? report.reportDate.toDate() : new Date(report.reportDate);

                    // Verifica se o membro estava no Connect na data do relatório
                    if (wasMemberInConnectAtDate(member, connectId, reportDate)) {
                        const attendanceStatus = report.attendance?.[member.id];
                        if (attendanceStatus === 'ausente') {
                            consecutiveAbsences++;
                        } else {
                            break;
                        }
                    }
                }

                if (consecutiveAbsences >= 4) {
                    let totalConsecutiveAbsences = 0;
                    for (const report of reportsForConnect) {
                        const reportDate = report.reportDate.toDate ? report.reportDate.toDate() : new Date(report.reportDate);

                        // Verifica se o membro estava no Connect na data do relatório
                        if (wasMemberInConnectAtDate(member, connectId, reportDate)) {
                            const attendanceStatus = report.attendance?.[member.id];
                            if (attendanceStatus === 'ausente') {
                                totalConsecutiveAbsences++;
                            } else {
                                break;
                            }
                        }
                    }

                    // Obter nome conhecido do membro
                    const knownName = member.knownBy || member.name?.split(' ')[0] || member.name || 'Membro';

                    alerts.push({
                        memberId: member.id,
                        memberName: knownName,
                        memberPhone: member.phone, // Adicionado telefone do membro
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

    // Visualização de cadastro (somente leitura)
    const [isMemberDetailsOpen, setMemberDetailsOpen] = useState(false);
    const openMemberDetails = (member) => { if (!member) return; setViewingMember(member); setMemberDetailsOpen(true); };
    const closeMemberDetails = () => { setMemberDetailsOpen(false); setViewingMember(null); };


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

        // Navegar para a página do trilho de Connect
        navigate(`/connect-track/${connect.id}`);
    };
    const triggerDelete = (type, id) => {
        let message = "Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.";
        if (type === 'connect') {
            message = "Atenção! Excluir este Connect removerá a associação de todos os membros a ele. Deseja continuar?";
        }
        setDeleteAction({ type, id, message });
        setConfirmModalOpen(true);
    };

    const handleLogout = async () => { await signOut(auth); clearAuthData(); };

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

    // Função de retry para operações do Firestore com backoff exponencial e detecção de erro transitório
    const retryFirestoreOperation = async (
        operation,
        maxRetries = 5,
        baseDelayMs = 800,
    ) => {
        const isTransientError = (err) => {
            const code = err?.code;
            const msg = String(err?.message || '');
            // Erros comuns de rede/latência que valem retry
            const transientCodes = ['unavailable', 'deadline-exceeded', 'aborted'];
            const transientMsgPattern = /(ERR_HTTP2_PROTOCOL_ERROR|Failed to load resource|network|quota|timeout)/i;
            return transientCodes.includes(code) || transientMsgPattern.test(msg);
        };

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Tentativa ${attempt}/${maxRetries} da operação Firestore`);
                return await operation();
            } catch (error) {
                const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
                console.error(`❌ Erro na tentativa ${attempt}:`, error);

                // Se for erro permanente (não transitório) ou está offline, não insiste
                if (!isTransientError(error) || !online) {
                    console.warn('⛔ Erro não transitório ou offline detectado. Interrompendo retries.');
                    throw error;
                }

                if (attempt === maxRetries) {
                    throw error;
                }

                // Backoff exponencial com jitter
                const jitter = Math.floor(Math.random() * 400);
                const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
                console.log(`⏳ Aguardando ${delayMs}ms antes da nova tentativa...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    };

    // Definir (adicionar) Líder Auxiliar para um Connect (suporta múltiplos auxiliares)
    const handleSetAuxLeader = async (connect, memberId) => {
        try {
            const userEmail = (currentUserData?.email || '').toLowerCase();
            const canSet = isAdmin ||
                connect.leaderId === currentUserData?.id || (connect.leaderEmail || '').toLowerCase() === userEmail ||
                (connect.supervisorEmail || '').toLowerCase() === userEmail;
            if (!canSet) {
                setOperationStatus({ type: 'error', message: 'Você não tem permissão para definir Líder Auxiliar deste Connect.' });
                return;
            }

            const auxMember = allMembers.find(m => m.id === memberId);
            if (!auxMember || !auxMember.email) {
                setOperationStatus({ type: 'error', message: 'Seleção inválida. O membro precisa ter e-mail cadastrado.' });
                return;
            }

            // Preparar lista atual de auxiliares (compatível com documentos legados)
            const existingAux = Array.isArray(connect.auxLeaders) ? connect.auxLeaders : [];
            const alreadyAux = existingAux.some(l => l.id === auxMember.id || (l.email || '').toLowerCase() === (auxMember.email || '').toLowerCase());
            if (alreadyAux) {
                setOperationStatus({ type: 'error', message: 'Este membro já é Líder Auxiliar neste Connect.' });
                return;
            }

            const updatedAux = [...existingAux, { id: auxMember.id, email: auxMember.email, name: auxMember.name }];

            loadingStates.setLoading('saveConnect', 'Definindo Líder Auxiliar...');
            await retryFirestoreOperation(async () => {
                const ref = doc(db, `artifacts/${appId}/public/data/connects`, connect.id);
                await updateDoc(ref, {
                    // Novo modelo com múltiplos auxiliares
                    auxLeaders: updatedAux,
                    // Manter campos legados se ainda não definidos (compatibilidade)
                    auxLeaderId: connect.auxLeaderId || (updatedAux[0]?.id || ''),
                    auxLeaderEmail: connect.auxLeaderEmail || (updatedAux[0]?.email || ''),
                    auxLeaderName: connect.auxLeaderName || (updatedAux[0]?.name || ''),
                });
            });

            loadingStates.setSuccess('saveConnect', 'Líder Auxiliar adicionado com sucesso!');
        } catch (error) {
            console.error('Erro ao definir Líder Auxiliar:', error);
            loadingStates.setError('saveConnect', 'Erro ao definir Líder Auxiliar.');
        }
    };

    // Remover Líder Auxiliar de um Connect
    const handleRemoveAuxLeader = async (connect, memberId) => {
        try {
            const userEmail = (currentUserData?.email || '').toLowerCase();
            const canSet = isAdmin ||
                connect.leaderId === currentUserData?.id || (connect.leaderEmail || '').toLowerCase() === userEmail ||
                (connect.supervisorEmail || '').toLowerCase() === userEmail;
            if (!canSet) {
                setOperationStatus({ type: 'error', message: 'Você não tem permissão para remover Líder Auxiliar deste Connect.' });
                return;
            }

            const existingAux = Array.isArray(connect.auxLeaders) ? connect.auxLeaders : [];
            const newAux = existingAux.filter(l => l.id !== memberId);

            loadingStates.setLoading('saveConnect', 'Removendo Líder Auxiliar...');
            await retryFirestoreOperation(async () => {
                const ref = doc(db, `artifacts/${appId}/public/data/connects`, connect.id);
                const legacyUpdate = {};
                // Atualizar campos legados se o removido era o auxiliar legado
                if (connect.auxLeaderId === memberId) {
                    legacyUpdate.auxLeaderId = newAux[0]?.id || '';
                    legacyUpdate.auxLeaderEmail = newAux[0]?.email || '';
                    legacyUpdate.auxLeaderName = newAux[0]?.name || '';
                }
                await updateDoc(ref, {
                    auxLeaders: newAux,
                    ...legacyUpdate,
                });
            });

            loadingStates.setSuccess('saveConnect', 'Líder Auxiliar removido com sucesso!');
        } catch (error) {
            console.error('Erro ao remover Líder Auxiliar:', error);
            loadingStates.setError('saveConnect', 'Erro ao remover Líder Auxiliar.');
        }
    };

    // Definir Auxiliar de Professor para uma Turma (somente Admin, Professor ou Substituto Ativo da Turma)
    const handleSetAuxTeacher = async (course, memberId) => {
        try {
            const userEmail = (currentUserData?.email || '').toLowerCase();
            const isSubActive = () => {
                try {
                    if (!course?.substituteTeacher?.teacherId || !Array.isArray(allMembers) || !userEmail) return false;
                    const substituteTeacher = allMembers.find(m => m.id === course.substituteTeacher.teacherId);
                    if (!substituteTeacher || (substituteTeacher.email || '').toLowerCase() !== userEmail) return false;
                    const today = new Date();
                    const startDate = new Date(course.substituteTeacher.startDate);
                    if (course.substituteTeacher.isIndefinite) return today >= startDate;
                    const endDate = new Date(course.substituteTeacher.endDate);
                    return today >= startDate && today <= endDate;
                } catch {
                    return false;
                }
            };
            const canSet = isAdmin || ((course.teacherEmail || '').toLowerCase() === userEmail) || isSubActive();
            if (!canSet) {
                setOperationStatus({ type: 'error', message: 'Você não tem permissão para definir Auxiliar nesta turma.' });
                return;
            }

            const auxMember = allMembers.find(m => m.id === memberId);
            if (!auxMember || !auxMember.email) {
                setOperationStatus({ type: 'error', message: 'Seleção inválida. O auxiliar precisa ter e-mail cadastrado.' });
                return;
            }

            // O auxiliar deve ser um aluno matriculado nesta turma
            const isEnrolled = Array.isArray(course?.students) && course.students.some(s => s.id === auxMember.id);
            if (!isEnrolled) {
                setOperationStatus({ type: 'error', message: 'O auxiliar deve ser um aluno matriculado nesta turma.' });
                return;
            }

            loadingStates.setLoading('saveCourse', 'Definindo Auxiliar de Professor...');
            await retryFirestoreOperation(async () => {
                const ref = doc(db, `artifacts/${appId}/public/data/courses`, course.id);
                await updateDoc(ref, {
                    auxTeacherId: auxMember.id,
                    auxTeacherEmail: auxMember.email,
                    auxTeacherName: auxMember.name,
                });
            });

            loadingStates.setSuccess('saveCourse', 'Auxiliar de Professor definido com sucesso!');
        } catch (error) {
            console.error('Erro ao definir Auxiliar de Professor:', error);
            loadingStates.setError('saveCourse', 'Erro ao definir Auxiliar de Professor.');
        }
    };

    const handleSaveConnect = async (connectData) => {
        const collectionPath = `artifacts/${appId}/public/data/connects`;

        console.log('🔄 Iniciando salvamento do Connect:', connectData);
        loadingStates.setLoading('saveConnect', 'Salvando connect...');

        try {
            let connectId = editingConnect?.id;
            console.log('📝 Connect ID:', connectId, 'Editando:', !!editingConnect);

            // Validações básicas
            if (!connectData.leaderId) {
                throw new Error('Líder é obrigatório');
            }

            const leader = allMembers.find(m => m.id === connectData.leaderId);
            if (!leader) {
                throw new Error('Líder selecionado não encontrado');
            }

            console.log('👤 Líder encontrado:', leader.name);

            // Buscar membros atuais do Connect (se editando)
            let currentMemberIds = [];
            if (editingConnect) {
                currentMemberIds = allMembers
                    .filter(m => m.connectId === editingConnect.id)
                    .map(m => m.id);
                console.log('👥 Membros atuais do Connect:', currentMemberIds.length);
            }

            // Salvar o Connect
            console.log('💾 Salvando dados do Connect...');
            if (editingConnect) {
                await retryFirestoreOperation(async () => {
                    await setDoc(doc(db, collectionPath, connectId), connectData);
                });
                console.log('✅ Connect atualizado com sucesso');
            } else {
                // Verificar se já existe um Connect com este número
                console.log('🔍 Verificando duplicação de número...');
                const querySnapshot = await retryFirestoreOperation(async () => {
                    const q = query(collection(db, collectionPath), where("number", "==", connectData.number));
                    return await getDocs(q);
                });

                if (!querySnapshot.empty) {
                    console.log('❌ Connect com número duplicado encontrado');
                    loadingStates.setError('saveConnect', 'Já existe um Connect com este número.');
                    return;
                }
                console.log('✅ Número do Connect disponível');

                const newDocRef = await retryFirestoreOperation(async () => {
                    return await addDoc(collection(db, collectionPath), connectData);
                });
                connectId = newDocRef.id;
                console.log('✅ Novo Connect criado com ID:', connectId);
            }

            // Usar batch para sincronizar membros
            console.log('🔄 Iniciando sincronização de membros...');
            const batch = writeBatch(db);

            // Remover connectId dos membros que não estão mais no Connect
            const membersToRemove = currentMemberIds.filter(id => !connectData.memberIds.includes(id));
            const today = new Date();

            console.log('➖ Membros a remover:', membersToRemove.length);
            membersToRemove.forEach(memberId => {
                const member = allMembers.find(m => m.id === memberId);
                if (member) {
                    console.log('🔄 Removendo membro:', member.name);
                    const history = member.connectHistory || [];
                    const lastEntry = history.find(entry => !entry.endDate);

                    if (lastEntry) {
                        lastEntry.endDate = today;
                    }

                    const memberRef = doc(db, `artifacts/${appId}/public/data/members`, memberId);
                    batch.update(memberRef, {
                        connectId: '',
                        connectHistory: history
                    });
                }
            });

            // Adicionar connectId aos novos membros do Connect
            const membersToAdd = connectData.memberIds.filter(id => !currentMemberIds.includes(id));
            console.log('➕ Membros a adicionar:', membersToAdd.length);

            membersToAdd.forEach(memberId => {
                const member = allMembers.find(m => m.id === memberId);
                if (member) {
                    console.log('🔄 Adicionando membro:', member.name);
                    const history = member.connectHistory || [];
                    const lastEntry = history.find(entry => !entry.endDate);

                    // Finalizar entrada anterior se existir
                    if (lastEntry) {
                        lastEntry.endDate = today;
                    }

                    // Adicionar nova entrada
                    history.push({
                        connectId: connectId,
                        startDate: today,
                        endDate: null
                    });

                    const memberRef = doc(db, `artifacts/${appId}/public/data/members`, memberId);
                    batch.update(memberRef, {
                        connectId: connectId,
                        connectHistory: history
                    });
                }
            });

            // Garantir que o líder tenha o connectId correto
            console.log('👤 Atualizando Connect do líder...');
            const leaderRef = doc(db, `artifacts/${appId}/public/data/members`, connectData.leaderId);
            batch.update(leaderRef, { connectId: connectId });

            // Executar todas as atualizações em lote
            console.log('💾 Executando batch de atualizações...');
            await retryFirestoreOperation(async () => {
                await batch.commit();
            });
            console.log('✅ Batch executado com sucesso');

            loadingStates.setSuccess('saveConnect', 'Connect salvo com sucesso!');
            closeConnectModal();
        } catch (error) {
            console.error("❌ Erro ao salvar connect:", error);
            console.error("📊 Stack trace:", error.stack);
            loadingStates.setError('saveConnect', `Erro ao salvar connect: ${error.message}`);
        }
    };
    const generateAttendanceRecords = async (courseId, courseData) => {
        const batch = writeBatch(db);
        const weekDaysMap = { "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3, "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6 };
        const targetDay = weekDaysMap[courseData.classDay];
        const activityPlanCsv = Array.isArray(courseData?.assessment?.activities?.plan) ? courseData.assessment.activities.plan : [];
        const lessonPlan = Array.isArray(courseData?.lessonPlan) ? courseData.lessonPlan : [];
        const hasLessonPlan = (courseData?.lessonsCount || 0) > 0 && lessonPlan.length > 0;
        let sessionNumber = 0;
        let currentDate = new Date(courseData.startDate + 'T00:00:00');

        const createRecordForDate = (theDate) => {
            sessionNumber += 1;
            const dateString = theDate.toISOString().split('T')[0];
            const attendanceRef = doc(db, `artifacts/${appId}/public/data/courses/${courseId}/attendance/${dateString}`);
            const initialStatuses = (courseData.students || []).reduce((acc, student) => { acc[student.id] = 'pendente'; return acc; }, {});
            const record = { date: theDate, statuses: initialStatuses, sessionNumber };

            if (hasLessonPlan) {
                const planEntry = lessonPlan[sessionNumber - 1] || {};
                if (planEntry.activityIndex) record.activityIndex = planEntry.activityIndex; // 1-base
                if (planEntry.testIndex) record.testIndex = planEntry.testIndex; // 1-base
                if (planEntry.assignmentIndex) record.assignmentIndex = planEntry.assignmentIndex; // 1-base
                if (planEntry.notes) record.notes = planEntry.notes;
                if (planEntry.considerAttendance === false) record.ignoreAttendance = true;
            } else if (activityPlanCsv.length > 0) {
                const position = activityPlanCsv.indexOf(sessionNumber);
                if (position >= 0) {
                    // activityIndex é 1-base: A1 na primeira ocorrência do plano, A2 na segunda, etc.
                    record.activityIndex = position + 1;
                }
            }

            batch.set(attendanceRef, record);
        };

        const lessonsCount = Number(courseData?.lessonsCount) || 0;
        if (lessonsCount > 0) {
            let generated = 0;
            while (generated < lessonsCount) {
                if (currentDate.getUTCDay() === targetDay) {
                    createRecordForDate(currentDate);
                    generated += 1;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        } else {
            const endDate = new Date(courseData.endDate + 'T00:00:00');
            while (currentDate <= endDate) {
                if (currentDate.getUTCDay() === targetDay) {
                    createRecordForDate(currentDate);
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        await batch.commit();
    };
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
    const handleSaveCourseStudents = async (courseId, students) => {
        try {
            const course = allCourses.find(c => c.id === courseId);
            const userEmail = currentUserData?.email?.toLowerCase?.();
            const isSubActive = () => {
                try {
                    if (!course?.substituteTeacher?.teacherId || !Array.isArray(allMembers) || !userEmail) return false;
                    const substituteTeacher = allMembers.find(m => m.id === course.substituteTeacher.teacherId);
                    if (!substituteTeacher || substituteTeacher.email?.toLowerCase() !== userEmail) return false;
                    const today = new Date();
                    const startDate = new Date(course.substituteTeacher.startDate);
                    if (course.substituteTeacher.isIndefinite) return today >= startDate;
                    const endDate = new Date(course.substituteTeacher.endDate);
                    return today >= startDate && today <= endDate;
                } catch {
                    return false;
                }
            };
            const allowed = isAdmin || (course && userEmail && (course.teacherEmail?.toLowerCase() === userEmail || isSubActive()));
            if (!allowed) {
                alert('Você não tem permissão para alterar a lista de alunos desta turma.');
                return;
            }
            const courseRef = doc(db, `artifacts/${appId}/public/data/courses/${courseId}`);
            await updateDoc(courseRef, { students: students });
        } catch (error) {
            console.error("Erro ao salvar alunos do curso:", error);
        }
    };
    const handleSaveAttendance = async (courseId, dateId, statuses, metaOrActivityIndex) => {
        try {
            const course = allCourses.find(c => c.id === courseId);
            const userEmail = currentUserData?.email?.toLowerCase?.();
            const isSubActive = () => {
                try {
                    if (!course?.substituteTeacher?.teacherId || !Array.isArray(allMembers) || !userEmail) return false;
                    const substituteTeacher = allMembers.find(m => m.id === course.substituteTeacher.teacherId);
                    if (!substituteTeacher || substituteTeacher.email?.toLowerCase() !== userEmail) return false;
                    const today = new Date();
                    const startDate = new Date(course.substituteTeacher.startDate);
                    if (course.substituteTeacher.isIndefinite) return today >= startDate;
                    const endDate = new Date(course.substituteTeacher.endDate);
                    return today >= startDate && today <= endDate;
                } catch {
                    return false;
                }
            };
            const isAuxTeacher = () => {
                try {
                    const byEmail = (course?.auxTeacherEmail || '').toLowerCase() === (userEmail || '');
                    const byId = course?.auxTeacherId && currentUserData?.id && course.auxTeacherId === currentUserData.id;
                    return !!(byEmail || byId);
                } catch {
                    return false;
                }
            };
            const allowed = isAdmin || (course && userEmail && (course.teacherEmail?.toLowerCase() === userEmail || isSubActive() || isAuxTeacher()));
            if (!allowed) {
                alert('Você não tem permissão para registrar presença/notas nesta turma.');
                return;
            }
            const attendanceRef = doc(db, `artifacts/${appId}/public/data/courses/${courseId}/attendance/${dateId}`);
            const payload = {};
            if (statuses) payload.statuses = statuses;
            if (typeof metaOrActivityIndex !== 'undefined') {
                if (typeof metaOrActivityIndex === 'object' && metaOrActivityIndex !== null) {
                    const { activityIndex, ignoreAttendance, noClass, sessionNumber } = metaOrActivityIndex;
                    if (typeof activityIndex !== 'undefined') payload.activityIndex = activityIndex;
                    if (typeof ignoreAttendance !== 'undefined') payload.ignoreAttendance = !!ignoreAttendance;
                    if (typeof noClass !== 'undefined') payload.noClass = !!noClass;
                    if (typeof sessionNumber !== 'undefined') payload.sessionNumber = sessionNumber;
                } else {
                    payload.activityIndex = metaOrActivityIndex;
                }
            }
            await updateDoc(attendanceRef, payload);
        } catch (error) {
            console.error("Erro ao salvar presença:", error);
        }
    };
    const handleSkipClassDay = async (courseId, dateId) => {
        try {
            const course = allCourses.find(c => c.id === courseId);
            const userEmail = currentUserData?.email?.toLowerCase?.();
            const isSubActive = () => {
                try {
                    if (!course?.substituteTeacher?.teacherId || !Array.isArray(allMembers) || !userEmail) return false;
                    const substituteTeacher = allMembers.find(m => m.id === course.substituteTeacher.teacherId);
                    if (!substituteTeacher || substituteTeacher.email?.toLowerCase() !== userEmail) return false;
                    const today = new Date();
                    const startDate = new Date(course.substituteTeacher.startDate);
                    if (course.substituteTeacher.isIndefinite) return today >= startDate;
                    const endDate = new Date(course.substituteTeacher.endDate);
                    return today >= startDate && today <= endDate;
                } catch { return false; }
            };
            const allowed = isAdmin || (course && userEmail && (course.teacherEmail?.toLowerCase() === userEmail || isSubActive()));
            if (!allowed) { alert('Você não tem permissão para alterar o calendário desta turma.'); return; }

            const attendanceColl = collection(db, `artifacts/${appId}/public/data/courses/${courseId}/attendance`);
            const snapshot = await getDocs(query(attendanceColl, orderBy('date', 'asc')));
            const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const targetIndex = records.findIndex(r => r.id === dateId);
            if (targetIndex < 0) return;

            // Marcar o dia como 'sem aula' e remover o número de sessão
            const batch = writeBatch(db);
            const targetRef = doc(db, `artifacts/${appId}/public/data/courses/${courseId}/attendance/${dateId}`);
            batch.update(targetRef, { noClass: true, sessionNumber: null });

            // Reatribuir números de sessão para os dias seguintes
            for (let i = targetIndex + 1; i < records.length; i++) {
                const rec = records[i];
                if (typeof rec.sessionNumber === 'number') {
                    const ref = doc(db, `artifacts/${appId}/public/data/courses/${courseId}/attendance/${rec.id}`);
                    batch.update(ref, { sessionNumber: rec.sessionNumber - 1 });
                }
            }

            // Adicionar uma semana ao calendário: criar novo registro após o último
            const last = records[records.length - 1];
            const lastDate = new Date(last.date.seconds ? last.date.seconds * 1000 : last.date);
            const nextDate = new Date(lastDate);
            nextDate.setDate(nextDate.getDate() + 7);
            const dateString = nextDate.toISOString().split('T')[0];
            const newRef = doc(db, `artifacts/${appId}/public/data/courses/${courseId}/attendance/${dateString}`);
            const initialStatuses = (course.students || []).reduce((acc, student) => { acc[student.id] = 'pendente'; return acc; }, {});

            // Próxima sessão é a maior sessão atual + 1
            const maxSession = records.reduce((m, r) => typeof r.sessionNumber === 'number' ? Math.max(m, r.sessionNumber) : m, 0);
            const nextSessionNumber = maxSession + 1;
            const record = { date: nextDate, statuses: initialStatuses, sessionNumber: nextSessionNumber };

            const lessonPlan = Array.isArray(course?.lessonPlan) ? course.lessonPlan : [];
            if ((course?.lessonsCount || 0) > 0 && lessonPlan.length > 0) {
                const planEntry = lessonPlan[nextSessionNumber - 1] || {};
                if (planEntry.activityIndex) record.activityIndex = planEntry.activityIndex;
                if (planEntry.testIndex) record.testIndex = planEntry.testIndex;
                if (planEntry.assignmentIndex) record.assignmentIndex = planEntry.assignmentIndex;
                if (planEntry.notes) record.notes = planEntry.notes;
                if (planEntry.considerAttendance === false) record.ignoreAttendance = true;
            }
            batch.set(newRef, record);

            await batch.commit();
        } catch (error) {
            console.error('Erro ao pular dia de aula:', error);
            alert('Não foi possível pular o dia de aula.');
        }
    };
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
    const handleSaveMilestones = async (memberId, milestones, leadershipCourses) => {
        if (!memberId) throw new Error("ID do membro não fornecido.");
        const memberRef = doc(db, `artifacts/${appId}/public/data/members`, memberId);
        const milestonesToSave = { ...milestones };
        Object.keys(milestonesToSave).forEach(key => {
            milestonesToSave[key].completed = !!milestonesToSave[key].date;
        });

        const updateData = { milestones: milestonesToSave };
        if (leadershipCourses) {
            updateData.leadershipCourses = leadershipCourses;
        }

        await updateDoc(memberRef, updateData);
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



    if (isLoadingAuth) return <LoadingSpinner />;
    if (!user) {
        // Rotas públicas: Login (default) e Signup
        return (
            <Routes>
                <Route path="/signup" element={<SignupPage />} />
                <Route path="*" element={<LoginPage />} />
            </Routes>
        );
    }

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
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                allConnects={allConnects}
                allCourses={allCourses}
                allMembers={allMembers}
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
                    <div className={`mx-4 md:mx-8 mt-4 p-3 rounded-md ${operationStatus.type === 'success'
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
                    <AppRouter
                        // Props para dados
                        allMembers={allMembers}
                        allConnects={allConnects}
                        allCourses={allCourses}
                        allCourseTemplates={allCourseTemplates}
                        allConnectReports={allConnectReports}
                        visibleMembers={visibleMembers}
                        visibleConnects={visibleConnects}
                        visibleCourses={visibleCourses}
                        visibleReports={visibleReports}
                        attendanceAlerts={attendanceAlerts}
                        membersWithCourses={membersWithCourses}
                        completedCourses={completedCourses}
                        memberConnectHistoryDetails={memberConnectHistoryDetails}
                        loadingStates={loadingStates}
                        operationStatus={operationStatus}
                        setOperationStatus={setOperationStatus}

                        // Handlers para modais
                        handleAddMember={openMemberModal}
                        handleEditMember={openMemberModal}
                        handleDeleteMember={triggerDelete}
                        handleReactivateMember={handleReactivateMember}
                        handleAddConnect={openConnectModal}
                        handleEditConnect={openConnectModal}
                        handleDeleteConnect={triggerDelete}
                        handleAddCourse={openCourseModal}
                        handleEditCourse={openCourseModal}
                        handleDeleteCourse={triggerDelete}
                        handleManageCourse={openManageCourseModal}
                        handleAddCourseTemplate={openCourseTemplateModal}
                        handleEditCourseTemplate={openCourseTemplateModal}
                        handleDeleteCourseTemplate={triggerDelete}
                        handleGenerateReport={openReportModal}
                        handleGenerateFullReport={openConnectFullReportModal}
                        handleViewMember={openLeadershipTrackModal}
                        handleViewConnectTrack={openConnectTrackPage}
                        handleLeadershipTrack={openLeadershipTrackModal}
                        handleSetAuxLeader={handleSetAuxLeader}
                        handleRemoveAuxLeader={handleRemoveAuxLeader}
                        handleSetAuxTeacher={handleSetAuxTeacher}
                        handleFinalizeCourse={handleFinalizeCourse}
                        handleReopenCourse={handleReopenCourse}

                        // Funções de utilidade
                        calculateFinalGradeForStudent={calculateFinalGradeForStudent}
                        getStudentStatusInfo={getStudentStatusInfo}
                        areNamesSimilar={areNamesSimilar}
                        getConnectName={getConnectName}
                    />
                </main>
            </div>

            <Modal isOpen={isMemberModalOpen} onClose={closeMemberModal} size="2xl" title={editingMember ? 'Editar Membro' : 'Novo Membro'}>
                <MemberForm
                    onClose={closeMemberModal}
                    onSave={handleSaveMember}
                    connects={allConnects}
                    editingMember={editingMember}
                    isAdmin={isAdmin}
                    leaderConnects={visibleConnects}
                    onCheckDuplicate={handleCheckDuplicate}
                    onOpenLeadershipTrack={openLeadershipTrackModal}
                />
            </Modal>
            <Modal
                isOpen={isConnectModalOpen}
                onClose={closeConnectModal}
                title={editingConnect ? 'Editar Connect' : 'Novo Connect'}
            >
                <ConnectForm
                    onClose={closeConnectModal}
                    onSave={handleSaveConnect}
                    members={allMembers}
                    editingConnect={editingConnect}
                    connects={allConnects}
                />
            </Modal>
            <Modal isOpen={isCourseModalOpen} onClose={closeCourseModal} size="2xl" title={editingCourse ? 'Editar Turma' : 'Nova Turma'}>
                <CourseForm
                    onClose={closeCourseModal}
                    onSave={handleSaveCourse}
                    members={allMembers}
                    allCourseTemplates={allCourseTemplates}
                    editingCourse={editingCourse}
                />
            </Modal>
            <Modal isOpen={isCourseTemplateModalOpen} onClose={closeCourseTemplateModal} size="2xl" title={editingCourseTemplate ? 'Editar Modelo de Curso' : 'Novo Modelo de Curso'}>
                <CourseTemplateForm
                    onClose={closeCourseTemplateModal}
                    onSave={handleSaveCourseTemplate}
                    editingTemplate={editingCourseTemplate}
                />
            </Modal>
            {reportingConnect && <ConnectReportModal isOpen={isReportModalOpen} onClose={closeReportModal} connect={reportingConnect} members={allMembers} onSave={handleSaveConnectReport} isAdmin={isAdmin} onViewMember={openMemberDetails} />}
            {managingCourse && <ManageCourseModal course={managingCourse} members={allMembers} isOpen={isManageCourseModalOpen} onClose={closeManageCourseModal} onSaveStudents={handleSaveCourseStudents} onSaveAttendance={handleSaveAttendance} onSkipClassDay={handleSkipClassDay} onViewMember={openMemberDetails} />}
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setConfirmModalOpen(false)} onConfirm={handleConfirmDelete} title="Confirmar Exclusão" message={deleteAction?.message} />
            {generatingReportForConnect && <ConnectFullReportModal isOpen={isConnectFullReportModalOpen} onClose={closeConnectFullReportModal} connect={generatingReportForConnect} allMembers={allMembers} allReports={allConnectReports} />}

            {viewingMember && <Modal isOpen={isLeadershipTrackModalOpen} onClose={closeLeadershipTrackModal} size="md" title="Trilho de Liderança">
                <IndividualTrackModal
                    member={viewingMember}
                    completedCourses={completedCourses}
                    memberConnectHistoryDetails={memberConnectHistoryDetails}
                    onBack={closeLeadershipTrackModal}
                />
            </Modal>}

            {viewingMember && <Modal isOpen={isMemberDetailsOpen} onClose={closeMemberDetails} size="md" title="Cadastro do Membro">
                <MemberDetailsModal member={viewingMember} allConnects={allConnects} allMembers={allMembers} />
            </Modal>}



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

export default function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}
