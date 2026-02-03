import React, { useState, useEffect } from 'react';

const CourseTemplateForm = ({ onClose, onSave, editingTemplate }) => {
    const initialData = {
        name: '',
        assessment: { tests: { count: 0, value: 0 }, activities: { count: 0, value: 0 }, assignments: { count: 0, value: 0 } },
        passingCriteria: { minGrade: 7, minAttendance: 75 },
        lessonsCount: 0,
        lessonPlan: [] // [{ activityIndex, testIndex, assignmentIndex, notes, considerAttendance }]
    };

    const [formData, setFormData] = useState(initialData);
    const [error, setError] = useState('');

    useEffect(() => {
        if (editingTemplate) {
            setFormData({
                name: editingTemplate.name || '',
                assessment: {
                    tests: editingTemplate.assessment?.tests || initialData.assessment.tests,
                    assignments: editingTemplate.assessment?.assignments || initialData.assessment.assignments,
                    activities: {
                        count: editingTemplate.assessment?.activities?.count || 0,
                        value: editingTemplate.assessment?.activities?.value || 0
                    }
                },
                passingCriteria: editingTemplate.passingCriteria || initialData.passingCriteria,
                lessonsCount: editingTemplate.lessonsCount || 0,
                lessonPlan: Array.isArray(editingTemplate.lessonPlan) ? editingTemplate.lessonPlan : [],
            });
        } else {
            setFormData(initialData);
        }
    }, [editingTemplate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAssessmentChange = (type, field, value) => {
        setFormData(prev => ({ ...prev, assessment: { ...prev.assessment, [type]: { ...prev.assessment[type], [field]: Number(value) || 0 } } }));
    };

    const ensureLessonPlanSize = (count) => {
        const c = Number(count) || 0;
        const prev = formData.lessonPlan || [];
        const next = Array.from({ length: c }, (_, i) => prev[i] || { activityIndex: null, testIndex: null, assignmentIndex: null, notes: '', considerAttendance: true });
        setFormData(prevData => ({ ...prevData, lessonsCount: c, lessonPlan: next }));
    };

    const handleLessonPlanSelect = (rowIndex, field, value) => {
        const numericFields = ['activityIndex', 'testIndex', 'assignmentIndex'];
        const parsed = numericFields.includes(field) ? (value ? Number(value) : null) : (field === 'considerAttendance' ? Boolean(value) : value);
        setFormData(prev => {
            const plan = [...(prev.lessonPlan || [])];
            const base = { activityIndex: null, testIndex: null, assignmentIndex: null, notes: '', considerAttendance: true };
            plan[rowIndex] = { ...(plan[rowIndex] || base), [field]: parsed };
            return { ...prev, lessonPlan: plan };
        });
    };

    const handlePassingChange = (field, value) => {
        setFormData(prev => ({ ...prev, passingCriteria: { ...prev.passingCriteria, [field]: Number(value) || 0 } }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name) {
            setError('O nome do modelo é obrigatório.');
            return;
        }
        // Validação do plano de aula (opcional)
        if (formData.lessonsCount > 0) {
            const lp = formData.lessonPlan || [];
            if (lp.length !== formData.lessonsCount) {
                setError('O Plano de Aula não está consistente com a quantidade de aulas.');
                return;
            }
            const acMax = formData.assessment.activities.count || 0;
            const tsMax = formData.assessment.tests.count || 0;
            const asMax = formData.assessment.assignments.count || 0;
            const invalidSelection = lp.some(row => (
                (row.activityIndex && row.activityIndex > acMax) ||
                (row.testIndex && row.testIndex > tsMax) ||
                (row.assignmentIndex && row.assignmentIndex > asMax)
            ));
            if (invalidSelection) {
                setError('Algumas seleções do Plano de Aula excedem as quantidades definidas em Provas/Trabalhos/Atividades.');
                return;
            }
        }
        onSave({
            ...formData,
            // Garantir que não salvamos mais o campo CSV de plano de atividades
            assessment: {
                ...formData.assessment,
                activities: { count: formData.assessment.activities.count || 0, value: formData.assessment.activities.value || 0 }
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
            <div className="flex-shrink-0">
                {error && <p className="text-red-600 bg-red-100 p-2 rounded-md mb-4">{error}</p>}
            </div>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome do Modelo</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border" placeholder="Ex: Fundamentos da Fé" />
                </div>
                <fieldset className="border p-4 rounded-md">
                    <legend className="px-2 font-semibold">Estrutura de Avaliação (Total: 10 Pontos)</legend>
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
                    {/* Campo de plano de atividades (CSV) removido conforme solicitação */}
                </fieldset>
                <fieldset className="border p-4 rounded-md">
                    <legend className="px-2 font-semibold">Plano de Aula</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Aulas</label>
                            <input type="number" min="0" value={formData.lessonsCount || 0} onChange={(e)=>ensureLessonPlanSize(e.target.value)} className="w-full bg-gray-100 rounded-md p-2 border" />
                            <p className="text-xs text-gray-500 mt-1">Se houver aulas definidas aqui, ao criar uma turma pode-se gerar presença sem informar data de término.</p>
                        </div>
                    </div>
                    {formData.lessonsCount > 0 && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left">
                                        <th className="p-2">Aula</th>
                                        {formData.assessment.activities.count > 0 && <th className="p-2">Ativ</th>}
                                        {formData.assessment.tests.count > 0 && <th className="p-2">Prova</th>}
                                        {formData.assessment.assignments.count > 0 && <th className="p-2">Trab</th>}
                                        <th className="p-2">Anotações</th>
                                        <th className="p-2">Presença</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: formData.lessonsCount }, (_, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="p-2">Aula {idx+1}</td>
                                            {formData.assessment.activities.count > 0 && (
                                                <td className="p-2">
                                                    <select value={formData.lessonPlan?.[idx]?.activityIndex || ''} onChange={(e)=>handleLessonPlanSelect(idx,'activityIndex', e.target.value)} className="bg-gray-100 rounded-md p-1 border w-14 md:w-16 text-sm">
                                                        <option value="">—</option>
                                                        {Array.from({length: formData.assessment.activities.count}, (_,i)=> (
                                                            <option key={i+1} value={i+1}>A{i+1}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            )}
                                            {formData.assessment.tests.count > 0 && (
                                                <td className="p-2">
                                                    <select value={formData.lessonPlan?.[idx]?.testIndex || ''} onChange={(e)=>handleLessonPlanSelect(idx,'testIndex', e.target.value)} className="bg-gray-100 rounded-md p-1 border w-14 md:w-16 text-sm">
                                                        <option value="">—</option>
                                                        {Array.from({length: formData.assessment.tests.count}, (_,i)=> (
                                                            <option key={i+1} value={i+1}>P{i+1}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            )}
                                            {formData.assessment.assignments.count > 0 && (
                                                <td className="p-2">
                                                    <select value={formData.lessonPlan?.[idx]?.assignmentIndex || ''} onChange={(e)=>handleLessonPlanSelect(idx,'assignmentIndex', e.target.value)} className="bg-gray-100 rounded-md p-1 border w-14 md:w-16 text-sm">
                                                        <option value="">—</option>
                                                        {Array.from({length: formData.assessment.assignments.count}, (_,i)=> (
                                                            <option key={i+1} value={i+1}>T{i+1}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            )}
                                            <td className="p-2">
                                                <textarea 
                                                    value={formData.lessonPlan?.[idx]?.notes || ''}
                                                    onChange={(e)=>handleLessonPlanSelect(idx,'notes', e.target.value)}
                                                    onInput={(e)=>{e.target.style.height='auto'; e.target.style.height = `${e.target.scrollHeight}px`;}}
                                                    rows={1}
                                                    className="bg-gray-100 rounded-md p-2 border w-full text-sm leading-tight resize-y"
                                                    placeholder="Conteúdo abordado, observações..."
                                                />
                                            </td>
                                            <td className="p-2">
                                                <div className="flex justify-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={(formData.lessonPlan?.[idx]?.considerAttendance ?? true)} 
                                                        onChange={(e)=>handleLessonPlanSelect(idx,'considerAttendance', e.target.checked)} 
                                                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" 
                                                        title="Presença"
                                                        aria-label="Presença"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </fieldset>
                <fieldset className="border p-4 rounded-md">
                    <legend className="px-2 font-semibold">Critérios de Aprovação</legend>
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
                <button type="submit" className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 transition-all">Salvar Modelo</button>
            </div>
        </form>
    );
};

export default CourseTemplateForm;