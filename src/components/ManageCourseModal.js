import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
// eslint-disable-next-line no-unused-vars
import { db, appId } from '../firebaseConfig';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import PersonAutocomplete from './PersonAutocomplete';
import BatchSimpleMemberModal from './BatchSimpleMemberModal';
import { Check, Trash2, ChevronLeft, ChevronRight, X, Users, Table } from 'lucide-react';
import { formatDateToBrazilian, formatDateToAbbreviated } from '../utils/dateUtils';

const ManageCourseModal = ({ course, members, allMembers, allSimpleMembers, onSaveSimpleMember, areNamesSimilar, isOpen, onClose, onSaveStudents, onSaveAttendance, onSkipClassDay, onViewMember }) => {
    const { isAdmin, currentUserData } = useAuthStore();
    const navigate = useNavigate();

    const userEmail = (currentUserData?.email || '').toLowerCase();
    const isMainTeacherOrSubOrAdmin = isAdmin || (currentUserData && (
        course.teacherEmail?.toLowerCase() === userEmail ||
        (course.substituteTeacher && (
            course.substituteTeacher.teacherId === currentUserData.id ||
            (Array.isArray(members) && members.find(m => m && m.id === course.substituteTeacher.teacherId)?.email?.toLowerCase() === userEmail)
        ) && (() => {
            const today = new Date();
            const start = new Date(course.substituteTeacher.startDate);
            if (course.substituteTeacher.isIndefinite) return today >= start;
            const end = new Date(course.substituteTeacher.endDate);
            return today >= start && today <= end;
        })())
    ));

    // Identifica se o usuário é auxiliar de algum grupo e quais alunos pertencem a ele
    const myGroupStudentsIds = useMemo(() => {
        if (isMainTeacherOrSubOrAdmin) return null;
        if (!Array.isArray(course.groups)) return [];
        const myGroups = course.groups.filter(g => 
            g && (g.assistantId === currentUserData?.id || 
            (g.assistantEmail || '').toLowerCase() === userEmail)
        );
        const ids = new Set();
        myGroups.forEach(g => {
            if (g && Array.isArray(g.studentIds)) {
                g.studentIds.forEach(id => { if (id) ids.add(id); });
            }
        });
        return Array.from(ids);
    }, [course.groups, currentUserData, userEmail, isMainTeacherOrSubOrAdmin]);

    const [activeTab, setActiveTab] = useState('attendance');
    const [selectedMemberToEnroll, setSelectedMemberToEnroll] = useState('');

    // Estados locais para rascunho (draft)
    const [draftEnrolledStudents, setDraftEnrolledStudents] = useState([]);
    const [isBatchModalOpen, setBatchModalOpen] = useState(false);

    const handleEnrollMultiple = (studentIds) => {
        setDraftEnrolledStudents(prev => {
            const updated = [...prev];
            studentIds.forEach(id => {
                if (!updated.some(s => s && s.id === id)) {
                    // Procura o membro na lista atualizada de membros
                    const student = Array.isArray(members) ? members.find(m => m && m.id === id) : null;
                    const name = student ? student.name : 'Novo Aluno';
                    updated.push({
                        id: id,
                        name: name,
                        scores: { tests: [], activities: [], assignments: [] }
                    });
                }
            });
            return updated;
        });
        setHasUnsavedChanges(true);
    };

    const visibleStudentsInModal = useMemo(() => {
        const cleanList = (draftEnrolledStudents || []).filter(s => s && s.id);
        if (myGroupStudentsIds === null) {
            return cleanList;
        }
        return cleanList.filter(s => myGroupStudentsIds.includes(s.id));
    }, [draftEnrolledStudents, myGroupStudentsIds]);

    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Estados para navegação das datas
    const [currentDateIndex, setCurrentDateIndex] = useState(0);
    const [visibleDatesCount, setVisibleDatesCount] = useState(3);

    // Função para obter o nome conhecido do professor
    const getTeacherKnownName = () => {
        const teacher = Array.isArray(members) ? members.find(m => m && m.id === course.teacherId) : null;
        if (!teacher) return course.teacherName || 'Professor não encontrado';

        // Se knownBy estiver vazio, usa o primeiro nome
        return teacher.knownBy || teacher.name?.split(' ')[0] || teacher.name || 'Professor';
    };

    // Função para verificar se há professor substituto ativo
    const getActiveSubstitute = () => {
        if (!course.substituteTeacher || !course.substituteTeacher.teacherId) return null;

        const today = new Date();
        const startDate = new Date(course.substituteTeacher.startDate);

        // Verificar se está no período ativo
        let isActive = false;
        if (course.substituteTeacher.isIndefinite) {
            isActive = today >= startDate;
        } else {
            const endDate = new Date(course.substituteTeacher.endDate);
            isActive = today >= startDate && today <= endDate;
        }

        if (!isActive) return null;

        const substituteTeacher = Array.isArray(members) ? members.find(m => m && m.id === course.substituteTeacher.teacherId) : null;
        return {
            ...course.substituteTeacher,
            teacherName: substituteTeacher?.knownBy || substituteTeacher?.name?.split(' ')[0] || substituteTeacher?.name || 'Professor Substituto'
        };
    };

    // Pré-computa um mapa { studentId -> displayName } — usa apenas o nome real,
    // sem knownBy. Mostra primeiro nome; adiciona sobrenome quando há duplicata de primeiro nome.
    const studentDisplayNames = useMemo(() => {
        const allStudents = (draftEnrolledStudents || []).filter(s => s && s.id);

        // Passo 1: extrair primeiro nome e último sobrenome de cada aluno
        const nameData = allStudents.map(s => {
            const member = Array.isArray(members) ? members.find(m => m && m.id === s.id) : null;
            const fullName = member ? (member.name || '') : (s.name || '');
            const parts = fullName.trim().split(/\s+/);
            const firstName = parts[0] || 'Aluno';
            const lastName = member
                ? (parts.length > 1 ? parts[parts.length - 1] : '')
                : (s.lastName || (parts.length > 1 ? parts[parts.length - 1] : ''));
            return { id: s.id, firstName, lastName };
        });

        // Passo 2: detectar primeiros nomes duplicados
        const firstNameCounts = {};
        nameData.forEach(({ firstName }) => {
            firstNameCounts[firstName] = (firstNameCounts[firstName] || 0) + 1;
        });

        // Passo 3: quem tem primeiro nome duplicado recebe "PrimeiroNome Sobrenome"
        const nameMap = {};
        nameData.forEach(({ id, firstName, lastName }) => {
            if (firstNameCounts[firstName] > 1 && lastName && lastName !== firstName) {
                nameMap[id] = `${firstName} ${lastName}`;
            } else {
                nameMap[id] = firstName;
            }
        });

        return nameMap;
    }, [draftEnrolledStudents, members]);

    // Função helper para acessar o mapa
    const getStudentKnownName = (student) => {
        if (!student || !student.id) return 'Aluno Sem ID';
        return studentDisplayNames[student.id] || student.name || 'Aluno não encontrado';
    };

    // Funções de cálculo
    const calculateFinalGrade = useCallback((student) => {
        const scores = student.scores;
        const { assessment } = course;
        if (!scores || !assessment) return 0;
        let total = 0;
        total += (scores.tests || []).reduce((sum, score) => sum + (Number(score) || 0), 0);
        total += (scores.assignments || []).reduce((sum, score) => sum + (Number(score) || 0), 0);
        total += ((scores.activities || []).filter(done => done).length) * (assessment.activities.value || 0);
        return parseFloat(total.toFixed(2));
    }, [course]);

    const calculateAttendancePercentage = useCallback((studentId) => {
        if (!attendanceRecords.length || !studentId) return 0;
        const student = (draftEnrolledStudents || []).find(s => s && s.id === studentId);
        if (!student) return 0;
        const considered = attendanceRecords.filter(r => !r.ignoreAttendance && !r.noClass);
        let presentCount = 0;
        considered.forEach(record => {
            if (record && record.statuses && (record.statuses[studentId] === 'presente' || record.statuses[studentId] === 'justificado')) {
                presentCount++;
            }
        });
        return Math.round((presentCount / (considered.length || 1)) * 100);
    }, [attendanceRecords, draftEnrolledStudents]);

    const getStudentStatus = useCallback((student) => {
        const finalGrade = calculateFinalGrade(student);
        const attendance = calculateAttendancePercentage(student.id);
        const { passingCriteria } = course;
        if (!passingCriteria) return { text: 'Cursando', color: 'bg-red-500' };

        const isFinished = new Date(course.endDate + 'T00:00:00') < new Date();

        if (isFinished) {
            if (attendance < passingCriteria.minAttendance) return { text: 'Reprovado por Falta', color: 'bg-orange-500' };
            if (finalGrade < passingCriteria.minGrade) return { text: 'Reprovado por Nota', color: 'bg-red-500' };
            return { text: 'Aprovado', color: 'bg-green-500' };
        }

        return { text: 'Cursando', color: 'bg-red-500' };
    }, [calculateFinalGrade, calculateAttendancePercentage, course]);

    // Hook para detectar tamanho da tela e ajustar quantidade de datas
    useEffect(() => {
        const updateVisibleDatesCount = () => {
            const width = window.innerWidth;
            // Mobile: até 768px = 3 datas
            // Desktop: acima de 768px = 7 datas
            setVisibleDatesCount(width >= 768 ? 7 : 3);
        };

        updateVisibleDatesCount();
        window.addEventListener('resize', updateVisibleDatesCount);

        return () => window.removeEventListener('resize', updateVisibleDatesCount);
    }, []);

    // Salvamento automático quando há mudanças
    useEffect(() => {
        if (hasUnsavedChanges && draftEnrolledStudents.length > 0) {
            const timeoutId = setTimeout(() => {
                onSaveStudents(course.id, draftEnrolledStudents);
                setHasUnsavedChanges(false);
            }, 1000); // Salva após 1 segundo de inatividade

            return () => clearTimeout(timeoutId);
        }
    }, [hasUnsavedChanges, draftEnrolledStudents, course.id, onSaveStudents]);

    useEffect(() => {
        if (course && isOpen) {
            const studentsWithScores = (course.students || [])
                .filter(s => s && s.id)
                .map(s => ({ ...s, scores: s.scores || { tests: [], activities: [], assignments: [] } }));
            setDraftEnrolledStudents(studentsWithScores);

            setActiveTab('attendance');
            setSelectedDate(null);
            setHasUnsavedChanges(false);

            const attendanceRef = collection(db, `artifacts/${appId}/public/data/courses/${course.id}/attendance`);
            const q = query(attendanceRef, orderBy("date", "asc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                // Filtrar apenas registros válidos (com campo date)
                const records = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(r => r && r.id && r.date && r.date.seconds != null);
                setAttendanceRecords(records);

                // Encontrar a data mais próxima do dia atual
                if (records.length > 0) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    let closestIndex = 0;
                    let minDiff = Math.abs(new Date(records[0].date.seconds * 1000) - today);

                    records.forEach((record, index) => {
                        const recordDate = new Date(record.date.seconds * 1000);
                        const diff = Math.abs(recordDate - today);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestIndex = index;
                        }
                    });

                    // Ajustar o índice para centralizar — garantir que nunca saia dos limites
                    const maxValidIndex = records.length - 1;
                    const centerIndex = Math.max(0, Math.min(closestIndex, maxValidIndex));
                    setCurrentDateIndex(centerIndex);

                    if (!selectedDate && records[centerIndex]) {
                        setSelectedDate(records[centerIndex].id);
                    }
                }
            });
            return () => unsubscribe();
        }
    }, [isOpen, course, visibleDatesCount]);

    // Funções para navegação das datas
    const getVisibleDates = () => {
        if (attendanceRecords.length === 0) return [];

        // Mostra a quantidade dinâmica de datas baseada no tamanho da tela
        const endIndex = Math.min(attendanceRecords.length, currentDateIndex + visibleDatesCount);
        const startIndex = Math.max(0, endIndex - visibleDatesCount);

        return attendanceRecords.slice(startIndex, endIndex);
    };

    const navigateDates = (direction) => {
        if (direction === -1 && currentDateIndex > 0) {
            const newIndex = currentDateIndex - 1;
            setCurrentDateIndex(newIndex);
            if (attendanceRecords[newIndex]) setSelectedDate(attendanceRecords[newIndex].id);
        } else if (direction === 1 && currentDateIndex < attendanceRecords.length - 1) {
            const newIndex = currentDateIndex + 1;
            setCurrentDateIndex(newIndex);
            if (attendanceRecords[newIndex]) setSelectedDate(attendanceRecords[newIndex].id);
        }
    };

    const handleEnroll = (studentId) => {
        const student = Array.isArray(members) ? members.find(m => m && m.id === studentId) : null;
        if (student && !draftEnrolledStudents.some(s => s && s.id === studentId)) {
            const newStudent = { id: student.id, name: student.name, scores: { tests: [], activities: [], assignments: [] } };
            setDraftEnrolledStudents(prev => [...prev, newStudent]);
            setHasUnsavedChanges(true);
        }
    };

    const handleMemberSelect = (memberId) => {
        if (memberId) {
            handleEnroll(memberId);
            setSelectedMemberToEnroll(''); // Limpar o campo após inscrever
        }
    };

    const handleUnenroll = (studentId) => {
        setDraftEnrolledStudents(prev => prev.filter(s => s.id !== studentId));
        setHasUnsavedChanges(true);
    };

    const handleScoreChange = (studentId, type, index, value) => {
        setDraftEnrolledStudents(prevStudents => {
            return prevStudents.map(student => {
                if (student.id === studentId) {
                    const newScores = JSON.parse(JSON.stringify(student.scores));
                    if (!newScores[type]) newScores[type] = [];

                    if (type === 'activities') {
                        newScores[type][index] = value;
                    } else {
                        const maxScore = course.assessment[type].value;
                        newScores[type][index] = Math.max(0, Math.min(maxScore, Number(value) || 0));
                    }
                    return { ...student, scores: newScores };
                }
                return student;
            });
        });
        setHasUnsavedChanges(true);
    };

    const handleAttendanceChange = (studentId, status) => {
        if (!selectedDate) return;
        const record = attendanceRecords.find(r => r.id === selectedDate);
        if (!record) return;
        const newStatuses = { ...record.statuses, [studentId]: status };
        // Salva apenas presença do dia
        onSaveAttendance(course.id, selectedDate, newStatuses, record.activityIndex);
    };

    const handleActivityCompletionChange = (studentId, done) => {
        const record = attendanceRecords.find(r => r.id === selectedDate);
        const activityIdx = Number(record?.activityIndex);
        if (!activityIdx || activityIdx <= 0) return;
        setDraftEnrolledStudents(prev => prev.map(s => {
            if (s.id !== studentId) return s;
            const activities = Array.from({ length: course?.assessment?.activities?.count || 0 }, (_, i) => s.scores?.activities?.[i] || false);
            activities[activityIdx - 1] = !!done;
            return { ...s, scores: { ...s.scores, activities } };
        }));
        setHasUnsavedChanges(true);
    };
    const handleActivityIndexChange = (dateId, activityIndex) => {
        const record = attendanceRecords.find(r => r.id === dateId);
        if (!record) return;
        const idx = activityIndex ? Number(activityIndex) : undefined;
        onSaveAttendance(course.id, dateId, record.statuses, { activityIndex: idx });
    };

    const toggleConsiderAttendanceForDay = (dateId, consider) => {
        const record = attendanceRecords.find(r => r.id === dateId);
        if (!record) return;
        onSaveAttendance(course.id, dateId, record.statuses, { ignoreAttendance: !consider });
    };

    const confirmSkipClassDay = (dateId) => {
        const theDate = attendanceRecords.find(r => r.id === dateId);
        const niceDate = theDate ? formatDateToBrazilian(new Date(theDate.date.seconds * 1000)) : 'esta data';
        if (window.confirm(`Confirmar: pular dia de aula (${niceDate})? O calendário será estendido em uma semana.`)) {
            onSkipClassDay && onSkipClassDay(course.id, dateId);
        }
    };



    if (!isOpen) return null;
    const notEnrolledMembers = Array.isArray(members) ? members.filter(m => m && !draftEnrolledStudents.some(s => s && s.id === m.id)) : [];
    const currentAttendance = attendanceRecords.find(r => r.id === selectedDate)?.statuses || {};
    const assessment = course.assessment;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="6xl" title={course.name} fullHeight={true} bodyClassName="p-0">
            <div className="flex flex-col h-full p-6">
                <div className="flex-shrink-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                        <div>
                            <p className="text-gray-600 mt-1">Professor: {getTeacherKnownName()}</p>
                            {getActiveSubstitute() && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <p className="text-sm text-yellow-800">
                                        <strong>Professor Substituto Ativo:</strong> {getActiveSubstitute().teacherName}
                                    </p>
                                    <p className="text-xs text-yellow-700 mt-1">
                                        Desde: {formatDateToBrazilian(getActiveSubstitute().startDate)}
                                        {getActiveSubstitute().isIndefinite ? ' (indefinido)' : ` até ${formatDateToBrazilian(getActiveSubstitute().endDate)}`}
                                    </p>
                                </div>
                            )}
                        </div>
                        {isMainTeacherOrSubOrAdmin && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setBatchModalOpen(true)}
                                    className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-900 text-white font-semibold text-sm flex items-center space-x-2 transition-all shadow"
                                >
                                    <Table size={16} />
                                    <span>Inscrição Rápida (Excel)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        navigate(`/curso-grupos/${course.id}`);
                                    }}
                                    className="px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-[#991B1B] text-white font-semibold text-sm flex items-center space-x-2 transition-all shadow"
                                >
                                    <Users size={16} />
                                    <span>{Array.isArray(course.groups) && course.groups.length > 0 ? 'Gerir Grupos' : 'Dividir Turma em Grupos'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <nav className="-mb-px flex flex-wrap space-x-4 sm:space-x-8" aria-label="Tabs">
                                <button onClick={() => setActiveTab('attendance')} className={`${activeTab === 'attendance' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Lista de Presença</button>
                                {isMainTeacherOrSubOrAdmin && (
                                    <>
                                        <button onClick={() => setActiveTab('grades')} className={`${activeTab === 'grades' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Quadro de Notas</button>
                                        <button onClick={() => setActiveTab('students')} className={`${activeTab === 'students' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Inscrição de Alunos</button>
                                    </>
                                )}
                            </nav>
                            {/* Badges de contagem — visíveis na aba de presença */}
                            {activeTab === 'attendance' && (
                                <div className="flex items-center gap-2 pb-1">
                                    <span className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700">
                                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                                        {visibleStudentsInModal.length} aluno{visibleStudentsInModal.length !== 1 ? 's' : ''}
                                    </span>
                                    {selectedDate && (() => {
                                        const rec = attendanceRecords.find(r => r.id === selectedDate);
                                        if (!rec) return null;
                                        const statuses = rec.statuses || {};
                                        const presentes = visibleStudentsInModal.filter(s => statuses[s.id] === 'presente').length;
                                        const ausentes = visibleStudentsInModal.filter(s => statuses[s.id] === 'ausente').length;
                                        return (
                                            <span className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-600">
                                                <span className="text-green-600">✓ {presentes}</span>
                                                <span className="text-gray-300">|</span>
                                                <span className="text-red-500">✗ {ausentes}</span>
                                            </span>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-grow mt-6 min-h-0">
                    {activeTab === 'students' && (
                        <div className="flex flex-col h-full space-y-6">
                            <div className="flex-shrink-0">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Inscrever Alunos</h3>
                                <PersonAutocomplete
                                    value={selectedMemberToEnroll}
                                    onChange={handleMemberSelect}
                                    placeholder="Digite o nome do aluno para inscrever..."
                                    options={notEnrolledMembers.map(member => ({
                                        value: member.id,
                                        label: member.name
                                    }))}
                                    className="w-full"
                                />
                            </div>

                            <div className="flex-grow min-h-0">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Alunos Inscritos</h3>
                                <div className="space-y-2 overflow-y-auto h-full pr-2">
                                    {(draftEnrolledStudents || []).filter(s => s && s.id).sort((a, b) => {
                                        const knownNameA = getStudentKnownName(a);
                                        const knownNameB = getStudentKnownName(b);
                                        return knownNameA.localeCompare(knownNameB);
                                    }).map(student => (
                                        <div key={student.id} className="flex justify-between items-center bg-red-50 p-3 rounded-md space-x-2">
                                            <button
                                                type="button"
                                                className="flex-1 text-left font-medium hover:underline"
                                                title="Ver cadastro"
                                                onClick={() => onViewMember && onViewMember(Array.isArray(members) ? members.find(m => m && m.id === student.id) : null)}
                                            >
                                                {getStudentKnownName(student)}
                                            </button>
                                            <button
                                                onClick={() => handleUnenroll(student.id)}
                                                className="text-sm bg-red-500 hover:bg-red-600 text-white p-2 rounded-md transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {draftEnrolledStudents.length === 0 && (
                                        <div className="text-center text-gray-500 py-8">
                                            Nenhum aluno inscrito ainda.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'attendance' && (
                        <div className="flex flex-col h-full">
                            <div className="flex-shrink-0 mb-6">
                                <div className="flex items-center justify-center space-x-2">
                                    <button
                                        onClick={() => navigateDates(-1)}
                                        disabled={currentDateIndex === 0}
                                        className={`p-2 rounded-md ${currentDateIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        <ChevronLeft size={20} />
                                    </button>

                                    <div className="flex space-x-2">
                                        {getVisibleDates().map((record, index) => (
                                            <button
                                                key={record.id}
                                                onClick={() => setSelectedDate(record.id)}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedDate === record.id
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                                    }`}
                                            >
                                                {formatDateToAbbreviated(new Date(record.date.seconds * 1000))}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => navigateDates(1)}
                                        disabled={currentDateIndex >= attendanceRecords.length - visibleDatesCount}
                                        className={`p-2 rounded-md ${currentDateIndex >= attendanceRecords.length - visibleDatesCount ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col min-h-0 flex-grow">
                                {selectedDate && (
                                    <>
                                        <div className="flex items-center gap-3 mb-2">
                                            <label className="text-sm text-gray-700">Atividade do dia:</label>
                                            <select
                                                className="border rounded-md p-1 text-sm bg-white"
                                                value={attendanceRecords.find(r => r.id === selectedDate)?.activityIndex || ''}
                                                onChange={(e) => handleActivityIndexChange(selectedDate, e.target.value || undefined)}
                                            >
                                                <option value="">Nenhuma</option>
                                                {Array.from({ length: course?.assessment?.activities?.count || 0 }).map((_, i) => (
                                                    <option key={`activity-opt-${i}`} value={i + 1}>{`A${i + 1}`}</option>
                                                ))}
                                            </select>
                                            <span className="text-xs text-gray-500">Quando definido, marcar presença também marca a atividade correspondente (A1, A2, ...).</span>
                                        </div>
                                        <div className="flex items-end gap-6 mb-2">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-gray-700">Presença</span>
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                                    checked={!(attendanceRecords.find(r => r.id === selectedDate)?.ignoreAttendance)}
                                                    onChange={(e) => toggleConsiderAttendanceForDay(selectedDate, e.target.checked)}
                                                    title="Presença"
                                                    aria-label="Presença"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="text-sm px-3 py-1 rounded-md bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300"
                                                onClick={() => confirmSkipClassDay(selectedDate)}
                                            >Pular dia de aula (não houve aula)</button>
                                        </div>
                                    </>
                                )}
                                 <div className="space-y-2 overflow-y-auto flex-grow pr-2">{visibleStudentsInModal.sort((a, b) => {
                                    const knownNameA = getStudentKnownName(a);
                                    const knownNameB = getStudentKnownName(b);
                                    return knownNameA.localeCompare(knownNameB);
                                }).map(student => (
                                    <div key={student.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                                        <button
                                            type="button"
                                            className="text-left hover:underline"
                                            title="Ver cadastro"
                                            onClick={() => onViewMember && onViewMember(Array.isArray(members) ? members.find(m => m && m.id === student.id) : null)}
                                        >
                                            {getStudentKnownName(student)}
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleAttendanceChange(student.id, 'presente')} className={`p-1 rounded ${currentAttendance[student.id] === 'presente' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-green-400'}`}><Check size={16} /></button>
                                            <button onClick={() => handleAttendanceChange(student.id, 'ausente')} className={`p-1 rounded ${currentAttendance[student.id] === 'ausente' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-red-400'}`}><X size={16} /></button>
                                            {attendanceRecords.find(r => r.id === selectedDate)?.activityIndex && (
                                                <label className="ml-2 flex items-center gap-1 text-xs text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                                        checked={Boolean(draftEnrolledStudents.find(s => s.id === student.id)?.scores?.activities?.[(Number(attendanceRecords.find(r => r.id === selectedDate)?.activityIndex)) - 1] || false)}
                                                        onChange={(e) => handleActivityCompletionChange(student.id, e.target.checked)}
                                                    />
                                                    Fez A{attendanceRecords.find(r => r.id === selectedDate)?.activityIndex}
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                ))}</div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'grades' && (
                        <div className="overflow-x-auto overflow-y-auto h-full">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-2 font-semibold">Aluno</th>
                                        {Array.from({ length: assessment?.tests?.count || 0 }).map((_, i) => <th key={`t${i}`} className="p-2 font-semibold text-center">P{i + 1} ({assessment.tests.value})</th>)}
                                        {Array.from({ length: assessment?.assignments?.count || 0 }).map((_, i) => <th key={`a${i}`} className="p-2 font-semibold text-center">T{i + 1} ({assessment.assignments.value})</th>)}
                                        {Array.from({ length: assessment?.activities?.count || 0 }).map((_, i) => <th key={`ac${i}`} className="p-2 font-semibold text-center">A{i + 1}</th>)}
                                        <th className="p-2 font-semibold text-center">% Pres.</th>
                                        <th className="p-2 font-semibold text-center">Nota Final</th>
                                        <th className="p-2 font-semibold text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleStudentsInModal.sort((a, b) => {
                                        const knownNameA = getStudentKnownName(a);
                                        const knownNameB = getStudentKnownName(b);
                                        return knownNameA.localeCompare(knownNameB);
                                    }).map(student => {
                                        const status = getStudentStatus(student);
                                        return (
                                            <tr key={student.id} className="border-b">
                                                <td className="p-2 font-medium">
                                                    <button
                                                        type="button"
                                                        className="text-left hover:underline"
                                                        title="Ver cadastro"
                                                        onClick={() => onViewMember && onViewMember(Array.isArray(members) ? members.find(m => m && m.id === student.id) : null)}
                                                    >
                                                        {getStudentKnownName(student)}
                                                    </button>
                                                </td>
                                                {Array.from({ length: assessment?.tests?.count || 0 }).map((_, i) => <td key={`t-grade-${i}`} className="p-1 text-center"><input type="number" value={student.scores.tests?.[i] || ''} onChange={(e) => handleScoreChange(student.id, 'tests', i, e.target.value)} className="w-16 text-center bg-gray-50 rounded border border-gray-300" /></td>)}
                                                {Array.from({ length: assessment?.assignments?.count || 0 }).map((_, i) => <td key={`a-grade-${i}`} className="p-1 text-center"><input type="number" value={student.scores.assignments?.[i] || ''} onChange={(e) => handleScoreChange(student.id, 'assignments', i, e.target.value)} className="w-16 text-center bg-gray-50 rounded border border-gray-300" /></td>)}
                                                {Array.from({ length: assessment?.activities?.count || 0 }).map((_, i) => <td key={`ac-grade-${i}`} className="p-1 text-center"><input type="checkbox" checked={student.scores.activities?.[i] || false} onChange={(e) => handleScoreChange(student.id, 'activities', i, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500" /></td>)}
                                                <td className="p-2 text-center font-semibold">{calculateAttendancePercentage(student.id)}%</td>
                                                <td className="p-2 text-center font-semibold">{calculateFinalGrade(student)}</td>
                                                <td className="p-2 text-center"><span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${status.color}`}>{status.text}</span></td>
                                            </tr>);
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>


            </div >
            <BatchSimpleMemberModal
                isOpen={isBatchModalOpen}
                onClose={() => setBatchModalOpen(false)}
                onSave={onSaveSimpleMember}
                onSaveAndEnroll={handleEnrollMultiple}
                allMembers={allMembers}
                allSimpleMembers={allSimpleMembers}
                areNamesSimilar={areNamesSimilar}
            />
        </Modal >
    );
};

export default ManageCourseModal;