import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, appId } from '../firebaseConfig';
import Modal from './Modal';
import PersonAutocomplete from './PersonAutocomplete';
import { X, Check, Trash2, HelpCircle, Plus, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateToBrazilian, formatDateToAbbreviated } from '../utils/dateUtils';

const ManageCourseModal = ({ course, members, isOpen, onClose, onSaveStudents, onSaveAttendance }) => {
    const [activeTab, setActiveTab] = useState('attendance');
    const [selectedMemberToEnroll, setSelectedMemberToEnroll] = useState('');
    
    // Estados locais para rascunho (draft)
    const [draftEnrolledStudents, setDraftEnrolledStudents] = useState([]);
    
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    
    // Estados para navegação das datas
    const [currentDateIndex, setCurrentDateIndex] = useState(0);
    const [visibleDatesCount, setVisibleDatesCount] = useState(3);

    // Função para obter o nome conhecido do professor
    const getTeacherKnownName = () => {
        const teacher = members.find(m => m.id === course.teacherId);
        if (!teacher) return course.teacherName || 'Professor não encontrado';
        
        // Se knownBy estiver vazio, usa o primeiro nome
        return teacher.knownBy || teacher.name?.split(' ')[0] || teacher.name || 'Professor';
    };

    // Função para obter o nome conhecido dos alunos com lógica de sobrenome para duplicatas
    const getStudentKnownName = (student) => {
        const member = members.find(m => m.id === student.id);
        if (!member) return student.name || 'Aluno não encontrado';
        
        // Obter o nome conhecido ou primeiro nome como fallback
        const knownName = member.knownBy || member.name?.split(' ')[0] || member.name || 'Aluno';
        
        // Verificar se há duplicatas do mesmo nome conhecido entre os alunos inscritos
        const studentsWithSameName = draftEnrolledStudents.filter(s => {
            const otherMember = members.find(m => m.id === s.id);
            if (!otherMember || s.id === student.id) return false;
            const otherKnownName = otherMember.knownBy || otherMember.name?.split(' ')[0] || otherMember.name || 'Aluno';
            return otherKnownName === knownName;
        });
        
        // Se há duplicatas, adicionar o último sobrenome
        if (studentsWithSameName.length > 0) {
            const nameParts = member.name?.split(' ') || [];
            const lastName = nameParts[nameParts.length - 1];
            return lastName && lastName !== knownName ? `${knownName} ${lastName}` : knownName;
        }
        
        return knownName;
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
        if (!attendanceRecords.length) return 0;
        const student = draftEnrolledStudents.find(s => s.id === studentId);
        if (!student) return 0;
        let presentCount = 0;
        attendanceRecords.forEach(record => {
            if (record.statuses[studentId] === 'presente' || record.statuses[studentId] === 'justificado') {
                presentCount++;
            }
        });
        return Math.round((presentCount / attendanceRecords.length) * 100);
    }, [attendanceRecords, draftEnrolledStudents]);

    const getStudentStatus = useCallback((student) => {
        const finalGrade = calculateFinalGrade(student);
        const attendance = calculateAttendancePercentage(student.id);
        const { passingCriteria } = course;
        if (!passingCriteria) return { text: 'Cursando', color: 'bg-blue-500' };

        const isFinished = new Date(course.endDate + 'T00:00:00') < new Date();
        
        if (isFinished) {
            if (attendance < passingCriteria.minAttendance) return { text: 'Reprovado por Falta', color: 'bg-orange-500' };
            if (finalGrade < passingCriteria.minGrade) return { text: 'Reprovado por Nota', color: 'bg-red-500' };
            return { text: 'Aprovado', color: 'bg-green-500' };
        }
        
        return { text: 'Cursando', color: 'bg-blue-500' };
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
            const studentsWithScores = (course.students || []).map(s => ({...s, scores: s.scores || { tests: [], activities: [], assignments: [] }}));
            setDraftEnrolledStudents(studentsWithScores);
            
            setActiveTab('attendance');
            setSelectedDate(null);
            setHasUnsavedChanges(false);

            const attendanceRef = collection(db, `artifacts/${appId}/public/data/courses/${course.id}/attendance`);
            const q = query(attendanceRef, orderBy("date", "asc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
                    
                    // Ajustar o índice para centralizar baseado na quantidade de datas visíveis
                    const halfVisible = Math.floor(visibleDatesCount / 2);
                    const centerIndex = Math.max(halfVisible, Math.min(closestIndex, records.length - halfVisible - 1));
                    setCurrentDateIndex(centerIndex);
                    
                    if (!selectedDate) {
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
            setSelectedDate(attendanceRecords[newIndex].id);
        } else if (direction === 1 && currentDateIndex < attendanceRecords.length - 1) {
            const newIndex = currentDateIndex + 1;
            setCurrentDateIndex(newIndex);
            setSelectedDate(attendanceRecords[newIndex].id);
        }
    };
    
    const handleEnroll = (studentId) => {
        const student = members.find(m => m.id === studentId);
        if (student && !draftEnrolledStudents.some(s => s.id === studentId)) {
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
        onSaveAttendance(course.id, selectedDate, newStatuses);
    };



    if (!isOpen) return null;

    const notEnrolledMembers = members.filter(m => !draftEnrolledStudents.some(s => s.id === m.id));
    const currentAttendance = attendanceRecords.find(r => r.id === selectedDate)?.statuses || {};
    const assessment = course.assessment;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="6xl" hideHeader={true}>
            <div className="flex flex-col h-[95vh] p-6">
                <div className="flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{course.name}</h2>
                            <p className="text-gray-600 mt-1">Professor: {getTeacherKnownName()}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-red-500 hover:bg-red-100 rounded-full p-2 transition-all flex-shrink-0"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex flex-wrap space-x-4 sm:space-x-8" aria-label="Tabs">
                            <button onClick={() => setActiveTab('attendance')} className={`${activeTab === 'attendance' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Lista de Presença</button>
                            <button onClick={() => setActiveTab('grades')} className={`${activeTab === 'grades' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Quadro de Notas</button>
                            <button onClick={() => setActiveTab('students')} className={`${activeTab === 'students' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Inscrição de Alunos</button>
                        </nav>
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
                                    {draftEnrolledStudents.map(student => (
                                        <div key={student.id} className="flex justify-between items-center bg-blue-50 p-3 rounded-md space-x-2">
                                            <span className="flex-1 font-medium">{getStudentKnownName(student)}</span>
                                            <button 
                                                onClick={() => handleUnenroll(student.id)} 
                                                className="text-sm bg-red-500 hover:bg-red-600 text-white p-2 rounded-md transition-colors"
                                            >
                                                <Trash2 size={16}/>
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
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                                    selectedDate === record.id 
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
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex-shrink-0">Registo de Presença - {selectedDate && formatDateToBrazilian(new Date(attendanceRecords.find(r=>r.id===selectedDate).date.seconds*1000))}</h3>
                                <div className="space-y-2 overflow-y-auto flex-grow pr-2">{draftEnrolledStudents.map(student => (
                                    <div key={student.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                                        <span>{getStudentKnownName(student)}</span>
                                        <div className="flex space-x-1">
                                            <button onClick={()=>handleAttendanceChange(student.id, 'presente')} className={`p-1 rounded ${currentAttendance[student.id] === 'presente' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-green-400'}`}><Check size={16}/></button>
                                            <button onClick={()=>handleAttendanceChange(student.id, 'ausente')} className={`p-1 rounded ${currentAttendance[student.id] === 'ausente' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-red-400'}`}><X size={16}/></button>
                                            <button onClick={()=>handleAttendanceChange(student.id, 'justificado')} className={`p-1 rounded ${currentAttendance[student.id] === 'justificado' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-yellow-400'}`}><HelpCircle size={16}/></button>
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
                                        {Array.from({ length: assessment?.tests?.count || 0 }).map((_, i) => <th key={`t${i}`} className="p-2 font-semibold text-center">P{i+1} ({assessment.tests.value})</th>)}
                                        {Array.from({ length: assessment?.assignments?.count || 0 }).map((_, i) => <th key={`a${i}`} className="p-2 font-semibold text-center">T{i+1} ({assessment.assignments.value})</th>)}
                                        {Array.from({ length: assessment?.activities?.count || 0 }).map((_, i) => <th key={`ac${i}`} className="p-2 font-semibold text-center">A{i+1}</th>)}
                                        <th className="p-2 font-semibold text-center">% Pres.</th>
                                        <th className="p-2 font-semibold text-center">Nota Final</th>
                                        <th className="p-2 font-semibold text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {draftEnrolledStudents.map(student => {
                                        const status = getStudentStatus(student);
                                        return (
                                        <tr key={student.id} className="border-b">
                                            <td className="p-2 font-medium">{getStudentKnownName(student)}</td>
                                            {Array.from({ length: assessment?.tests?.count || 0 }).map((_, i) => <td key={`t-grade-${i}`} className="p-1 text-center"><input type="number" value={student.scores.tests?.[i] || ''} onChange={(e) => handleScoreChange(student.id, 'tests', i, e.target.value)} className="w-16 text-center bg-gray-50 rounded border border-gray-300"/></td>)}
                                            {Array.from({ length: assessment?.assignments?.count || 0 }).map((_, i) => <td key={`a-grade-${i}`} className="p-1 text-center"><input type="number" value={student.scores.assignments?.[i] || ''} onChange={(e) => handleScoreChange(student.id, 'assignments', i, e.target.value)} className="w-16 text-center bg-gray-50 rounded border border-gray-300"/></td>)}
                                            {Array.from({ length: assessment?.activities?.count || 0 }).map((_, i) => <td key={`ac-grade-${i}`} className="p-1 text-center"><input type="checkbox" checked={student.scores.activities?.[i] || false} onChange={(e) => handleScoreChange(student.id, 'activities', i, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"/></td>)}
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


            </div>
        </Modal>
    );
};

export default ManageCourseModal;