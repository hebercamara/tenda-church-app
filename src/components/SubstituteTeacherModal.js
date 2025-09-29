import React, { useState } from 'react';
import Modal from './Modal';
import PersonAutocomplete from './PersonAutocomplete';
import LoadingButton from './LoadingButton';
import { formatDateToBrazilian, convertBrazilianDateToISO } from '../utils/dateUtils';
import { X, Calendar, Clock, User } from 'lucide-react';

const SubstituteTeacherModal = ({ 
    isOpen, 
    onClose, 
    onSave, 
    members, 
    currentSubstitute = null,
    isLoading = false 
}) => {
    const [formData, setFormData] = useState({
        teacherId: currentSubstitute?.teacherId || '',
        startDate: currentSubstitute?.startDate || '',
        endDate: currentSubstitute?.endDate || '',
        isIndefinite: currentSubstitute?.isIndefinite || false,
        reason: currentSubstitute?.reason || ''
    });
    
    const [fieldErrors, setFieldErrors] = useState({});

    const validateField = (name, value) => {
        const errors = {};
        
        switch (name) {
            case 'teacherId':
                if (!value) errors.teacherId = 'Professor substituto é obrigatório';
                break;
            case 'startDate':
                if (!value) errors.startDate = 'Data de início é obrigatória';
                break;
            case 'endDate':
                if (!formData.isIndefinite && !value) {
                    errors.endDate = 'Data de término é obrigatória quando não for por prazo indeterminado';
                } else if (!formData.isIndefinite && value && formData.startDate && value < formData.startDate) {
                    errors.endDate = 'Data de término deve ser posterior à data de início';
                }
                break;
            case 'reason':
                if (!value.trim()) errors.reason = 'Motivo da substituição é obrigatório';
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
        
        // Se marcar como indeterminado, limpa a data de término
        if (name === 'isIndefinite' && checked) {
            newFormData.endDate = '';
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validação completa
        const allErrors = {};
        const requiredFields = ['teacherId', 'startDate', 'reason'];
        
        if (!formData.isIndefinite) {
            requiredFields.push('endDate');
        }
        
        requiredFields.forEach(field => {
            const fieldError = validateField(field, formData[field]);
            Object.assign(allErrors, fieldError);
        });
        
        if (Object.keys(allErrors).length > 0) {
            setFieldErrors(allErrors);
            return;
        }
        
        // Preparar dados para salvar
        const substituteData = {
            teacherId: formData.teacherId,
            teacherName: members.find(m => m.id === formData.teacherId)?.name || '',
            startDate: formData.startDate,
            endDate: formData.isIndefinite ? null : formData.endDate,
            isIndefinite: formData.isIndefinite,
            reason: formData.reason,
            createdAt: new Date().toISOString()
        };
        
        await onSave(substituteData);
    };

    const handleClose = () => {
        setFormData({
            teacherId: '',
            startDate: '',
            endDate: '',
            isIndefinite: false,
            reason: ''
        });
        setFieldErrors({});
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="md">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                    <User className="text-[#DC2626]" size={24} />
                    <h2 className="text-2xl font-bold text-gray-900">
                        {currentSubstitute ? 'Editar Professor Substituto' : 'Adicionar Professor Substituto'}
                    </h2>
                </div>
                <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Seleção do Professor Substituto */}
                <div>
                    <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 mb-2">
                        Professor Substituto *
                    </label>
                    <PersonAutocomplete
                        value={formData.teacherId}
                        onChange={(value) => {
                            setFormData(prev => ({ ...prev, teacherId: value }));
                            const fieldError = validateField('teacherId', value);
                            setFieldErrors(prev => ({ ...prev, teacherId: fieldError.teacherId || null }));
                        }}
                        placeholder="Digite o nome do professor substituto..."
                        options={members.map(member => ({ value: member.id, label: member.name }))}
                        className={fieldErrors.teacherId ? 'border-red-500' : ''}
                    />
                    {fieldErrors.teacherId && (
                        <p className="text-red-600 text-sm mt-1">{fieldErrors.teacherId}</p>
                    )}
                </div>

                {/* Motivo da Substituição */}
                <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                        Motivo da Substituição *
                    </label>
                    <textarea
                        name="reason"
                        id="reason"
                        value={formData.reason}
                        onChange={handleChange}
                        placeholder="Ex: Férias, licença médica, viagem, etc."
                        rows={3}
                        className={`w-full bg-gray-100 rounded-md p-3 border focus:ring-2 resize-none ${
                            fieldErrors.reason 
                                ? 'border-red-500 focus:ring-red-500' 
                                : 'border-gray-300 focus:ring-[#DC2626]'
                        }`}
                    />
                    {fieldErrors.reason && (
                        <p className="text-red-600 text-sm mt-1">{fieldErrors.reason}</p>
                    )}
                </div>

                {/* Período da Substituição */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <Calendar className="mr-2" size={18} />
                        Período da Substituição
                    </h3>
                    
                    <div className="space-y-4">
                        {/* Data de Início */}
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                                Data de Início *
                            </label>
                            <input
                                type="text"
                                name="startDate"
                                id="startDate"
                                value={formData.startDate ? formatDateToBrazilian(formData.startDate) : ''}
                                onChange={handleChange}
                                placeholder="dd/mm/aaaa"
                                className={`w-full bg-white rounded-md p-2 border focus:ring-2 ${
                                    fieldErrors.startDate 
                                        ? 'border-red-500 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-[#DC2626]'
                                }`}
                            />
                            {fieldErrors.startDate && (
                                <p className="text-red-600 text-sm mt-1">{fieldErrors.startDate}</p>
                            )}
                        </div>

                        {/* Checkbox para Prazo Indeterminado */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isIndefinite"
                                name="isIndefinite"
                                checked={formData.isIndefinite}
                                onChange={handleChange}
                                className="h-4 w-4 rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                            />
                            <label htmlFor="isIndefinite" className="ml-2 block text-sm text-gray-900">
                                <Clock className="inline mr-1" size={16} />
                                Substituição por prazo indeterminado
                            </label>
                        </div>

                        {/* Data de Término (só aparece se não for indeterminado) */}
                        {!formData.isIndefinite && (
                            <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                                    Data de Término *
                                </label>
                                <input
                                    type="text"
                                    name="endDate"
                                    id="endDate"
                                    value={formData.endDate ? formatDateToBrazilian(formData.endDate) : ''}
                                    onChange={handleChange}
                                    placeholder="dd/mm/aaaa"
                                    className={`w-full bg-white rounded-md p-2 border focus:ring-2 ${
                                        fieldErrors.endDate 
                                            ? 'border-red-500 focus:ring-red-500' 
                                            : 'border-gray-300 focus:ring-[#DC2626]'
                                    }`}
                                />
                                {fieldErrors.endDate && (
                                    <p className="text-red-600 text-sm mt-1">{fieldErrors.endDate}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all"
                    >
                        Cancelar
                    </button>
                    <LoadingButton
                        type="submit"
                        isLoading={isLoading}
                        className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all"
                    >
                        {currentSubstitute ? 'Atualizar Substituto' : 'Adicionar Substituto'}
                    </LoadingButton>
                </div>
            </form>
        </Modal>
    );
};

export default SubstituteTeacherModal;