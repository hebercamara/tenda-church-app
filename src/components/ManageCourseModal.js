import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, appId } from '../firebaseConfig';
import Modal from './Modal';
import { X, Check, Trash2, HelpCircle, Plus, Save } from 'lucide-react';
import { formatDateToBrazilian } from '../utils/dateUtils';

const ManageCourseModal = ({ course, members, isOpen, onClose, onSaveStudents, onSaveAttendance }) => {
    const [activeTab, setActiveTab] = useState('attendance');
    
    // Estados locais para rascunho (draft)
    const [draftEnrolledStudents, setDraftEnrolledStudents] = useState([]);
    
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
                if (records.length > 0 && !selectedDate) {
                    setSelectedDate(records[0].id);
                }
            });
            return () => unsubscribe();
        }
    }, [isOpen, course]);
    
    const handleEnroll = (studentId) => {
        const student = members.find(m => m.id === studentId);
        if (student && !draftEnrolledStudents.some(s => s.id === studentId)) {
            const newStudent = { id: student.id, name: student.name, scores: { tests: [], activities: [], assignments: [] } };
            setDraftEnrolledStudents(prev => [...prev, newStudent]);
            setHasUnsavedChanges(true);
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

    const handleSaveChanges = () => {
        onSaveStudents(course.id, draftEnrolledStudents);
        setHasUnsavedChanges(false);
        alert("Alunos e notas salvos com sucesso!");
    };

    if (!isOpen) return null;

    const notEnrolledMembers = members.filter(m => !draftEnrolledStudents.some(s => s.id === m.id));
    const currentAttendance = attendanceRecords.find(r => r.id === selectedDate)?.statuses || {};
    const assessment = course.assessment;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="6xl">
            <div className="flex flex-col h-[85vh]">
                <div className="flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Gerir Curso: {course.name}</h2>
                    <p className="text-gray-600 mb-6">Professor: {course.teacherName}</p>
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex flex-wrap space-x-4 sm:space-x-8" aria-label="Tabs">
                            <button onClick={() => setActiveTab('attendance')} className={`${activeTab === 'attendance' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Lista de Presença</button>
                            <button onClick={() => setActiveTab('grades')} className={`${activeTab === 'grades' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Quadro de Notas</button>
                            <button onClick={() => setActiveTab('students')} className={`${activeTab === 'students' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Inscrição de Alunos</button>
                        </nav>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto mt-6 pr-2">
                    {activeTab === 'students' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Inscrever Alunos</h3>
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">{notEnrolledMembers.map(member => (
                                    <div key={member.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md"><span>{member.name}</span><button onClick={() => handleEnroll(member.id)} className="text-sm bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded-md transition-colors"><Plus size={16}/></button></div>
                                ))}</div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Alunos Inscritos</h3>
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">{draftEnrolledStudents.map(student => (
                                    <div key={student.id} className="flex justify-between items-center bg-blue-50 p-2 rounded-md space-x-2"><span className="flex-1">{student.name}</span><button onClick={() => handleUnenroll(student.id)} className="text-sm bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-md transition-colors"><Trash2 size={16}/></button></div>
                                ))}</div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'attendance' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Datas das Aulas</h3>
                                <div className="space-y-1 max-h-96 overflow-y-auto pr-2">{attendanceRecords.map(record => (
                                    <button key={record.id} onClick={() => setSelectedDate(record.id)} className={`w-full text-left p-2 rounded-md ${selectedDate === record.id ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                        {formatDateToBrazilian(new Date(record.date.seconds * 1000))}
                                    </button>
                                ))}</div>
                            </div>
                            <div className="md:col-span-2">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Registo de Presença - {selectedDate && formatDateToBrazilian(new Date(attendanceRecords.find(r=>r.id===selectedDate).date.seconds*1000))}</h3>
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">{draftEnrolledStudents.map(student => (
                                    <div key={student.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                                        <span>{student.name}</span>
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
                        <div className="overflow-x-auto">
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
                                            <td className="p-2 font-medium">{student.name}</td>
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

                <div className="flex-shrink-0 flex justify-between items-center pt-6 mt-4 border-t">
                    {hasUnsavedChanges ? (
                        <button onClick={handleSaveChanges} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700">
                            <Save size={18}/>
                            <span>Salvar Alterações de Alunos/Notas</span>
                        </button>
                    ) : <div/>}
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-all">Fechar</button>
                </div>
            </div>
        </Modal>
    );
};

export default ManageCourseModal;