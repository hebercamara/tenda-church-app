import React, { useState, useEffect } from 'react';
import { damerauLevenshtein } from 'damerau-levenshtein';
// NOVO: Importando o store
import { useAuthStore } from '../store/authStore';
import { useLoadingState } from '../hooks/useLoadingState';
import LoadingButton from './LoadingButton';
import { formatDateForInput, formatDateToBrazilian, convertBrazilianDateToISO } from '../utils/dateUtils';

// ALTERADO: O componente não recebe mais `isAdmin`
const MemberForm = ({ onClose, onSave, connects, editingMember, leaderConnects, onCheckDuplicate }) => {
    // NOVO: Buscando o status de admin diretamente do store
    const { isAdmin } = useAuthStore();
    const { isLoading, setLoading } = useLoadingState();
    
    const initialFormData = {
        name: '',
        dob: '',
        email: '',
        address: '',
        phone: '',
        gender: '',
        connectId: '',
        milestones: {
            salvation: { date: '' },
            initialDiscipleship: { date: '' },
            baptism: { date: '' },
            membership: { date: '' },
            connectTraining: { date: '' },
        }
    };

    const [formData, setFormData] = useState(initialFormData);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    
    useEffect(() => {
        if (editingMember) {
            const milestones = editingMember.milestones || initialFormData.milestones;
            setFormData({
                name: editingMember.name || '',
                dob: editingMember.dob || '',
                email: editingMember.email || '',
                address: editingMember.address || '',
                phone: editingMember.phone || '',
                gender: editingMember.gender || '',
                connectId: editingMember.connectId || '',
                milestones: {
                    salvation: { date: milestones.salvation?.date || '' },
                    initialDiscipleship: { date: milestones.initialDiscipleship?.date || '' },
                    baptism: { date: milestones.baptism?.date || '' },
                    membership: { date: milestones.membership?.date || '' },
                    connectTraining: { date: milestones.connectTraining?.date || '' },
                }
            });
        } else {
            setFormData(initialFormData);
        }
    }, [editingMember]);

    const validateField = (name, value) => {
        const errors = {};
        
        switch (name) {
            case 'email':
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    errors.email = 'E-mail inválido';
                }
                break;
            case 'phone':
                if (value && !/^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/.test(value.replace(/\D/g, ''))) {
                    errors.phone = 'Telefone deve ter 10 ou 11 dígitos';
                }
                break;
            case 'name':
                if (value && value.trim().length < 2) {
                    errors.name = 'Nome deve ter pelo menos 2 caracteres';
                }
                break;
            case 'dob':
                if (value) {
                    const birthDate = new Date(value);
                    const today = new Date();
                    const age = today.getFullYear() - birthDate.getFullYear();
                    if (age < 0 || age > 120) {
                        errors.dob = 'Data de nascimento inválida';
                    }
                }
                break;
        }
        
        return errors;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Se for campo de data, converte formato brasileiro para ISO
        let processedValue = value;
        if (name === 'dob' && value) {
            processedValue = convertBrazilianDateToISO(value);
        }
        
        setFormData(prev => ({ ...prev, [name]: processedValue }));
        
        // Validação em tempo real
        const fieldError = validateField(name, processedValue);
        setFieldErrors(prev => ({ ...prev, ...fieldError, [name]: fieldError[name] || null }));
    };

    const handleMilestoneChange = (milestone, value) => {
        // Converte a data brasileira para ISO antes de salvar
        const isoDate = convertBrazilianDateToISO(value);
        setFormData(prev => ({
            ...prev,
            milestones: {
                ...prev.milestones,
                [milestone]: { date: isoDate }
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            // Validação completa de todos os campos
            const allErrors = {};
            Object.keys(formData).forEach(key => {
                if (key !== 'milestones' && key !== 'address' && key !== 'connectId') {
                    const fieldError = validateField(key, formData[key]);
                    Object.assign(allErrors, fieldError);
                }
            });
            
            // Verificação de campos obrigatórios
            if (!formData.name?.trim()) allErrors.name = 'Nome é obrigatório';
            if (!formData.dob) allErrors.dob = 'Data de nascimento é obrigatória';
            if (!formData.phone?.trim()) allErrors.phone = 'Telefone é obrigatório';
            if (!formData.gender) allErrors.gender = 'Sexo é obrigatório';
            if (!formData.email?.trim()) allErrors.email = 'E-mail é obrigatório';
            
            if (!isAdmin && !formData.connectId) {
                allErrors.connectId = 'Connect é obrigatório para líderes';
            }
            
            setFieldErrors(allErrors);
            
            if (Object.keys(allErrors).length > 0) {
                setError('Por favor, corrija os erros nos campos destacados.');
                return;
            }

            const finalData = { ...formData };
            Object.keys(finalData.milestones).forEach(key => {
                finalData.milestones[key].completed = !!finalData.milestones[key].date;
            });

            if (!editingMember) {
                await onCheckDuplicate(finalData);
            } else {
                onSave(finalData, editingMember);
            }
        } catch (error) {
            setError('Erro ao salvar membro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const availableConnects = isAdmin ? connects : leaderConnects;

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[85vh] overflow-y-auto pr-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingMember ? 'Editar Membro' : 'Novo Membro'}</h2>
            {error && <p className="text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}
            
            <fieldset className="border p-4 rounded-md">
                <legend className="px-2 font-semibold">Dados Pessoais</legend>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
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
                            placeholder="Nome completo" 
                        />
                        {fieldErrors.name && <p className="text-red-600 text-sm mt-1">{fieldErrors.name}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                            <input 
                                type="text" 
                                name="dob" 
                                id="dob" 
                                value={formData.dob ? formatDateToBrazilian(formData.dob) : ''} 
                                onChange={handleChange} 
                                placeholder="dd/mm/aaaa"
                                className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                                    fieldErrors.dob 
                                        ? 'border-red-500 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-[#DC2626]'
                                }`} 
                            />
                            {fieldErrors.dob && <p className="text-red-600 text-sm mt-1">{fieldErrors.dob}</p>}
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                            <input 
                                type="email" 
                                name="email" 
                                id="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                                    fieldErrors.email 
                                        ? 'border-red-500 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-[#DC2626]'
                                }`} 
                                placeholder="email@exemplo.com" 
                            />
                            {fieldErrors.email && <p className="text-red-600 text-sm mt-1">{fieldErrors.email}</p>}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                            <input 
                                type="tel" 
                                name="phone" 
                                id="phone" 
                                value={formData.phone} 
                                onChange={handleChange} 
                                className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                                    fieldErrors.phone 
                                        ? 'border-red-500 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-[#DC2626]'
                                }`} 
                                placeholder="(99) 99999-9999" 
                            />
                            {fieldErrors.phone && <p className="text-red-600 text-sm mt-1">{fieldErrors.phone}</p>}
                        </div>
                        <div>
                            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                            <select 
                                name="gender" 
                                id="gender" 
                                value={formData.gender} 
                                onChange={handleChange} 
                                className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                                    fieldErrors.gender 
                                        ? 'border-red-500 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-[#DC2626]'
                                }`}
                            >
                                <option value="">Selecione...</option>
                                <option value="Masculino">Masculino</option>
                                <option value="Feminino">Feminino</option>
                            </select>
                            {fieldErrors.gender && <p className="text-red-600 text-sm mt-1">{fieldErrors.gender}</p>}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="connectId" className="block text-sm font-medium text-gray-700 mb-1">Connect Atual</label>
                        <select 
                            name="connectId" 
                            id="connectId" 
                            value={formData.connectId} 
                            onChange={handleChange} 
                            className={`w-full bg-gray-100 rounded-md p-2 border focus:ring-2 ${
                                fieldErrors.connectId 
                                    ? 'border-red-500 focus:ring-red-500' 
                                    : 'border-gray-300 focus:ring-[#DC2626]'
                            }`}
                        >
                            <option value="">{isAdmin ? "Nenhum" : "Selecione um Connect"}</option>
                            {availableConnects.map(connect => (
                                <option key={connect.id} value={connect.id}>{connect.number} - {connect.name}</option>
                            ))}
                        </select>
                        {fieldErrors.connectId && <p className="text-red-600 text-sm mt-1">{fieldErrors.connectId}</p>}
                    </div>
                </div>
            </fieldset>

            <fieldset className="border p-4 rounded-md">
                <legend className="px-2 font-semibold">Trilho de Liderança</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="salvation" className="block text-sm font-medium text-gray-700 mb-1">1. Aceitou a Jesus</label>
                        <input type="text" name="salvation" id="salvation" value={formData.milestones.salvation.date ? formatDateToBrazilian(formData.milestones.salvation.date) : ''} onChange={(e) => handleMilestoneChange('salvation', e.target.value)} placeholder="dd/mm/aaaa" className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"/>
                    </div>
                     <div>
                        <label htmlFor="initialDiscipleship" className="block text-sm font-medium text-gray-700 mb-1">2. Discipulado Inicial</label>
                        <input type="text" name="initialDiscipleship" id="initialDiscipleship" value={formData.milestones.initialDiscipleship.date ? formatDateToBrazilian(formData.milestones.initialDiscipleship.date) : ''} onChange={(e) => handleMilestoneChange('initialDiscipleship', e.target.value)} placeholder="dd/mm/aaaa" className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"/>
                    </div>
                    <div>
                        <label htmlFor="baptism" className="block text-sm font-medium text-gray-700 mb-1">3. Batismo</label>
                        <input type="text" name="baptism" id="baptism" value={formData.milestones.baptism.date ? formatDateToBrazilian(formData.milestones.baptism.date) : ''} onChange={(e) => handleMilestoneChange('baptism', e.target.value)} placeholder="dd/mm/aaaa" className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"/>
                    </div>
                    <div>
                        <label htmlFor="membership" className="block text-sm font-medium text-gray-700 mb-1">4. Membresia</label>
                        <input type="text" name="membership" id="membership" value={formData.milestones.membership.date ? formatDateToBrazilian(formData.milestones.membership.date) : ''} onChange={(e) => handleMilestoneChange('membership', e.target.value)} placeholder="dd/mm/aaaa" className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"/>
                    </div>
                     <div>
                        <label htmlFor="connectTraining" className="block text-sm font-medium text-gray-700 mb-1">5. Treinamento no Connect</label>
                        <input type="text" name="connectTraining" id="connectTraining" value={formData.milestones.connectTraining.date ? formatDateToBrazilian(formData.milestones.connectTraining.date) : ''} onChange={(e) => handleMilestoneChange('connectTraining', e.target.value)} placeholder="dd/mm/aaaa" className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"/>
                    </div>
                </div>
            </fieldset>

            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all" disabled={isLoading}>Cancelar</button>
                <LoadingButton
                    type="submit"
                    isLoading={isLoading}
                    className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold hover:bg-[#991B1B] transition-all"
                >
                    {editingMember ? 'Salvar Alterações' : 'Adicionar Membro'}
                </LoadingButton>
            </div>
        </form>
    );
};

export default MemberForm;
