import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useLoadingState } from '../hooks/useLoadingState';
import LoadingButton from './LoadingButton';
import PersonAutocomplete from './PersonAutocomplete';
import SubstituteTeacherModal from './SubstituteTeacherModal';
import { formatDateForInput, formatDateToBrazilian, convertBrazilianDateToISO } from '../utils/dateUtils';
import { User, Plus, Edit, Trash2, Calendar, Clock } from 'lucide-react';

const weekDaysMap = { "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3, "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6 };

const CourseForm = ({ onClose, onSave, members, allCourseTemplates, editingCourse }) => {
    const { isAdmin } = useAuthStore();
    const { isLoading, setLoading } = useLoadingState();
    
    const initialFormData = {
        name: '', teacherId: '', auxTeacherId: '', startDate: '', endDate: '', classDay: '', classTime: '',
        assessment: { tests: { count: 0, value: 0 }, activities: { count: 0, value: 0, plan: [] }, assignments: { count: 0, value: 0 } },
        passingCriteria: { minGrade: 7, minAttendance: 75 },
        templateId: '', isExtra: false,
        substituteTeacher: null, // Novo campo para professor substituto
        lessonsCount: 0,
        lessonPlan: []
    };

    const [formData, setFormData] = useState(initialFormData);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [selectedTemplateName, setSelectedTemplateName] = useState('');
    const [showSubstituteModal, setShowSubstituteModal] = useState(false);
    const [substituteLoading, setSubstituteLoading] = useState(false);

    useEffect(() => {
        if (editingCourse) {
            setFormData({ ...initialFormData, ...editingCourse });
            if (editingCourse.templateId) {
                const template = allCourseTemplates.find(t => t.id === editingCourse.templateId);
                setSelectedTemplateName(template?.name || '');
            }
        } else {
            setFormData(initialFormData);
        }
    }, [editingCourse, allCourseTemplates]);

    // Efeito para gerar o nome da turma automaticamente
    useEffect(() => {
        if (!editingCourse && !formData.isExtra && selectedTemplateName && formData.startDate) {
            const date = new Date(formData.startDate + 'T12:00:00Z');
            const month = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
            const year = date.getFullYear().toString().slice(-2);
            const generatedName = `${selectedTemplateName} - ${month}/${year}`;
            setFormData(prev => ({ ...prev, name: generatedName }));
        }
    }, [selectedTemplateName, formData.startDate, formData.isExtra, editingCourse]);

    const validateField = (name, value) => {
        const errors = {};
        
        switch (name) {
            case 'name':
                if (!value.trim()) errors.name = 'Nome da turma é obrigatório';
                break;
            case 'teacherId':
                if (!value) errors.teacherId = 'Professor é obrigatório';
                break;
            case 'startDate':
                if (!value) errors.startDate = 'Data de início é obrigatória';
                break;
            case 'endDate':
                // endDate só é obrigatória se não houver Plano de Aula (lessonsCount)
                if (!value && (!formData.lessonsCount || formData.lessonsCount <= 0)) errors.endDate = 'Data de término é obrigatória';
                else if (value && formData.startDate && value < formData.startDate) {
                    errors.endDate = 'Data de término deve ser posterior à data de início';
                }
                break;
            case 'classDay':
                if (!value) errors.classDay = 'Dia da aula é obrigatório';
                break;
            case 'classTime':
                if (!value) errors.classTime = 'Horário é obrigatório';
                break;
            case 'auxTeacherId':
                // Auxiliar é opcional; se houver, precisa ter e-mail
                if (value) {
                    const aux = members.find(m => m.id === value);
                    if (!aux?.email) errors.auxTeacherId = 'O auxiliar selecionado precisa ter um e-mail cadastrado';
                }
                break;
        }
        
        return errors;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : value;
        
        // Campos de data agora usam input type="date" e armazenam no formato ISO (yyyy-MM-dd).
        // Não converter durante a digitação para evitar comportamento inesperado.
        // O valor do input já vem no formato correto.
        
        const newFormData = { ...formData, [name]: val };
        if (name === 'isExtra' && checked) {
            newFormData.templateId = '';
            newFormData.name = '';
            newFormData.assessment = initialFormData.assessment;
            newFormData.passingCriteria = initialFormData.passingCriteria;
            setSelectedTemplateName('');
        }

        // Validação da data final
        if (name === 'startDate' && newFormData.endDate && newFormData.endDate < val) {
            newFormData.endDate = ''; // Limpa a data final se for inválida
        }
        
        setFormData(newFormData);
        
        // Validação em tempo real
        const fieldError = validateField(name, val);
        setFieldErrors(prev => ({
            ...prev,
            [name]: fieldError[name] || null
        }));
    };

    const handleTemplateSelect = (templateId) => {
        const selectedTemplate = allCourseTemplates.find(t => t.id === templateId);
        if (selectedTemplate) {
            setSelectedTemplateName(selectedTemplate.name);
            setFormData(prev => ({
                ...prev,
                templateId: templateId,
                name: prev.name, // O nome será gerado pelo useEffect
                assessment: {
                    tests: selectedTemplate.assessment?.tests || prev.assessment.tests,
                    assignments: selectedTemplate.assessment?.assignments || prev.assessment.assignments,
                    activities: {
                        count: selectedTemplate.assessment?.activities?.count || 0,
                        value: selectedTemplate.assessment?.activities?.value || 0,
                        plan: selectedTemplate.assessment?.activities?.plan || []
                    }
                },
                passingCriteria: selectedTemplate.passingCriteria,
                isExtra: false,
                lessonsCount: selectedTemplate.lessonsCount || 0,
                lessonPlan: Array.isArray(selectedTemplate.lessonPlan) ? selectedTemplate.lessonPlan : [],
            }));
        } else {
            setFormData(prev => ({ ...prev, ...initialFormData, isExtra: prev.isExtra }));
            setSelectedTemplateName('');
        }
    };

    const handleAssessmentChange = (type, field, value) => {
        if (type === 'activities' && field === 'plan') {
            const planArray = (value || '')
                .split(',')
                .map(v => Number(String(v).trim()))
                .filter(n => Number.isInteger(n) && n > 0);
            setFormData(prev => ({
                ...prev,
                assessment: {
                    ...prev.assessment,
                    activities: { ...prev.assessment.activities, plan: planArray }
                }
            }));
            return;
        }
        setFormData(prev => ({ ...prev, assessment: { ...prev.assessment, [type]: { ...prev.assessment[type], [field]: Number(value) || 0 } } }));
    };

    const ensureLessonPlanSize = (count) => {
        const c = Number(count) || 0;
        const prev = formData.lessonPlan || [];
        const next = Array.from({ length: c }, (_, i) => prev[i] || { activityIndex: null, testIndex: null, assignmentIndex: null, notes: '' });
        setFormData(prevData => ({ ...prevData, lessonsCount: c, lessonPlan: next }));
    };

    const handleLessonPlanSelect = (rowIndex, field, value) => {
        const numericFields = ['activityIndex', 'testIndex', 'assignmentIndex'];
        const parsed = numericFields.includes(field) ? (value ? Number(value) : null) : value;
        setFormData(prev => {
            const plan = [...(prev.lessonPlan || [])];
            plan[rowIndex] = { ...(plan[rowIndex] || { activityIndex: null, testIndex: null, assignmentIndex: null, notes: '' }), [field]: parsed };
            return { ...prev, lessonPlan: plan };
        });
    };

    const handlePassingChange = (field, value) => {
        setFormData(prev => ({ ...prev, passingCriteria: { ...prev.passingCriteria, [field]: Number(value) || 0 } }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // Validação completa
            const allErrors = {};
            const requiredFields = ['name', 'teacherId', 'startDate', 'classDay', 'classTime'];
            if (!formData.lessonsCount || formData.lessonsCount <= 0) requiredFields.push('endDate');
            
            requiredFields.forEach(field => {
                const fieldError = validateField(field, formData[field]);
                Object.assign(allErrors, fieldError);
            });
            
            // Validação específica do professor
            const teacher = members.find(m => m.id === formData.teacherId);
            if (formData.teacherId && !teacher?.email) {
                allErrors.teacherId = 'O professor selecionado precisa ter um e-mail cadastrado';
            }

            // Validação do auxiliar (se definido)
            let auxTeacher = null;
            if (formData.auxTeacherId) {
                auxTeacher = members.find(m => m.id === formData.auxTeacherId);
                if (!auxTeacher?.email) {
                    allErrors.auxTeacherId = 'O auxiliar selecionado precisa ter um e-mail cadastrado';
                }
                // Auxiliar deve ser aluno matriculado na turma
                const enrolledIds = (editingCourse?.students || []).map(s => s.id);
                if (!enrolledIds.includes(formData.auxTeacherId)) {
                    allErrors.auxTeacherId = 'O auxiliar deve ser um aluno matriculado nesta turma';
                }
            }
            
            if (Object.keys(allErrors).length > 0) {
                setFieldErrors(allErrors);
                setError('Por favor, corrija os erros nos campos destacados.');
                return;
            }
            
            setError('');
            setFieldErrors({});
            await onSave({
                ...formData,
                teacherName: teacher.name,
                teacherEmail: teacher.email,
                // Persistir dados do Auxiliar
                auxTeacherId: formData.auxTeacherId || '',
                auxTeacherName: auxTeacher?.name || '',
                auxTeacherEmail: auxTeacher?.email || '',
                students: editingCourse?.students || []
            });
        } catch (error) {
            setError('Erro ao salvar curso. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubstituteSave = async (substituteData) => {
        setSubstituteLoading(true);
        try {
            setFormData(prev => ({ ...prev, substituteTeacher: substituteData }));
            setShowSubstituteModal(false);
        } catch (error) {
            console.error('Erro ao salvar professor substituto:', error);
        } finally {
            setSubstituteLoading(false);
        }
    };

    const handleRemoveSubstitute = () => {
        setFormData(prev => ({ ...prev, substituteTeacher: null }));
    };

    const isSubstituteActive = () => {
        if (!formData.substituteTeacher) return false;
        
        const today = new Date();
        const startDate = new Date(formData.substituteTeacher.startDate);
        const endDate = formData.substituteTeacher.endDate ? new Date(formData.substituteTeacher.endDate) : null;
        
        if (formData.substituteTeacher.isIndefinite) {
            return today >= startDate;
        }
        
        return today >= startDate && (!endDate || today <= endDate);
    };

    // Alunos matriculados para restringir a seleção de Auxiliar de Professor
    const hasEnrolledStudents = Array.isArray(editingCourse?.students) && editingCourse.students.length > 0;
    const auxOptions = hasEnrolledStudents
        ? members
            .filter(m => editingCourse.students.some(s => s.id === m.id))
            .map(member => ({ value: member.id, label: member.name }))
        : [];

    const weekDays = Object.keys(weekDaysMap);

    return (
        <>
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
            <div className="flex-shrink-0">
                {error && <p className="text-red-600 bg-red-100 p-2 rounded-md mb-4">{error}</p>}
            </div>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                <fieldset className="border p-4 rounded-md">
                    <legend className="px-2 font-semibold">1. Definição do Curso</legend>
                    <div className="space-y-2">
                        <select name="templateId" value={formData.templateId} onChange={(e) => handleTemplateSelect(e.target.value)} className="w-full bg-gray-100 rounded-md p-2 border" disabled={formData.isExtra || !!editingCourse}>
                            <option value="">Selecione um modelo de curso...</option>
                            {allCourseTemplates.map(template => ( <option key={template.id} value={template.id}>{template.name}</option> ))}
                        </select>
                        <div className="flex items-center">
                            <input type="checkbox" id="isExtra" name="isExtra" checked={formData.isExtra} onChange={handleChange} disabled={!!editingCourse} className="h-4 w-4 rounded border-gray-300 text-red-600"/>
                            <label htmlFor="isExtra" className="ml-2 block text-sm text-gray-900">É um curso extracurricular?</label>
                        </div>
                        <div>
                           <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome da Turma</label>
                           <input 
                               type="text" 
                               name="name" 
                               value={formData.name} 
                               onChange={handleChange} 
                               placeholder="Selecione um modelo e data de início" 
                               disabled={!formData.isExtra && !editingCourse} 
                               className={`w-full bg-gray-50 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                                   fieldErrors.name 
                                       ? 'border-red-500 focus:ring-red-500' 
                                       : 'border-gray-300 focus:ring-[#DC2626]'
                               }`}
                           />
                           {fieldErrors.name && <p className="text-red-600 text-sm mt-1">{fieldErrors.name}</p>}
                        </div>
                    </div>
                </fieldset>
                
                <fieldset className="border p-4 rounded-md">
                    <legend className="px-2 font-semibold">Detalhes da Turma</legend>
                    <div className="space-y-2">
                        <div>
                            <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 mb-1">Professor</label>
                            <PersonAutocomplete
                                value={formData.teacherId}
                                onChange={(value) => setFormData(prev => ({ ...prev, teacherId: value }))}
                                placeholder="Digite o nome do professor..."
                                options={members.map(member => ({ value: member.id, label: member.name }))}
                                className={fieldErrors.teacherId ? 'border-red-500' : ''}
                            />
                            {fieldErrors.teacherId && <p className="text-red-600 text-sm mt-1">{fieldErrors.teacherId}</p>}
                        </div>
                        {/* Campo de Auxiliar de Professor */}
                        <div>
                            <label htmlFor="auxTeacherId" className="block text-sm font-medium text-gray-700 mb-1">Auxiliar de Professor</label>
                            <PersonAutocomplete
                                value={formData.auxTeacherId}
                                onChange={(value) => setFormData(prev => ({ ...prev, auxTeacherId: value }))}
                                placeholder="Digite o nome do auxiliar..."
                                options={auxOptions}
                                className={fieldErrors.auxTeacherId ? 'border-red-500' : ''}
                                disabled={!hasEnrolledStudents}
                            />
                            {!hasEnrolledStudents && (
                                <p className="text-gray-600 text-sm mt-1">
                                    Seleção disponível apenas para alunos matriculados nesta turma.
                                </p>
                            )}
                            {fieldErrors.auxTeacherId && <p className="text-red-600 text-sm mt-1">{fieldErrors.auxTeacherId}</p>}
                        </div>
                        {/* Campo de Professor Substituto */}
                        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-red-800 flex items-center">
                                    <User className="mr-2" size={18} />
                                    Professor Substituto
                                </h4>
                                {!formData.substituteTeacher && (
                                    <button
                                        type="button"
                                        onClick={() => setShowSubstituteModal(true)}
                                        className="flex items-center px-3 py-1 bg-[#DC2626] text-white rounded-md hover:bg-[#991B1B] transition-all text-sm"
                                    >
                                        <Plus size={16} className="mr-1" />
                                        Adicionar
                                    </button>
                                )}
                            </div>
                            
                            {formData.substituteTeacher ? (
                                <div className="bg-white rounded-md p-3 border">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center mb-2">
                                                <span className="font-medium text-gray-800">
                                                    {formData.substituteTeacher.teacherName}
                                                </span>
                                                {isSubstituteActive() && (
                                                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                        Ativo
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <div className="flex items-center">
                                                    <Calendar size={14} className="mr-1" />
                                                    <span>
                                                        Início: {formatDateToBrazilian(formData.substituteTeacher.startDate)}
                                                        {formData.substituteTeacher.isIndefinite ? (
                                                            <span className="ml-2 flex items-center">
                                                                <Clock size={14} className="mr-1" />
                                                                Prazo indeterminado
                                                            </span>
                                                        ) : (
                                                            ` - Fim: ${formatDateToBrazilian(formData.substituteTeacher.endDate)}`
                                                        )}
                                                    </span>
                                                </div>
                                                <div>
                                                    <strong>Motivo:</strong> {formData.substituteTeacher.reason}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2 ml-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowSubstituteModal(true)}
                                                className="p-1 text-[#DC2626] hover:text-[#991B1B] transition-colors"
                                                title="Editar substituto"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRemoveSubstitute}
                                                className="p-1 text-red-600 hover:text-red-800 transition-colors"
                                                title="Remover substituto"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-red-700 text-sm">
                                    Nenhum professor substituto configurado. Clique em "Adicionar" para definir um substituto temporário.
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="classDay" className="block text-sm font-medium text-gray-700 mb-1">Dia da Aula</label>
                                <select 
                                    name="classDay" 
                                    id="classDay" 
                                    value={formData.classDay} 
                                    onChange={handleChange} 
                                    className={`w-full bg-gray-100 rounded-md p-2 border focus:ring-2 ${
                                        fieldErrors.classDay 
                                            ? 'border-red-500 focus:ring-red-500' 
                                            : 'border-gray-300 focus:ring-[#DC2626]'
                                    }`}
                                >
                                    <option value="">Selecione...</option>
                                    {weekDays.map(day => <option key={day} value={day}>{day}</option>)}
                                </select>
                                {fieldErrors.classDay && <p className="text-red-600 text-sm mt-1">{fieldErrors.classDay}</p>}
                            </div>
                            <div>
                                <label htmlFor="classTime" className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                                <input 
                                    type="time" 
                                    name="classTime" 
                                    id="classTime" 
                                    value={formData.classTime} 
                                    onChange={handleChange} 
                                    className={`w-full bg-gray-100 rounded-md p-2 border focus:ring-2 ${
                                        fieldErrors.classTime 
                                            ? 'border-red-500 focus:ring-red-500' 
                                            : 'border-gray-300 focus:ring-[#DC2626]'
                                    }`} 
                                />
                                {fieldErrors.classTime && <p className="text-red-600 text-sm mt-1">{fieldErrors.classTime}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                 <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Data de Início</label>
                                 <input 
                                     type="date" 
                                     name="startDate" 
                                     id="startDate" 
                                     value={formData.startDate || ''} 
                                     onChange={handleChange} 
                                     className={`w-full bg-gray-100 rounded-md p-2 border focus:ring-2 ${
                                         fieldErrors.startDate 
                                             ? 'border-red-500 focus:ring-red-500' 
                                             : 'border-gray-300 focus:ring-[#DC2626]'
                                     }`} 
                                 />
                                 {fieldErrors.startDate && <p className="text-red-600 text-sm mt-1">{fieldErrors.startDate}</p>}
                             </div>
                            <div>
                                 <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Data de Término</label>
                                 <input 
                                     type="date" 
                                     name="endDate" 
                                     id="endDate" 
                                     value={formData.endDate || ''} 
                                     onChange={handleChange} 
                                     className={`w-full bg-gray-100 rounded-md p-2 border focus:ring-2 ${
                                         fieldErrors.endDate 
                                             ? 'border-red-500 focus:ring-red-500' 
                                             : 'border-gray-300 focus:ring-[#DC2626]'
                                     }`} 
                                 />
                                 {fieldErrors.endDate && <p className="text-red-600 text-sm mt-1">{fieldErrors.endDate}</p>}
                             </div>
                        </div>
                    </div>
                </fieldset>
                
                <fieldset className="border p-4 rounded-md">
                    <legend className="px-2 font-semibold">Estrutura de Avaliação (Editável para esta turma)</legend>
                    <div className="grid grid-cols-3 gap-4 mb-2"><span className="font-medium text-gray-700 text-sm">Tipo</span><span className="font-medium text-gray-700 text-sm">Quantidade</span><span className="font-medium text-gray-700 text-sm">Valor (cada)</span></div>
                    {['tests', 'assignments', 'activities'].map(type => {
                        const typeLabels = { tests: 'Provas', assignments: 'Trabalhos', activities: 'Atividades' };
                        return (
                            <div key={type} className="grid grid-cols-3 gap-4 items-center mb-2">
                                <label className="text-sm">{typeLabels[type]}</label>
                                <input type="number" min="0" value={formData.assessment[type].count} onChange={(e) => handleAssessmentChange(type, 'count', e.target.value)} className="w-full bg-gray-100 rounded-md p-2 border" />
                                <input type="number" min="0" step="0.25" value={formData.assessment[type].value} onChange={(e) => handleAssessmentChange(type, 'value', e.target.value)} className="w-full bg-gray-100 rounded-md p-2 border" />
                            </div>
                        );
                    })}
                </fieldset>
                <fieldset className="border p-4 rounded-md">
                    <legend className="px-2 font-semibold">Plano de Aula (Editável para esta turma)</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Aulas</label>
                            <input type="number" min="0" value={formData.lessonsCount || 0} onChange={(e)=>ensureLessonPlanSize(e.target.value)} className="w-full bg-gray-100 rounded-md p-2 border" />
                            <p className="text-xs text-gray-500 mt-1">Se definido, a geração de presença pode ocorrer sem informar data de término.</p>
                        </div>
                    </div>
                    {formData.lessonsCount > 0 && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left">
                                        <th className="p-2">Aula</th>
                                        {formData.assessment.activities.count > 0 && <th className="p-2">Atividade</th>}
                                        {formData.assessment.tests.count > 0 && <th className="p-2">Prova</th>}
                                        {formData.assessment.assignments.count > 0 && <th className="p-2">Trabalho</th>}
                                        <th className="p-2">Anotações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: formData.lessonsCount }, (_, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="p-2">Aula {idx+1}</td>
                                            {formData.assessment.activities.count > 0 && (
                                                <td className="p-2">
                                                    <select value={formData.lessonPlan?.[idx]?.activityIndex || ''} onChange={(e)=>handleLessonPlanSelect(idx,'activityIndex', e.target.value)} className="bg-gray-100 rounded-md p-2 border w-full">
                                                        <option value="">—</option>
                                                        {Array.from({length: formData.assessment.activities.count}, (_,i)=> (
                                                            <option key={i+1} value={i+1}>A{i+1}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            )}
                                            {formData.assessment.tests.count > 0 && (
                                                <td className="p-2">
                                                    <select value={formData.lessonPlan?.[idx]?.testIndex || ''} onChange={(e)=>handleLessonPlanSelect(idx,'testIndex', e.target.value)} className="bg-gray-100 rounded-md p-2 border w-full">
                                                        <option value="">—</option>
                                                        {Array.from({length: formData.assessment.tests.count}, (_,i)=> (
                                                            <option key={i+1} value={i+1}>P{i+1}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            )}
                                            {formData.assessment.assignments.count > 0 && (
                                                <td className="p-2">
                                                    <select value={formData.lessonPlan?.[idx]?.assignmentIndex || ''} onChange={(e)=>handleLessonPlanSelect(idx,'assignmentIndex', e.target.value)} className="bg-gray-100 rounded-md p-2 border w-full">
                                                        <option value="">—</option>
                                                        {Array.from({length: formData.assessment.assignments.count}, (_,i)=> (
                                                            <option key={i+1} value={i+1}>T{i+1}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            )}
                                            <td className="p-2">
                                                <input type="text" value={formData.lessonPlan?.[idx]?.notes || ''} onChange={(e)=>handleLessonPlanSelect(idx,'notes', e.target.value)} className="bg-gray-100 rounded-md p-2 border w-full" placeholder="Conteúdo abordado, observações..." />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </fieldset>
                <fieldset className="border p-4 rounded-md">
                    <legend className="px-2 font-semibold">Critérios de Aprovação (Editável para esta turma)</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="minGrade" className="block text-sm font-medium text-gray-700 mb-1">Nota Mínima (0 a 10)</label>
                            <input type="number" min="0" max="10" step="0.5" id="minGrade" value={formData.passingCriteria.minGrade} onChange={(e) => handlePassingChange('minGrade', e.target.value)} className="w-full bg-gray-100 rounded-md p-2 border" />
                        </div>
                        <div>
                            <label htmlFor="minAttendance" className="block text-sm font-medium text-gray-700 mb-1">Assiduidade Mínima (%)</label>
                            <input type="number" min="0" max="100" id="minAttendance" value={formData.passingCriteria.minAttendance} onChange={(e) => handlePassingChange('minAttendance', e.target.value)} className="w-full bg-gray-100 rounded-md p-2 border" />
                        </div>
                    </div>
                </fieldset>
            </div>
            <div className="flex-shrink-0 flex justify-end space-x-3 pt-4 border-t mt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all">Cancelar</button>
                <LoadingButton 
                    type="submit" 
                    isLoading={isLoading}
                    className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all"
                >
                    Salvar Turma
                </LoadingButton>
            </div>
        </form>

        {/* Modal de Professor Substituto */}
        <SubstituteTeacherModal
            isOpen={showSubstituteModal}
            onClose={() => setShowSubstituteModal(false)}
            onSave={handleSubstituteSave}
            members={members}
            currentSubstitute={formData.substituteTeacher}
            isLoading={substituteLoading}
        />
        </>
    );
};

export default CourseForm;
