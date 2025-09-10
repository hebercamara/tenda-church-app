import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useLoadingState } from '../hooks/useLoadingState';
import LoadingButton from './LoadingButton';
import { formatDateForInput, formatDateToBrazilian, convertBrazilianDateToISO } from '../utils/dateUtils';

const weekDaysMap = { "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3, "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6 };

const CourseForm = ({ onClose, onSave, members, allCourseTemplates, editingCourse }) => {
    const { isAdmin } = useAuthStore();
    const { isLoading, setLoading } = useLoadingState();
    
    const initialFormData = {
        name: '', teacherId: '', startDate: '', endDate: '', classDay: '', classTime: '',
        assessment: { tests: { count: 0, value: 0 }, activities: { count: 0, value: 0 }, assignments: { count: 0, value: 0 } },
        passingCriteria: { minGrade: 7, minAttendance: 75 },
        templateId: '', isExtra: false,
    };

    const [formData, setFormData] = useState(initialFormData);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [selectedTemplateName, setSelectedTemplateName] = useState('');

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
                if (!value) errors.endDate = 'Data de término é obrigatória';
                else if (formData.startDate && value < formData.startDate) {
                    errors.endDate = 'Data de término deve ser posterior à data de início';
                }
                break;
            case 'classDay':
                if (!value) errors.classDay = 'Dia da aula é obrigatório';
                break;
            case 'classTime':
                if (!value) errors.classTime = 'Horário é obrigatório';
                break;
        }
        
        return errors;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : value;
        
        // Se for campo de data, converte formato brasileiro para ISO
        if ((name === 'startDate' || name === 'endDate') && value && type !== 'checkbox') {
            val = convertBrazilianDateToISO(value);
        }

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
                assessment: selectedTemplate.assessment,
                passingCriteria: selectedTemplate.passingCriteria,
                isExtra: false,
            }));
        } else {
            setFormData(prev => ({ ...prev, ...initialFormData, isExtra: prev.isExtra }));
            setSelectedTemplateName('');
        }
    };

    const handleAssessmentChange = (type, field, value) => {
        setFormData(prev => ({ ...prev, assessment: { ...prev.assessment, [type]: { ...prev.assessment[type], [field]: Number(value) || 0 } } }));
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
            const requiredFields = ['name', 'teacherId', 'startDate', 'endDate', 'classDay', 'classTime'];
            
            requiredFields.forEach(field => {
                const fieldError = validateField(field, formData[field]);
                Object.assign(allErrors, fieldError);
            });
            
            // Validação específica do professor
            const teacher = members.find(m => m.id === formData.teacherId);
            if (formData.teacherId && !teacher?.email) {
                allErrors.teacherId = 'O professor selecionado precisa ter um e-mail cadastrado';
            }
            
            if (Object.keys(allErrors).length > 0) {
                setFieldErrors(allErrors);
                setError('Por favor, corrija os erros nos campos destacados.');
                return;
            }
            
            setError('');
            setFieldErrors({});
            await onSave({ ...formData, teacherName: teacher.name, teacherEmail: teacher.email, students: editingCourse?.students || [] });
        } catch (error) {
            setError('Erro ao salvar curso. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const weekDays = Object.keys(weekDaysMap);

    return (
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
            <div className="flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{editingCourse ? 'Editar Turma' : 'Nova Turma'}</h2>
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
                            <select 
                                name="teacherId" 
                                id="teacherId" 
                                value={formData.teacherId} 
                                onChange={handleChange} 
                                className={`w-full bg-gray-100 rounded-md p-2 border focus:ring-2 ${
                                    fieldErrors.teacherId 
                                        ? 'border-red-500 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-[#DC2626]'
                                }`}
                            >
                                <option value="">Selecione um professor</option>
                                {members.map(member => (<option key={member.id} value={member.id}>{member.name}</option>))}
                            </select>
                            {fieldErrors.teacherId && <p className="text-red-600 text-sm mt-1">{fieldErrors.teacherId}</p>}
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
                                     type="text" 
                                     name="startDate" 
                                     id="startDate" 
                                     value={formData.startDate ? formatDateToBrazilian(formData.startDate) : ''} 
                                     onChange={handleChange} 
                                     placeholder="dd/mm/aaaa"
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
                                     type="text" 
                                     name="endDate" 
                                     id="endDate" 
                                     value={formData.endDate ? formatDateToBrazilian(formData.endDate) : ''} 
                                     onChange={handleChange} 
                                     placeholder="dd/mm/aaaa" 
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
    );
};

export default CourseForm;