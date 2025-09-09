import React, { useState, useEffect } from 'react';

const CourseTemplateForm = ({ onClose, onSave, editingTemplate }) => {
    const initialData = {
        name: '',
        assessment: { tests: { count: 0, value: 0 }, activities: { count: 0, value: 0 }, assignments: { count: 0, value: 0 } },
        passingCriteria: { minGrade: 7, minAttendance: 75 }
    };

    const [formData, setFormData] = useState(initialData);
    const [error, setError] = useState('');

    useEffect(() => {
        if (editingTemplate) {
            setFormData({
                name: editingTemplate.name || '',
                assessment: editingTemplate.assessment || initialData.assessment,
                passingCriteria: editingTemplate.passingCriteria || initialData.passingCriteria,
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

    const handlePassingChange = (field, value) => {
        setFormData(prev => ({ ...prev, passingCriteria: { ...prev.passingCriteria, [field]: Number(value) || 0 } }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name) {
            setError('O nome do modelo é obrigatório.');
            return;
        }
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
            <div className="flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{editingTemplate ? 'Editar Modelo de Curso' : 'Novo Modelo de Curso'}</h2>
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
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all">Salvar Modelo</button>
            </div>
        </form>
    );
};

export default CourseTemplateForm;