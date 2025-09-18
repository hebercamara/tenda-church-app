import React, { useState, useEffect } from 'react';

// NOVO: Importando o store
import { useAuthStore } from '../store/authStore';
import { useLoadingState } from '../hooks/useLoadingState';
import LoadingButton from './LoadingButton';
import { convertBrazilianDateToISO, convertISOToBrazilianDate } from '../utils/dateUtils';

// ALTERADO: O componente não recebe mais `isAdmin`
const MemberForm = ({ onClose, onSave, connects, editingMember, leaderConnects, onCheckDuplicate }) => {
    // NOVO: Buscando o status de admin diretamente do store
    const { isAdmin } = useAuthStore();
    const { isLoading, setLoading } = useLoadingState();

    const [formData, setFormData] = useState({
        name: '',
        knownBy: '',
        dob: '',
        email: '',
        street: '',
        neighborhood: '',
        city: '',
        zipCode: '',
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
    });
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    
    useEffect(() => {
        if (editingMember) {
            const milestones = editingMember.milestones || {
                salvation: { date: '' },
                initialDiscipleship: { date: '' },
                baptism: { date: '' },
                membership: { date: '' },
                connectTraining: { date: '' },
            };
            setFormData({
                name: editingMember.name || '',
                knownBy: editingMember.knownBy || '',
                dob: editingMember.dob ? convertISOToBrazilianDate(editingMember.dob) : '',
                email: editingMember.email || '',
                street: editingMember.street || editingMember.address || '',
                neighborhood: editingMember.neighborhood || '',
                city: editingMember.city || '',
                zipCode: editingMember.zipCode || '',
                phone: editingMember.phone || '',
                gender: editingMember.gender || '',
                connectId: editingMember.connectId || '',
                milestones: {
                    salvation: { date: milestones.salvation?.date ? convertISOToBrazilianDate(milestones.salvation.date) : '' },
                    initialDiscipleship: { date: milestones.initialDiscipleship?.date ? convertISOToBrazilianDate(milestones.initialDiscipleship.date) : '' },
                    baptism: { date: milestones.baptism?.date ? convertISOToBrazilianDate(milestones.baptism.date) : '' },
                    membership: { date: milestones.membership?.date ? convertISOToBrazilianDate(milestones.membership.date) : '' },
                    connectTraining: { date: milestones.connectTraining?.date ? convertISOToBrazilianDate(milestones.connectTraining.date) : '' },
                }
            });
        } else {
            setFormData({
                name: '',
                knownBy: '',
                dob: '',
                email: '',
                street: '',
                neighborhood: '',
                city: '',
                zipCode: '',
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
            });
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
            case 'street':
                if (!value || value.trim() === '') {
                    errors.street = 'Endereço é obrigatório';
                }
                break;
            case 'neighborhood':
                if (!value || value.trim() === '') {
                    errors.neighborhood = 'Bairro é obrigatório';
                }
                break;
            case 'city':
                if (!value || value.trim() === '') {
                    errors.city = 'Município é obrigatório';
                }
                break;
            case 'zipCode':
                if (!value || value.trim() === '') {
                    errors.zipCode = 'CEP é obrigatório';
                } else if (!/^\d{5}-?\d{3}$/.test(value.replace(/\D/g, ''))) {
                    errors.zipCode = 'CEP deve ter 8 dígitos';
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
            default:
                break;
        }
        
        return errors;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'dob') {
            // Para data de nascimento, salva o valor como está sendo digitado
            setFormData(prev => ({ ...prev, [name]: value }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        
        // Validação em tempo real
        const fieldError = validateField(name, value);
        setFieldErrors(prev => ({ ...prev, ...fieldError, [name]: fieldError[name] || null }));
    };
    
    const handleDateChange = (fieldName, value) => {
        // Remove caracteres não numéricos
        const cleanValue = value.replace(/\D/g, '');
        
        // Aplica máscara dd/mm/aaaa
        let formattedValue = cleanValue;
        if (cleanValue.length >= 2) {
            formattedValue = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2);
        }
        if (cleanValue.length >= 4) {
            formattedValue = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2, 4) + '/' + cleanValue.slice(4, 8);
        }
        
        setFormData(prev => ({ ...prev, [fieldName]: formattedValue }));
        
        // Validação em tempo real
        const fieldError = validateField(fieldName, formattedValue);
        setFieldErrors(prev => ({ ...prev, ...fieldError, [fieldName]: fieldError[fieldName] || null }));
    };

    const handleMilestoneChange = (milestone, value) => {
        // Remove caracteres não numéricos
        const cleanValue = value.replace(/\D/g, '');
        
        // Aplica máscara dd/mm/aaaa
        let formattedValue = cleanValue;
        if (cleanValue.length >= 2) {
            formattedValue = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2);
        }
        if (cleanValue.length >= 4) {
            formattedValue = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2, 4) + '/' + cleanValue.slice(4, 8);
        }
        
        setFormData(prev => ({
            ...prev,
            milestones: {
                ...prev.milestones,
                [milestone]: {
                    ...prev.milestones[milestone],
                    date: formattedValue
                }
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
                if (key !== 'milestones' && key !== 'connectId') {
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
            
            // Connect será gerenciado apenas pelo formulário do Connect
            
            setFieldErrors(allErrors);
            
            if (Object.keys(allErrors).length > 0) {
                setError('Por favor, corrija os erros nos campos destacados.');
                return;
            }

            const finalData = { ...formData };
            
            // Converte data de nascimento para ISO
            if (finalData.dob) {
                finalData.dob = convertBrazilianDateToISO(finalData.dob);
            }
            
            // Se 'Conhecido por' não foi preenchido, usar o primeiro nome
            if (!finalData.knownBy?.trim() && finalData.name?.trim()) {
                finalData.knownBy = finalData.name.split(' ')[0];
            }
            
            // Converte datas dos marcos para ISO e marca como completados
            Object.keys(finalData.milestones).forEach(key => {
                if (finalData.milestones[key].date) {
                    finalData.milestones[key].date = convertBrazilianDateToISO(finalData.milestones[key].date);
                    finalData.milestones[key].completed = true;
                } else {
                    finalData.milestones[key].completed = false;
                }
            });

            if (!editingMember) {
                await onCheckDuplicate(finalData);
                // Reset loading state após verificação de duplicata
                setLoading(false);
            } else {
                onSave(finalData, editingMember);
                setLoading(false);
            }
        } catch (error) {
            setError('Erro ao salvar membro. Tente novamente.');
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
                    <div>
                        <label htmlFor="knownBy" className="block text-sm font-medium text-gray-700 mb-1">Conhecido por</label>
                        <input 
                            type="text" 
                            name="knownBy" 
                            id="knownBy" 
                            value={formData.knownBy} 
                            onChange={handleChange} 
                            className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                                fieldErrors.knownBy 
                                    ? 'border-red-500 focus:ring-red-500' 
                                    : 'border-gray-300 focus:ring-[#DC2626]'
                            }`} 
                            placeholder="Como a pessoa é conhecida (deixe vazio para usar o primeiro nome)" 
                        />
                        {fieldErrors.knownBy && <p className="text-red-600 text-sm mt-1">{fieldErrors.knownBy}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                            <input 
                                type="text" 
                                name="dob" 
                                id="dob" 
                                value={formData.dob || ''} 
                                onChange={(e) => handleDateChange('dob', e.target.value)} 
                                placeholder="dd/mm/aaaa"
                                maxLength="10"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                            <input 
                                type="text" 
                                name="street" 
                                id="street" 
                                value={formData.street} 
                                onChange={handleChange} 
                                className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                                    fieldErrors.street 
                                        ? 'border-red-500 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-[#DC2626]'
                                }`} 
                                placeholder="Rua e número" 
                            />
                            {fieldErrors.street && <p className="text-red-600 text-sm mt-1">{fieldErrors.street}</p>}
                        </div>
                        <div>
                            <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                            <input 
                                type="text" 
                                name="neighborhood" 
                                id="neighborhood" 
                                value={formData.neighborhood} 
                                onChange={handleChange} 
                                className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                                    fieldErrors.neighborhood 
                                        ? 'border-red-500 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-[#DC2626]'
                                }`} 
                                placeholder="Bairro" 
                            />
                            {fieldErrors.neighborhood && <p className="text-red-600 text-sm mt-1">{fieldErrors.neighborhood}</p>}
                        </div>
                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">Município</label>
                            <input 
                                type="text" 
                                name="city" 
                                id="city" 
                                value={formData.city} 
                                onChange={handleChange} 
                                className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                                    fieldErrors.city 
                                        ? 'border-red-500 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-[#DC2626]'
                                }`} 
                                placeholder="Município" 
                            />
                            {fieldErrors.city && <p className="text-red-600 text-sm mt-1">{fieldErrors.city}</p>}
                        </div>
                        <div>
                            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                            <input 
                                type="text" 
                                name="zipCode" 
                                id="zipCode" 
                                value={formData.zipCode} 
                                onChange={handleChange} 
                                className={`w-full bg-gray-100 text-gray-900 rounded-md p-2 border focus:ring-2 ${
                                    fieldErrors.zipCode 
                                        ? 'border-red-500 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-[#DC2626]'
                                }`} 
                                placeholder="00000-000" 
                            />
                            {fieldErrors.zipCode && <p className="text-red-600 text-sm mt-1">{fieldErrors.zipCode}</p>}
                        </div>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Connect Atual</label>
                        <div className="w-full bg-gray-50 text-gray-700 rounded-md p-2 border border-gray-300">
                            {formData.connectId ? (
                                (() => {
                                    const currentConnect = availableConnects.find(c => c.id === formData.connectId);
                                    return currentConnect ? `${currentConnect.number} - ${currentConnect.name}` : 'Connect não encontrado';
                                })()
                            ) : (
                                <span className="text-gray-500 italic">Não está em nenhum Connect</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Para alterar o Connect, use o cadastro do Connect desejado
                        </p>
                    </div>
                </div>
            </fieldset>

            <fieldset className="border p-4 rounded-md">
                <legend className="px-2 font-semibold">Trilho de Liderança</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="salvation" className="block text-sm font-medium text-gray-700 mb-1">1. Aceitou a Jesus</label>
                        <input type="text" name="salvation" id="salvation" value={formData.milestones.salvation.date || ''} onChange={(e) => handleMilestoneChange('salvation', e.target.value)} placeholder="dd/mm/aaaa" maxLength="10" className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"/>
                    </div>
                     <div>
                        <label htmlFor="initialDiscipleship" className="block text-sm font-medium text-gray-700 mb-1">2. Discipulado Inicial</label>
                        <input type="text" name="initialDiscipleship" id="initialDiscipleship" value={formData.milestones.initialDiscipleship.date || ''} onChange={(e) => handleMilestoneChange('initialDiscipleship', e.target.value)} placeholder="dd/mm/aaaa" maxLength="10" className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"/>
                    </div>
                    <div>
                        <label htmlFor="baptism" className="block text-sm font-medium text-gray-700 mb-1">3. Batismo</label>
                        <input type="text" name="baptism" id="baptism" value={formData.milestones.baptism.date || ''} onChange={(e) => handleMilestoneChange('baptism', e.target.value)} placeholder="dd/mm/aaaa" maxLength="10" className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"/>
                    </div>
                    <div>
                        <label htmlFor="membership" className="block text-sm font-medium text-gray-700 mb-1">4. Membresia</label>
                        <input type="text" name="membership" id="membership" value={formData.milestones.membership.date || ''} onChange={(e) => handleMilestoneChange('membership', e.target.value)} placeholder="dd/mm/aaaa" maxLength="10" className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"/>
                    </div>
                     <div>
                        <label htmlFor="connectTraining" className="block text-sm font-medium text-gray-700 mb-1">5. Treinamento no Connect</label>
                        <input type="text" name="connectTraining" id="connectTraining" value={formData.milestones.connectTraining.date || ''} onChange={(e) => handleMilestoneChange('connectTraining', e.target.value)} placeholder="dd/mm/aaaa" maxLength="10" className="w-full bg-gray-100 text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"/>
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
