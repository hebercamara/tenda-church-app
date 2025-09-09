import React, { useState, useEffect } from 'react';
import { useLoadingState } from '../hooks/useLoadingState';
import LoadingButton from './LoadingButton';

const weekDaysMap = { "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3, "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6 };

const ConnectForm = ({ onClose, onSave, members, editingConnect }) => {
    const { isLoading, setLoading } = useLoadingState();
    
    const [formData, setFormData] = useState({
        number: '',
        name: '',
        weekday: '',
        time: '',
        address: '',
        leaderId: '',
        supervisorEmail: '',
    });
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        if (editingConnect) {
            setFormData({
                number: editingConnect.number || '',
                name: editingConnect.name || '',
                weekday: editingConnect.weekday || '',
                time: editingConnect.time || '',
                address: editingConnect.address || '',
                leaderId: editingConnect.leaderId || '',
                supervisorEmail: editingConnect.supervisorEmail || '',
            });
        } else {
            // Reset form for new connect
            setFormData({
                number: '',
                name: '',
                weekday: '',
                time: '',
                address: '',
                leaderId: '',
                supervisorEmail: '',
            });
        }
    }, [editingConnect]);


    const validateField = (name, value) => {
        const errors = {};
        
        switch (name) {
            case 'number':
                if (!value) errors.number = 'Número é obrigatório';
                else if (value <= 0) errors.number = 'Número deve ser maior que zero';
                break;
            case 'name':
                if (!value.trim()) errors.name = 'Nome é obrigatório';
                else if (value.trim().length < 2) errors.name = 'Nome deve ter pelo menos 2 caracteres';
                break;
            case 'weekday':
                if (!value) errors.weekday = 'Dia da semana é obrigatório';
                break;
            case 'time':
                if (!value) errors.time = 'Horário é obrigatório';
                break;
            case 'address':
                if (!value.trim()) errors.address = 'Endereço é obrigatório';
                break;
            case 'leaderId':
                if (!value) errors.leaderId = 'Líder é obrigatório';
                break;
            case 'supervisorEmail':
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    errors.supervisorEmail = 'E-mail inválido';
                }
                break;
        }
        
        return errors;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Validação em tempo real
        const fieldError = validateField(name, value);
        setFieldErrors(prev => ({
            ...prev,
            [name]: fieldError[name] || null
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // Validação completa
            const allErrors = {};
            Object.keys(formData).forEach(field => {
                if (field !== 'supervisorEmail') { // supervisorEmail é opcional
                    const fieldError = validateField(field, formData[field]);
                    Object.assign(allErrors, fieldError);
                } else if (formData[field]) {
                    // Valida supervisorEmail apenas se preenchido
                    const fieldError = validateField(field, formData[field]);
                    Object.assign(allErrors, fieldError);
                }
            });
            
            // Validação específica do líder
            const leader = members.find(m => m.id === formData.leaderId);
            if (formData.leaderId && !leader?.email) {
                allErrors.leaderId = 'O líder selecionado precisa ter um e-mail cadastrado';
            }
            
            if (Object.keys(allErrors).length > 0) {
                setFieldErrors(allErrors);
                setError('Por favor, corrija os erros nos campos destacados.');
                return;
            }
            
            setError('');
            setFieldErrors({});
            await onSave({ ...formData, leaderName: leader?.name || 'Não encontrado', leaderEmail: leader?.email });
            onClose();
        } catch (error) {
            setError('Erro ao salvar connect. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const weekDays = Object.keys(weekDaysMap);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingConnect ? 'Editar Connect' : 'Novo Connect'}</h2>
            {error && <p className="text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">Número do Connect</label>
                    <input 
                        type="number" 
                        name="number" 
                        id="number" 
                        value={formData.number} 
                        onChange={handleChange} 
                        className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                            fieldErrors.number 
                                ? 'border-red-500 focus:ring-red-500' 
                                : 'border-gray-300 focus:ring-[#DC2626]'
                        }`} 
                        placeholder="Ex: 101" 
                    />
                    {fieldErrors.number && <p className="text-red-600 text-sm mt-1">{fieldErrors.number}</p>}
                </div>
                 <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome do Connect (Apelido)</label>
                    <input 
                        type="text" 
                        name="name" 
                        id="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                            fieldErrors.name 
                                ? 'border-red-500 focus:ring-red-500' 
                                : 'border-gray-300 focus:ring-[#DC2626]'
                        }`} 
                        placeholder="Ex: Guerreiros" 
                    />
                    {fieldErrors.name && <p className="text-red-600 text-sm mt-1">{fieldErrors.name}</p>}
                </div>
            </div>

            <div>
                <label htmlFor="leaderId" className="block text-sm font-medium text-gray-700 mb-1">Líder</label>
                <select 
                    name="leaderId" 
                    id="leaderId" 
                    value={formData.leaderId} 
                    onChange={handleChange} 
                    className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                        fieldErrors.leaderId 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-[#DC2626]'
                    }`}
                >
                    <option value="">Selecione um líder</option>
                    {members.map(member => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                </select>
                {fieldErrors.leaderId && <p className="text-red-600 text-sm mt-1">{fieldErrors.leaderId}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="weekday" className="block text-sm font-medium text-gray-700 mb-1">Dia da Semana</label>
                    <select 
                        name="weekday" 
                        id="weekday" 
                        value={formData.weekday} 
                        onChange={handleChange} 
                        className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                            fieldErrors.weekday 
                                ? 'border-red-500 focus:ring-red-500' 
                                : 'border-gray-300 focus:ring-[#DC2626]'
                        }`}
                    >
                        <option value="">Selecione...</option>
                        {weekDays.map(day => <option key={day} value={day}>{day}</option>)}
                    </select>
                    {fieldErrors.weekday && <p className="text-red-600 text-sm mt-1">{fieldErrors.weekday}</p>}
                </div>
                <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                    <input 
                        type="time" 
                        name="time" 
                        id="time" 
                        value={formData.time} 
                        onChange={handleChange} 
                        className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                            fieldErrors.time 
                                ? 'border-red-500 focus:ring-red-500' 
                                : 'border-gray-300 focus:ring-[#DC2626]'
                        }`} 
                    />
                    {fieldErrors.time && <p className="text-red-600 text-sm mt-1">{fieldErrors.time}</p>}
                </div>
            </div>

            <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input 
                    type="text" 
                    name="address" 
                    id="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                        fieldErrors.address 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-[#DC2626]'
                    }`} 
                    placeholder="Rua, Número, Bairro, Cidade" 
                />
                {fieldErrors.address && <p className="text-red-600 text-sm mt-1">{fieldErrors.address}</p>}
            </div>
            
            <div>
                <label htmlFor="supervisorEmail" className="block text-sm font-medium text-gray-700 mb-1">E-mail do Supervisor</label>
                <input 
                    type="email" 
                    name="supervisorEmail" 
                    id="supervisorEmail" 
                    value={formData.supervisorEmail} 
                    onChange={handleChange} 
                    className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                        fieldErrors.supervisorEmail 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-[#DC2626]'
                    }`} 
                    placeholder="email.supervisor@exemplo.com" 
                />
                {fieldErrors.supervisorEmail && <p className="text-red-600 text-sm mt-1">{fieldErrors.supervisorEmail}</p>}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all">Cancelar</button>
                <LoadingButton 
                    type="submit" 
                    isLoading={isLoading}
                    className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all"
                >
                    {editingConnect ? 'Salvar Alterações' : 'Adicionar Connect'}
                </LoadingButton>
            </div>
        </form>
    );
};

export default ConnectForm;