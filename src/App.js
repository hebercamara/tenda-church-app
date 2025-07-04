import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    doc, 
    setDoc, 
    getDoc,
    deleteDoc,
    updateDoc,
    query,
    getDocs,
    writeBatch,
    where
} from 'firebase/firestore';
import { User, X, Users, Home, Calendar, Edit, Trash2, Plus, LogOut, MapPin, Clock, Mail, BookOpen, ClipboardList, GraduationCap, Check, HelpCircle } from 'lucide-react';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrFbwJq_mJnhaSe1znuIn08ITniuP0kjE",
  authDomain: "tenda-church-app.firebaseapp.com",
  projectId: "tenda-church-app",
  storageBucket: "tenda-church-app.appspot.com",
  messagingSenderId: "101125626219",
  appId: "1:101125626219:web:c1fc57f022abb21ab6542e",
  measurementId: "G-QJ532E483W"
};


// --- Inicialização do Firebase usando a configuração ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = firebaseConfig.projectId;

const ADMIN_EMAIL = "tendachurchgbi@batistavida.com.br";
const weekDaysMap = { "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3, "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6 };

// --- Componentes ---

const Header = ({ onLogout }) => (
  <header className="bg-[#991B1B] p-4 shadow-lg flex items-center justify-between">
      <img src="https://firebasestorage.googleapis.com/v0/b/cad-prestadores---heberlog.appspot.com/o/Logos%2FPrancheta%208.png?alt=media&token=b1ccc570-7210-48b6-b4a3-e01074bca3be" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x50/991B1B/FFFFFF?text=Logo+Tenda+Church'; }} alt="Logo Tenda Church" className="h-10"/>
      <button onClick={onLogout} className="bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg flex items-center space-x-2 transition-all"><LogOut size={18} /><span>Sair</span></button>
  </header>
);

const Modal = ({ children, isOpen, onClose, size = 'lg' }) => {
  if (!isOpen) return null;
  const sizeClasses = { 'lg': 'max-w-lg', '2xl': 'max-w-2xl', '4xl': 'max-w-4xl', '6xl': 'max-w-6xl' }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} p-6 relative`} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black transition-colors"><X size={24} /></button>
        {children}
      </div>
    </div>
  );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return ( <Modal isOpen={isOpen} onClose={onClose}> <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2> <p className="text-gray-600 mb-6">{message}</p> <div className="flex justify-end space-x-3"><button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all">Cancelar</button><button onClick={onConfirm} className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all">Confirmar Exclusão</button></div> </Modal> );
};

const ConnectForm = ({ onClose, onSave, members, editingConnect }) => {
  const [formData, setFormData] = useState({ number: editingConnect?.number || '', name: editingConnect?.name || '', weekday: editingConnect?.weekday || '', time: editingConnect?.time || '', address: editingConnect?.address || '', leaderId: editingConnect?.leaderId || '' });
  const [error, setError] = useState('');
  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleSubmit = (e) => { e.preventDefault(); if (!formData.number || !formData.name || !formData.weekday || !formData.time || !formData.address || !formData.leaderId) { setError('Todos os campos são obrigatórios.'); return; } const leader = members.find(m => m.id === formData.leaderId); if (!leader?.email) { setError('O membro selecionado como líder precisa ter um e-mail cadastrado.'); return; } onSave({ ...formData, leaderName: leader?.name || 'Não encontrado', leaderEmail: leader?.email }); onClose(); };
  const weekDays = Object.keys(weekDaysMap);
  return ( <form onSubmit={handleSubmit} className="space-y-4"><h2 className="text-2xl font-bold text-gray-900 mb-6">{editingConnect ? 'Editar Connect' : 'Novo Connect'}</h2>{error && <p className="text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">Número</label><input type="number" name="number" id="number" value={formData.number} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" placeholder="Ex: 101" /></div><div><label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome</label><input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" placeholder="Ex: Guerreiros da Fé" /></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label htmlFor="weekday" className="block text-sm font-medium text-gray-700 mb-1">Dia da Semana</label><select name="weekday" id="weekday" value={formData.weekday} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]"><option value="">Selecione...</option>{weekDays.map(day => <option key={day} value={day}>{day}</option>)}</select></div><div><label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Horário</label><input type="time" name="time" id="time" value={formData.time} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" /></div></div><div><label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Endereço</label><input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" placeholder="Rua, Número, Bairro" /></div><div><label htmlFor="leaderId" className="block text-sm font-medium text-gray-700 mb-1">Líder do Connect</label><select name="leaderId" id="leaderId" value={formData.leaderId} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]"><option value="">Selecione um líder</option>{members.map(member => (<option key={member.id} value={member.id}>{member.name} ({member.email || 'sem e-mail'})</option>))}</select></div><div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all">Cancelar</button><button type="submit" className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all">{editingConnect ? 'Salvar Alterações' : 'Adicionar Connect'}</button></div></form> );
};

const CourseForm = ({ onClose, onSave, members, editingCourse }) => {
    const [formData, setFormData] = useState({ name: editingCourse?.name || '', teacherId: editingCourse?.teacherId || '', startDate: editingCourse?.startDate || '', endDate: editingCourse?.endDate || '', classDay: editingCourse?.classDay || '', classTime: editingCourse?.classTime || '', assessment: editingCourse?.assessment || { tests: { count: 0, value: 0 }, activities: { count: 0, value: 0 }, assignments: { count: 0, value: 0 }, }, passingCriteria: editingCourse?.passingCriteria || { minGrade: 7, minAttendance: 75, } });
    const [error, setError] = useState('');
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleAssessmentChange = (type, field, value) => { setFormData(prev => ({ ...prev, assessment: { ...prev.assessment, [type]: { ...prev.assessment[type], [field]: Number(value) || 0 } } })); };
    const handlePassingChange = (field, value) => { setFormData(prev => ({ ...prev, passingCriteria: { ...prev.passingCriteria, [field]: Number(value) || 0 } })); };
    const handleSubmit = (e) => { e.preventDefault(); if (!formData.name || !formData.teacherId || !formData.startDate || !formData.endDate || !formData.classDay || !formData.classTime) { setError('Todos os campos básicos são obrigatórios.'); return; } const teacher = members.find(m => m.id === formData.teacherId); if (!teacher?.email) { setError('O membro selecionado como professor precisa ter um e-mail cadastrado.'); return; } onSave({ ...formData, teacherName: teacher.name, teacherEmail: teacher.email, students: editingCourse?.students || [] }); onClose(); };
    const weekDays = Object.keys(weekDaysMap);
    return (
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
            <div className="flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{editingCourse ? 'Editar Curso' : 'Novo Curso'}</h2>
                {error && <p className="text-red-600 bg-red-100 p-2 rounded-md mb-4">{error}</p>}
            </div>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                <fieldset className="border p-4 rounded-md">
                    <legend className="px-2 font-semibold">Informações Básicas</legend>
                    <div className="space-y-2">
                        <div><label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome do Curso</label><input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" placeholder="Ex: Fundamentos da Fé" /></div>
                        <div><label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 mb-1">Professor</label><select name="teacherId" id="teacherId" value={formData.teacherId} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]"><option value="">Selecione um professor</option>{members.map(member => (<option key={member.id} value={member.id}>{member.name} ({member.email || 'sem e-mail'})</option>))}</select></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label htmlFor="classDay" className="block text-sm font-medium text-gray-700 mb-1">Dia da Aula</label><select name="classDay" id="classDay" value={formData.classDay} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]"><option value="">Selecione...</option>{weekDays.map(day => <option key={day} value={day}>{day}</option>)}</select></div><div><label htmlFor="classTime" className="block text-sm font-medium text-gray-700 mb-1">Horário da Aula</label><input type="time" name="classTime" id="classTime" value={formData.classTime} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" /></div></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Data de Início</label><input type="date" name="startDate" id="startDate" value={formData.startDate} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" /></div><div><label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Data de Término</label><input type="date" name="endDate" id="endDate" value={formData.endDate} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" /></div></div>
                    </div>
                </fieldset>
                <fieldset className="border p-4 rounded-md">
                    <legend className="px-2 font-semibold">Estrutura de Avaliação (Total: 10 Pontos)</legend>
                    <div className="grid grid-cols-3 gap-4 mb-2"><span className="font-medium text-gray-700 text-sm">Tipo</span><span className="font-medium text-gray-700 text-sm">Quantidade</span><span className="font-medium text-gray-700 text-sm">Valor (cada)</span></div>
                    {['tests', 'assignments', 'activities'].map(type => {
                        const typeLabels = { tests: 'Provas', assignments: 'Trabalhos', activities: 'Atividades' };
                        return (<div key={type} className="grid grid-cols-3 gap-4 items-center mb-2"><label className="text-sm">{typeLabels[type]}</label><input type="number" min="0" value={formData.assessment[type].count} onChange={(e) => handleAssessmentChange(type, 'count', e.target.value)} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300" /><input type="number" min="0" step="0.25" value={formData.assessment[type].value} onChange={(e) => handleAssessmentChange(type, 'value', e.target.value)} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300" /></div>);
                    })}
                </fieldset>
                <fieldset className="border p-4 rounded-md">
                    <legend className="px-2 font-semibold">Critérios de Aprovação</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label htmlFor="minGrade" className="block text-sm font-medium text-gray-700 mb-1">Nota Mínima (0 a 10)</label><input type="number" min="0" max="10" step="0.5" id="minGrade" value={formData.passingCriteria.minGrade} onChange={(e) => handlePassingChange('minGrade', e.target.value)} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300" /></div>
                        <div><label htmlFor="minAttendance" className="block text-sm font-medium text-gray-700 mb-1">Assiduidade Mínima (%)</label><input type="number" min="0" max="100" id="minAttendance" value={formData.passingCriteria.minAttendance} onChange={(e) => handlePassingChange('minAttendance', e.target.value)} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300" /></div>
                    </div>
                </fieldset>
            </div>
            <div className="flex-shrink-0 flex justify-end space-x-3 pt-4 border-t mt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all">{editingCourse ? 'Salvar Alterações' : 'Adicionar Curso'}</button>
            </div>
        </form>
    );
};


const ManageCourseModal = ({ course, members, isOpen, onClose, onSaveStudents, onSaveAttendance }) => {
    const [activeTab, setActiveTab] = useState('attendance'); const [enrolledStudents, setEnrolledStudents] = useState([]); const [studentScores, setStudentScores] = useState({}); const [attendanceRecords, setAttendanceRecords] = useState([]); const [selectedDate, setSelectedDate] = useState(null);
    const calculateAttendancePercentage = useCallback((studentId) => { if (!attendanceRecords.length) return 0; let presentCount = 0; attendanceRecords.forEach(record => { if (record.statuses[studentId] === 'presente' || record.statuses[studentId] === 'justificado') { presentCount++; } }); return Math.round((presentCount / attendanceRecords.length) * 100); }, [attendanceRecords]);
    const calculateFinalGrade = useCallback((studentId) => { const scores = studentScores[studentId]; const { assessment } = course; if (!scores || !assessment) return 0; let total = 0; total += (scores.tests || []).reduce((sum, score) => sum + (Number(score) || 0), 0); total += (scores.assignments || []).reduce((sum, score) => sum + (Number(score) || 0), 0); total += ((scores.activities || []).filter(done => done).length) * (assessment.activities.value || 0); return parseFloat(total.toFixed(2)); }, [studentScores, course]);
    const getStudentStatus = useCallback((studentId) => { const finalGrade = calculateFinalGrade(studentId); const attendance = calculateAttendancePercentage(studentId); const { passingCriteria } = course; if (!passingCriteria) return { text: 'Cursando', color: 'bg-blue-500' }; if (attendance < passingCriteria.minAttendance) { return { text: 'Reprovado por Falta', color: 'bg-orange-500' }; } if (finalGrade < passingCriteria.minGrade) { return { text: 'Reprovado por Nota', color: 'bg-red-500' }; } return { text: 'Aprovado', color: 'bg-green-500' }; }, [calculateFinalGrade, calculateAttendancePercentage, course]);

    useEffect(() => {
        if (course && isOpen) {
            const studentsWithScores = (course.students || []).map(s => ({...s, scores: s.scores || { tests: [], activities: [], assignments: [] }}));
            setEnrolledStudents(studentsWithScores);
            const initialScores = {};
            studentsWithScores.forEach(student => { initialScores[student.id] = student.scores; });
            setStudentScores(initialScores);
            setSelectedDate(null);
            const attendanceRef = collection(db, `artifacts/${appId}/public/data/courses/${course.id}/attendance`);
            const q = query(attendanceRef);
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const sortedRecords = records.sort((a,b) => a.date.seconds - b.date.seconds);
                setAttendanceRecords(sortedRecords);
                setSelectedDate(current => current && sortedRecords.some(r => r.id === current) ? current : sortedRecords[0]?.id || null);
            });
            return () => unsubscribe();
        }
    }, [course, isOpen]);

    const handleEnroll = (studentId) => { const student = members.find(m => m.id === studentId); if (student && !enrolledStudents.some(s => s.id === studentId)) { const newStudents = [...enrolledStudents, { id: student.id, name: student.name, scores: { tests: [], activities: [], assignments: [] } }]; setEnrolledStudents(newStudents); onSaveStudents(newStudents); } };
    const handleUnenroll = (studentId) => { const newStudents = enrolledStudents.filter(s => s.id !== studentId); setEnrolledStudents(newStudents); onSaveStudents(newStudents); };
    const handleScoreChange = (studentId, type, index, value) => { const newScores = { ...studentScores }; if (!newScores[studentId]) newScores[studentId] = { tests: [], activities: [], assignments: [] }; if (!newScores[studentId][type]) newScores[studentId][type] = []; if (type === 'activities') { newScores[studentId][type][index] = value; } else { const maxScore = course.assessment[type].value; newScores[studentId][type][index] = Math.max(0, Math.min(maxScore, Number(value) || 0)); } setStudentScores(newScores); const studentIndex = enrolledStudents.findIndex(s => s.id === studentId); if (studentIndex !== -1) { const newStudents = [...enrolledStudents]; newStudents[studentIndex] = { ...newStudents[studentIndex], scores: newScores[studentId] }; onSaveStudents(newStudents); } };
    const handleAttendanceChange = (studentId, status) => { if (!selectedDate) return; const record = attendanceRecords.find(r => r.id === selectedDate); if (!record) return; const newStatuses = { ...record.statuses, [studentId]: status }; onSaveAttendance(selectedDate, newStatuses); };
    if (!isOpen) return null;
    const notEnrolledMembers = members.filter(m => !enrolledStudents.some(s => s.id === m.id)); const currentAttendance = attendanceRecords.find(r => r.id === selectedDate)?.statuses || {}; const assessment = course.assessment;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="6xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Gerir Curso: {course.name}</h2><p className="text-gray-600 mb-6">Professor: {course.teacherName}</p>
            <div className="border-b border-gray-200"><nav className="-mb-px flex space-x-8" aria-label="Tabs"><button onClick={() => setActiveTab('attendance')} className={`${activeTab === 'attendance' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Lista de Presença</button><button onClick={() => setActiveTab('grades')} className={`${activeTab === 'grades' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Quadro de Notas</button><button onClick={() => setActiveTab('students')} className={`${activeTab === 'students' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Inscrição de Alunos</button></nav></div>
            {activeTab === 'students' && ( <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6"> <div><h3 className="text-lg font-semibold text-gray-800 mb-3">Inscrever Alunos</h3><div className="space-y-2 max-h-96 overflow-y-auto pr-2">{notEnrolledMembers.map(member => (<div key={member.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md"><span>{member.name}</span><button onClick={() => handleEnroll(member.id)} className="text-sm bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded-md transition-colors"><Plus size={16}/></button></div>))}</div></div> <div><h3 className="text-lg font-semibold text-gray-800 mb-3">Alunos Inscritos</h3><div className="space-y-2 max-h-96 overflow-y-auto pr-2">{enrolledStudents.map(student => (<div key={student.id} className="flex justify-between items-center bg-blue-50 p-2 rounded-md space-x-2"><span className="flex-1">{student.name}</span><button onClick={() => handleUnenroll(student.id)} className="text-sm bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-md transition-colors"><Trash2 size={16}/></button></div>))}</div></div> </div> )}
            {activeTab === 'attendance' && ( <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6"> <div><h3 className="text-lg font-semibold text-gray-800 mb-3">Datas das Aulas</h3><div className="space-y-1 max-h-96 overflow-y-auto pr-2">{attendanceRecords.map(record => (<button key={record.id} onClick={() => setSelectedDate(record.id)} className={`w-full text-left p-2 rounded-md ${selectedDate === record.id ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{new Date(record.date.seconds * 1000).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</button>))}</div></div> <div className="md:col-span-2"> <h3 className="text-lg font-semibold text-gray-800 mb-3">Registo de Presença - {selectedDate && new Date(attendanceRecords.find(r=>r.id===selectedDate).date.seconds*1000).toLocaleDateString('pt-BR',{timeZone: 'UTC'})}</h3> <div className="space-y-2 max-h-96 overflow-y-auto pr-2">{enrolledStudents.map(student => (<div key={student.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md"><span>{student.name}</span><div className="flex space-x-1"><button onClick={()=>handleAttendanceChange(student.id, 'presente')} className={`p-1 rounded ${currentAttendance[student.id] === 'presente' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-green-400'}`}><Check size={16}/></button><button onClick={()=>handleAttendanceChange(student.id, 'ausente')} className={`p-1 rounded ${currentAttendance[student.id] === 'ausente' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-red-400'}`}><X size={16}/></button><button onClick={()=>handleAttendanceChange(student.id, 'justificado')} className={`p-1 rounded ${currentAttendance[student.id] === 'justificado' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-yellow-400'}`}><HelpCircle size={16}/></button></div></div>))}</div></div></div> )}
            {activeTab === 'grades' && ( <div className="overflow-x-auto mt-6"> <table className="w-full text-sm text-left"> <thead className="bg-gray-100"><tr> <th className="p-2 font-semibold">Aluno</th> {Array.from({ length: assessment?.tests?.count || 0 }).map((_, i) => <th key={`t${i}`} className="p-2 font-semibold text-center">P{i+1} ({assessment.tests.value})</th>)} {Array.from({ length: assessment?.assignments?.count || 0 }).map((_, i) => <th key={`a${i}`} className="p-2 font-semibold text-center">T{i+1} ({assessment.assignments.value})</th>)} {Array.from({ length: assessment?.activities?.count || 0 }).map((_, i) => <th key={`ac${i}`} className="p-2 font-semibold text-center">A{i+1}</th>)} <th className="p-2 font-semibold text-center">% Pres.</th><th className="p-2 font-semibold text-center">Nota Final</th><th className="p-2 font-semibold text-center">Status</th> </tr></thead> <tbody> {enrolledStudents.map(student => { const status = getStudentStatus(student.id); return (<tr key={student.id} className="border-b"> <td className="p-2 font-medium">{student.name}</td> {Array.from({ length: assessment?.tests?.count || 0 }).map((_, i) => <td key={`t-grade-${i}`} className="p-1 text-center"><input type="number" value={studentScores[student.id]?.tests?.[i] || ''} onChange={(e) => handleScoreChange(student.id, 'tests', i, e.target.value)} className="w-16 text-center bg-gray-50 rounded border border-gray-300"/></td>)} {Array.from({ length: assessment?.assignments?.count || 0 }).map((_, i) => <td key={`a-grade-${i}`} className="p-1 text-center"><input type="number" value={studentScores[student.id]?.assignments?.[i] || ''} onChange={(e) => handleScoreChange(student.id, 'assignments', i, e.target.value)} className="w-16 text-center bg-gray-50 rounded border border-gray-300"/></td>)} {Array.from({ length: assessment?.activities?.count || 0 }).map((_, i) => <td key={`ac-grade-${i}`} className="p-1 text-center"><input type="checkbox" checked={studentScores[student.id]?.activities?.[i] || false} onChange={(e) => handleScoreChange(student.id, 'activities', i, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"/></td>)} <td className="p-2 text-center font-semibold">{calculateAttendancePercentage(student.id)}%</td> <td className="p-2 text-center font-semibold">{calculateFinalGrade(student.id)}</td> <td className="p-2 text-center"><span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${status.color}`}>{status.text}</span></td> </tr>); })} </tbody> </table> </div> )}
            <div className="flex justify-end pt-6"><button type="button" onClick={onClose} className="px-6 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-all">Fechar</button></div>
        </Modal>
    );
};

const ConnectReportModal = ({ isOpen, onClose, connect, members, onSave }) => {
    const [reportDates, setReportDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [attendance, setAttendance] = useState({});
    const [guests, setGuests] = useState('');
    const [offering, setOffering] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const connectMembers = useMemo(() => members.filter(m => m.connectId === connect?.id), [members, connect]);

    useEffect(() => {
        if (!connect) return;

        const getReportDates = () => {
            const connectWeekday = weekDaysMap[connect.weekday];
            if (connectWeekday === undefined) return;

            const today = new Date();
            const todayWeekday = today.getDay();
            
            let daysToSubtract = todayWeekday - connectWeekday;
            if (daysToSubtract < 0) {
                daysToSubtract += 7;
            }

            const currentWeekMeeting = new Date(today);
            currentWeekMeeting.setDate(today.getDate() - daysToSubtract);
            const currentWeekDateString = currentWeekMeeting.toISOString().split('T')[0];
            
            const previousWeekMeeting = new Date(currentWeekMeeting);
            previousWeekMeeting.setDate(currentWeekMeeting.getDate() - 7);
            const previousWeekDateString = previousWeekMeeting.toISOString().split('T')[0];
            
            setReportDates([
                { label: `Semana Atual (${currentWeekMeeting.toLocaleDateString('pt-BR')})`, value: currentWeekDateString },
                { label: `Semana Anterior (${previousWeekMeeting.toLocaleDateString('pt-BR')})`, value: previousWeekDateString }
            ]);
            setSelectedDate(currentWeekDateString);
        };
        
        getReportDates();
    }, [connect]);

    useEffect(() => {
        if (!selectedDate || !connect) return;

        const fetchReport = async () => {
            setIsLoading(true);
            const reportId = `${connect.id}_${selectedDate}`;
            const reportRef = doc(db, `artifacts/${appId}/public/data/connect_reports`, reportId);
            const reportSnap = await getDoc(reportRef);

            if (reportSnap.exists()) {
                const data = reportSnap.data();
                setAttendance(data.attendance || {});
                setGuests(data.guests?.toString() || '');
                setOffering(data.offering?.toString() || '');
            } else {
                // Reset form if no report exists for the selected date
                const initialAttendance = {};
                connectMembers.forEach(m => { initialAttendance[m.id] = 'ausente'; });
                setAttendance(initialAttendance);
                setGuests('');
                setOffering('');
            }
            setIsLoading(false);
        };

        fetchReport();
    }, [selectedDate, connect, connectMembers]);
    
    const handleAttendanceChange = (memberId, status) => {
        setAttendance(prev => ({ ...prev, [memberId]: status }));
    };

    const handleSave = () => {
        const reportData = {
            connectId: connect.id,
            connectName: connect.name,
            leaderId: connect.leaderId,
            leaderName: connect.leaderName,
            reportDate: new Date(selectedDate),
            guests: Number(guests) || 0,
            offering: Number(offering) || 0,
            attendance: attendance
        };
        onSave(reportData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
            <div className="flex flex-col max-h-[85vh]">
                <div className="flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Relatório do Connect {connect.number}</h2>
                    <p className="text-gray-600 mb-4">{connect.name}</p>
                    <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700 mb-1">Selecione a data da reunião</label>
                    <select id="reportDate" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]">
                        {reportDates.map(date => <option key={date.value} value={date.value}>{date.label}</option>)}
                    </select>
                </div>
                {isLoading ? <div className="text-center p-8">Carregando relatório...</div> : (
                    <>
                        <div className="flex-grow overflow-y-auto space-y-4 pr-2 mt-4">
                            <fieldset className="border p-4 rounded-md">
                                <legend className="px-2 font-semibold">Presença dos Membros</legend>
                                <div className="space-y-2">
                                    {connectMembers.map(member => (
                                        <div key={member.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                                            <span>{member.name}</span>
                                            <div className="flex space-x-2">
                                                <button onClick={() => handleAttendanceChange(member.id, 'presente')} className={`px-3 py-1 text-sm rounded-md ${attendance[member.id] === 'presente' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-green-200'}`}>Presente</button>
                                                <button onClick={() => handleAttendanceChange(member.id, 'ausente')} className={`px-3 py-1 text-sm rounded-md ${attendance[member.id] === 'ausente' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-red-200'}`}>Ausente</button>
                                            </div>
                                        </div>
                                    ))}
                                    {connectMembers.length === 0 && <p className="text-gray-500">Nenhum membro neste Connect.</p>}
                                </div>
                            </fieldset>
                            <fieldset className="border p-4 rounded-md">
                                <legend className="px-2 font-semibold">Informações Adicionais</legend>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="guests" className="block text-sm font-medium text-gray-700 mb-1">Nº de Convidados</label>
                                        <input type="number" id="guests" value={guests} onChange={e => setGuests(e.target.value)} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" placeholder="0" />
                                    </div>
                                    <div>
                                        <label htmlFor="offering" className="block text-sm font-medium text-gray-700 mb-1">Valor da Oferta (R$)</label>
                                        <input type="number" id="offering" value={offering} onChange={e => setOffering(e.target.value)} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" placeholder="0.00" step="0.01"/>
                                    </div>
                                </div>
                            </fieldset>
                        </div>
                         <div className="flex-shrink-0 flex justify-end space-x-3 pt-4 border-t mt-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all">Cancelar</button>
                            <button type="button" onClick={handleSave} className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all">Salvar Relatório</button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
};


const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(getFriendlyErrorMessage(err.code));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(getFriendlyErrorMessage(err.code));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getFriendlyErrorMessage = (code) => {
        switch (code) {
            case 'auth/invalid-email': return 'O formato do e-mail é inválido.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential': return 'E-mail ou senha incorretos.';
            case 'auth/email-already-in-use': return 'Este e-mail já está a ser utilizado.';
            case 'auth/weak-password': return 'A senha deve ter pelo menos 6 caracteres.';
            default: return 'Ocorreu um erro. Por favor, tente novamente.';
        }
    };
    return (<div className="flex items-center justify-center min-h-screen bg-gray-200"><div className="w-full max-w-md p-8 space-y-8 bg-[#991B1B] rounded-2xl shadow-lg"><div className="flex flex-col items-center"><img src="https://firebasestorage.googleapis.com/v0/b/cad-prestadores---heberlog.appspot.com/o/Logos%2FPrancheta%208.png?alt=media&token=b1ccc570-7210-48b6-b4a3-e01074bca3be" alt="Logo Tenda Church" className="h-16 mb-6" /></div><form className="mt-8 space-y-6"><div className="space-y-4 rounded-md"><div><label htmlFor="email-address" className="sr-only">Email</label><input id="email-address" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="relative block w-full px-3 py-3 text-white placeholder-gray-300 bg-white/20 border border-transparent rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-white sm:text-sm" placeholder="E-mail" /></div><div><label htmlFor="password" className="sr-only">Senha</label><input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="relative block w-full px-3 py-3 text-white placeholder-gray-300 bg-white/20 border border-transparent rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-white sm:text-sm" placeholder="Senha" /></div></div>{error && <p className="text-sm text-center text-white bg-red-500/50 p-2 rounded-md">{error}</p>}<div className="space-y-3"><button onClick={handleLogin} disabled={isSubmitting} className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-[#991B1B] bg-white border border-transparent rounded-md group hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#991B1B] focus:ring-white disabled:bg-gray-300 disabled:text-gray-500">{isSubmitting ? 'A entrar...' : 'Entrar'}</button><button onClick={handleCreateAccount} disabled={isSubmitting} className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-white bg-white/20 border border-transparent rounded-md group hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#991B1B] focus:ring-white disabled:bg-opacity-50">{isSubmitting ? 'A criar...' : 'Criar Conta'}</button></div></form></div></div>);
};

export default function App() {
    const [user, setUser] = useState(null); const [isAdmin, setIsAdmin] = useState(false); const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [allMembers, setAllMembers] = useState([]); const [allConnects, setAllConnects] = useState([]); const [allCourses, setAllCourses] = useState([]);
    const [leaderConnects, setLeaderConnects] = useState([]); const [taughtCourses, setTaughtCourses] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isMemberModalOpen, setMemberModalOpen] = useState(false); const [isConnectModalOpen, setConnectModalOpen] = useState(false); const [isCourseModalOpen, setCourseModalOpen] = useState(false); const [isManageCourseModalOpen, setManageCourseModalOpen] = useState(false);
    const [isReportModalOpen, setReportModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null); const [editingConnect, setEditingConnect] = useState(null); const [editingCourse, setEditingCourse] = useState(null); const [managingCourse, setManagingCourse] = useState(null);
    const [reportingConnect, setReportingConnect] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false); const [deleteAction, setDeleteAction] = useState(null);

    useEffect(() => { const unsubscribe = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); setIsAdmin(currentUser?.email === ADMIN_EMAIL); setIsLoadingAuth(false); }); return () => unsubscribe(); }, []);
    useEffect(() => { if (!user) { setAllConnects([]); setAllMembers([]); setAllCourses([]); return; } setLoadingData(true); const unsubs = [onSnapshot(collection(db, `artifacts/${appId}/public/data/connects`), (s) => setAllConnects(s.docs.map(d => ({ id: d.id, ...d.data() })))), onSnapshot(collection(db, `artifacts/${appId}/public/data/members`), (s) => setAllMembers(s.docs.map(d => ({ id: d.id, ...d.data() })))), onSnapshot(collection(db, `artifacts/${appId}/public/data/courses`), (s) => setAllCourses(s.docs.map(d => ({ id: d.id, ...d.data() })))) ]; Promise.all([getDocs(collection(db, `artifacts/${appId}/public/data/connects`)), getDocs(collection(db, `artifacts/${appId}/public/data/members`)), getDocs(collection(db, `artifacts/${appId}/public/data/courses`))]).finally(() => setLoadingData(false)); return () => unsubs.forEach(unsub => unsub()); }, [user]);
    useEffect(() => { if (user && !isAdmin) { const userEmail = user.email?.toLowerCase(); setLeaderConnects(allConnects.filter(c => c.leaderEmail?.toLowerCase() === userEmail)); setTaughtCourses(allCourses.filter(c => c.teacherEmail?.toLowerCase() === userEmail)); } else { setLeaderConnects([]); setTaughtCourses([]); } }, [user, isAdmin, allConnects, allCourses]);

    const handleLogout = async () => { await signOut(auth); };
    const MemberForm = ({ onClose, onSave, connects, editingMember, isAdmin, leaderConnects }) => {
        const [formData, setFormData] = useState({ name: editingMember?.name || '', dob: editingMember?.dob || '', email: editingMember?.email || '', address: editingMember?.address || '', phone: editingMember?.phone || '', gender: editingMember?.gender || '', connectId: editingMember?.connectId || '', });
        const [error, setError] = useState(''); const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
        const handleSubmit = (e) => { e.preventDefault(); if (!formData.name || !formData.dob || !formData.phone || !formData.gender || !formData.email) { setError('Todos os campos, exceto Connect, são obrigatórios.'); return; } if (!isAdmin && !formData.connectId) { setError('Líderes devem obrigatoriamente designar um Connect para o membro.'); return; } onSave(formData); onClose(); };
        const availableConnects = isAdmin ? connects : leaderConnects;
        return ( <form onSubmit={handleSubmit} className="space-y-4"> <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingMember ? 'Editar Membro' : 'Novo Membro'}</h2> {error && <p className="text-red-600 bg-red-100 p-2 rounded-md">{error}</p>} <div><label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label><input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" placeholder="Nome completo" /></div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <div><label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label><input type="date" name="dob" id="dob" value={formData.dob} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" /></div> <div><label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label><input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" placeholder="email@exemplo.com" /></div> </div> <div><label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Endereço</label><input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" placeholder="Rua, Número, Bairro, Cidade" /></div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Celular</label><input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" placeholder="(99) 99999-9999" /></div><div><label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Sexo</label><select name="gender" id="gender" value={formData.gender} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]"><option value="">Selecione...</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option></select></div></div> <div><label htmlFor="connectId" className="block text-sm font-medium text-gray-700 mb-1">Connect</label><select name="connectId" id="connectId" value={formData.connectId} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]"><option value="">{isAdmin ? "Nenhum" : "Selecione um Connect"}</option>{availableConnects.map(connect => (<option key={connect.id} value={connect.id}>{connect.number} - {connect.name}</option>))}</select></div> <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all">Cancelar</button><button type="submit" className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all">{editingMember ? 'Salvar Alterações' : 'Adicionar Membro'}</button></div> </form> );
    };
    const LoadingSpinner = () => (<div className="flex items-center justify-center min-h-screen bg-gray-100"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-[#DC2626]"></div></div>);
    const handleSaveConnect = async (connectData) => { const collectionPath = `artifacts/${appId}/public/data/connects`; try { let connectId = editingConnect?.id; if (editingConnect) { await setDoc(doc(db, collectionPath, connectId), connectData); } else { const q = query(collection(db, collectionPath), where("number", "==", connectData.number)); const querySnapshot = await getDocs(q); if (!querySnapshot.empty) { alert("Já existe um Connect com este número."); return; } const newDocRef = await addDoc(collection(db, collectionPath), connectData); connectId = newDocRef.id; } const leaderRef = doc(db, `artifacts/${appId}/public/data/members`, connectData.leaderId); await updateDoc(leaderRef, { connectId: connectId }); closeConnectModal(); } catch (error) { console.error("Erro ao salvar connect:", error); } };
    const handleSaveMember = async (memberData) => { const collectionPath = `artifacts/${appId}/public/data/members`; try { if (editingMember) { await setDoc(doc(db, collectionPath, editingMember.id), memberData); } else { await addDoc(collection(db, collectionPath), memberData); } closeMemberModal(); } catch (error) { console.error("Erro ao salvar membro:", error); } };
    const generateAttendanceRecords = async (courseId, courseData) => { const batch = writeBatch(db); const targetDay = weekDaysMap[courseData.classDay]; let currentDate = new Date(courseData.startDate + 'T00:00:00'); const endDate = new Date(courseData.endDate + 'T00:00:00'); while (currentDate <= endDate) { if (currentDate.getUTCDay() === targetDay) { const dateString = currentDate.toISOString().split('T')[0]; const attendanceRef = doc(db, `artifacts/${appId}/public/data/courses/${courseId}/attendance`, dateString); const initialStatuses = courseData.students.reduce((acc, student) => { acc[student.id] = 'pendente'; return acc; }, {}); batch.set(attendanceRef, { date: currentDate, statuses: initialStatuses }); } currentDate.setDate(currentDate.getDate() + 1); } await batch.commit(); };
    const handleSaveCourse = async (courseData) => { const collectionPath = `artifacts/${appId}/public/data/courses`; try { if (editingCourse) { await setDoc(doc(db, collectionPath, editingCourse.id), courseData); } else { const newCourseRef = await addDoc(collection(db, collectionPath), courseData); await generateAttendanceRecords(newCourseRef.id, courseData); } closeCourseModal(); } catch (error) { console.error("Erro ao salvar curso:", error); } };
    const handleSaveCourseStudents = async (courseId, students) => { const courseRef = doc(db, `artifacts/${appId}/public/data/courses`, courseId); try { await updateDoc(courseRef, { students: students }); } catch (error) { console.error("Erro ao salvar alunos do curso:", error); } };
    const handleSaveAttendance = async (courseId, dateId, statuses) => { const attendanceRef = doc(db, `artifacts/${appId}/public/data/courses/${courseId}/attendance`, dateId); try { await updateDoc(attendanceRef, { statuses: statuses }); } catch (error) { console.error("Erro ao salvar presença:", error); } };
    
    const handleSaveConnectReport = async (reportData) => {
        const dateString = reportData.reportDate.toISOString().split('T')[0];
        const reportId = `${reportData.connectId}_${dateString}`;
        const reportRef = doc(db, `artifacts/${appId}/public/data/connect_reports`, reportId);
        try {
            await setDoc(reportRef, reportData);
        } catch (error) {
            console.error("Erro ao salvar relatório do Connect:", error);
        }
    };

    const triggerDelete = (type, id) => { let message = `Tem certeza que deseja excluir este ${type}?`; setDeleteAction({ type, id, message }); setConfirmModalOpen(true); };
    const handleConfirmDelete = async () => { if (!deleteAction) return; const { type, id } = deleteAction; try { await deleteDoc(doc(db, `artifacts/${appId}/public/data/${type}s`, id)); } catch (error) { console.error(`Erro ao deletar ${type}:`, error); } finally { setConfirmModalOpen(false); setDeleteAction(null); } };
    const openMemberModal = (member = null) => { setEditingMember(member); setMemberModalOpen(true); }; const closeMemberModal = () => { setEditingMember(null); setMemberModalOpen(false); }; const openConnectModal = (connect = null) => { setEditingConnect(connect); setConnectModalOpen(true); }; const closeConnectModal = () => { setEditingConnect(null); setConnectModalOpen(false); }; const openCourseModal = (course = null) => { setEditingCourse(course); setCourseModalOpen(true); }; const closeCourseModal = () => { setEditingCourse(null); setCourseModalOpen(false); };
    const openManageCourseModal = (course) => { setManagingCourse(course); setManageCourseModalOpen(true); };
    const closeManageCourseModal = () => { setManagingCourse(null); setManageCourseModalOpen(false); };
    const openReportModal = (connect) => { setReportingConnect(connect); setReportModalOpen(true); };
    const closeReportModal = () => { setReportingConnect(null); setReportModalOpen(false); };

    const displayedConnects = isAdmin ? allConnects : leaderConnects; const leaderConnectIds = leaderConnects.map(c => c.id); const displayedMembers = isAdmin ? allMembers : allMembers.filter(m => leaderConnectIds.includes(m.connectId)); const displayedCourses = isAdmin ? allCourses : taughtCourses;
    const filteredMembers = displayedMembers.filter(member => member.name.toLowerCase().includes(searchTerm.toLowerCase())); const getConnectName = useCallback((connectId) => { if (!connectId) return 'Sem Connect'; const connect = allConnects.find(c => c.id === connectId); return connect ? `${connect.number} - ${connect.name}` : '...'; }, [allConnects]);

    if (isLoadingAuth) { return <LoadingSpinner />; } if (!user) { return <LoginPage />; }
    return (
        <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
            <Header onLogout={handleLogout} />
            <main className="p-4 md:p-8">
                <Modal isOpen={isMemberModalOpen} onClose={closeMemberModal}><MemberForm onClose={closeMemberModal} onSave={handleSaveMember} connects={allConnects} editingMember={editingMember} isAdmin={isAdmin} leaderConnects={leaderConnects} /></Modal>
                <Modal isOpen={isConnectModalOpen} onClose={closeConnectModal}><ConnectForm onClose={closeConnectModal} onSave={handleSaveConnect} members={allMembers} editingConnect={editingConnect} /></Modal>
                <Modal isOpen={isCourseModalOpen} onClose={closeCourseModal} size="2xl"><CourseForm onClose={closeCourseModal} onSave={handleSaveCourse} members={allMembers} editingCourse={editingCourse} /></Modal>
                {reportingConnect && <ConnectReportModal isOpen={isReportModalOpen} onClose={closeReportModal} connect={reportingConnect} members={allMembers} onSave={handleSaveConnectReport} />}
                {managingCourse && <ManageCourseModal course={managingCourse} members={allMembers} isOpen={isManageCourseModalOpen} onClose={closeManageCourseModal} onSaveStudents={(students) => handleSaveCourseStudents(managingCourse.id, students)} onSaveAttendance={(dateId, statuses) => handleSaveAttendance(managingCourse.id, dateId, statuses)} />}
                <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setConfirmModalOpen(false)} onConfirm={handleConfirmDelete} title="Confirmar Exclusão" message={deleteAction?.message || ''} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-md"><div className="flex items-center space-x-3 mb-2"><Users size={28} className="text-[#DC2626]" /><h2 className="text-2xl font-bold text-gray-900">Membros</h2></div><p className="text-gray-600">Total de membros visíveis.</p><p className="text-4xl font-black text-gray-800 mt-4">{displayedMembers.length}</p><button onClick={() => openMemberModal()} className="mt-4 w-full bg-[#DC2626] hover:bg-[#991B1B] text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all"><Plus size={20} /><span>Adicionar Membro</span></button></div>
                    <div className="bg-white p-6 rounded-xl shadow-md"><div className="flex items-center space-x-3 mb-2"><Home size={28} className="text-[#DC2626]" /><h2 className="text-2xl font-bold text-gray-900">Connects</h2></div><p className="text-gray-600">Total de Connects visíveis.</p><p className="text-4xl font-black text-gray-800 mt-4">{displayedConnects.length}</p>{isAdmin && <button onClick={() => openConnectModal()} className="mt-4 w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all"><Plus size={20} /><span>Adicionar Connect</span></button>}</div>
                    <div className="bg-white p-6 rounded-xl shadow-md"><div className="flex items-center space-x-3 mb-2"><BookOpen size={28} className="text-[#DC2626]" /><h2 className="text-2xl font-bold text-gray-900">Cursos</h2></div><p className="text-gray-600">Total de Cursos visíveis.</p><p className="text-4xl font-black text-gray-800 mt-4">{displayedCourses.length}</p>{isAdmin && <button onClick={() => openCourseModal()} className="mt-4 w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all"><Plus size={20} /><span>Adicionar Curso</span></button>}</div>
                </div>
                
                <div className="mb-8"><h3 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">Cursos</h3>
                    {loadingData ? <LoadingSpinner /> : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{displayedCourses.sort((a, b) => a.name.localeCompare(b.name)).map(c => (<div key={c.id} className="bg-white rounded-lg p-4 shadow-md"><div className="flex justify-between items-start"><h4 className="font-bold text-lg text-[#DC2626]">{c.name}</h4><div className="flex space-x-2">{isAdmin && <button onClick={() => openCourseModal(c)} className="text-gray-500 hover:text-[#DC2626]"><Edit size={16}/></button>}{isAdmin && <button onClick={() => triggerDelete('course', c.id)} className="text-gray-500 hover:text-red-600"><Trash2 size={16}/></button>}</div></div><p className="text-gray-600 mt-2 flex items-center"><GraduationCap size={14} className="inline mr-2"/>Professor: {c.teacherName}</p><p className="text-gray-600"><Calendar size={14} className="inline mr-2"/>{new Date(c.startDate).toLocaleDateString()} a {new Date(c.endDate).toLocaleDateString()}</p><p className="text-gray-600"><Users size={14} className="inline mr-2"/>{c.students?.length || 0} alunos</p><button onClick={()=>openManageCourseModal(c)} className="mt-4 w-full text-sm bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition-all"><ClipboardList size={16}/><span>Presença e Notas</span></button></div>))}</div>)}
                </div>

                <div className="mb-8"><h3 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">Connects</h3>
                    {loadingData ? <LoadingSpinner /> : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{displayedConnects.sort((a, b) => a.number - b.number).map(c => (<div key={c.id} className="bg-white rounded-lg p-4 shadow-md"><div className="flex justify-between items-start"><h4 className="font-bold text-lg text-[#DC2626]">Connect {c.number}</h4><div className="flex space-x-2"><button onClick={() => openReportModal(c)} className="text-gray-500 hover:text-blue-600" title="Relatório de Presença"><ClipboardList size={16}/></button><button onClick={() => openConnectModal(c)} className="text-gray-500 hover:text-[#DC2626]"><Edit size={16}/></button>{isAdmin && <button onClick={() => triggerDelete('connect', c.id)} className="text-gray-500 hover:text-red-600"><Trash2 size={16}/></button>}</div></div><p className="text-gray-800 text-xl font-semibold">{c.name}</p><p className="text-gray-600 mt-2"><User size={14} className="inline mr-2"/>Líder: {c.leaderName}</p><p className="text-gray-600"><Mail size={14} className="inline mr-2"/>{c.leaderEmail}</p><p className="text-gray-600"><Calendar size={14} className="inline mr-2"/>{c.weekday}</p><p className="text-gray-600"><Clock size={14} className="inline mr-2"/>{c.time}</p><p className="text-gray-600"><MapPin size={14} className="inline mr-2"/>{c.address}</p></div>))}</div>)}
                </div>

                <div><h3 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">Membros</h3>
                    <div className="mb-4"><input type="text" placeholder="Buscar membro pelo nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-md bg-white text-gray-900 rounded-md p-3 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]" /></div>
                    {loadingData ? <LoadingSpinner /> : (
                        <div className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 border-b border-gray-200"><tr><th className="p-3 text-sm font-semibold text-gray-600">Nome</th><th className="p-3 text-sm font-semibold text-gray-600 hidden md:table-cell">E-mail</th><th className="p-3 text-sm font-semibold text-gray-600 hidden lg:table-cell">Connect</th><th className="p-3 text-sm font-semibold text-gray-600">Ações</th></tr></thead><tbody className="divide-y divide-gray-200">{filteredMembers.map(member => (<tr key={member.id} className="hover:bg-gray-50 transition-colors"><td className="p-3"><div className="font-bold text-gray-800">{member.name}</div><div className="text-gray-500 text-sm md:hidden">{member.email}</div></td><td className="p-3 text-gray-600 hidden md:table-cell">{member.email}</td><td className="p-3 text-gray-600 hidden lg:table-cell">{getConnectName(member.connectId)}</td><td className="p-3"><div className="flex items-center space-x-3"><button onClick={() => openMemberModal(member)} className="text-gray-500 hover:text-[#DC2626]"><Edit size={18}/></button><button onClick={() => triggerDelete('member', member.id)} className="text-gray-500 hover:text-red-600"><Trash2 size={18}/></button></div></td></tr>))}</tbody></table></div></div>
                    )}
                </div>
            </main>
        </div>
    );
}
