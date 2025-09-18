import React, { useState, useEffect } from 'react';
import { useLoadingState } from '../hooks/useLoadingState';
import LoadingButton from './LoadingButton';
import PersonAutocomplete from './PersonAutocomplete';

const weekDaysMap = { "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3, "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6 };

const ConnectForm = ({ onClose, onSave, members, editingConnect, connects }) => {
    const { isLoading, setLoading } = useLoadingState();
    
    const [formData, setFormData] = useState({
        number: '',
        name: '',
        weekday: '',
        time: '',
        street: '',
        neighborhood: '',
        city: '',
        zipCode: '',
        leaderId: '',
        supervisorEmail: '',
        pastorEmail: '',
        memberIds: [],
    });
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        if (editingConnect) {
            // Buscar IDs baseados nos emails para supervisor e pastor
            const supervisorMember = editingConnect.supervisorEmail ? 
                members.find(m => m.email === editingConnect.supervisorEmail) : null;
            const pastorMember = editingConnect.pastorEmail ? 
                members.find(m => m.email === editingConnect.pastorEmail) : null;
            
            // Buscar membros que pertencem a este connect
            const connectMembers = members.filter(m => m.connectId === editingConnect.id).map(m => m.id);
            
            setFormData({
                number: editingConnect.number || '',
                name: editingConnect.name || '',
                weekday: editingConnect.weekday || '',
                time: editingConnect.time || '',
                street: editingConnect.street || editingConnect.address || '',
                neighborhood: editingConnect.neighborhood || '',
                city: editingConnect.city || '',
                zipCode: editingConnect.zipCode || '',
                leaderId: editingConnect.leaderId || '',
                supervisorEmail: supervisorMember?.id || editingConnect.supervisorEmail || '',
                pastorEmail: pastorMember?.id || editingConnect.pastorEmail || '',
                memberIds: connectMembers,
            });
        } else {
            // Reset form for new connect
            setFormData({
                number: '',
                name: '',
                weekday: '',
                time: '',
                street: '',
                neighborhood: '',
                city: '',
                zipCode: '',
                leaderId: '',
                supervisorEmail: '',
                pastorEmail: '',
                memberIds: [],
            });
        }
    }, [editingConnect, members]);


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
            case 'street':
                if (!value.trim()) errors.street = 'Endereço é obrigatório';
                break;
            case 'neighborhood':
                if (!value.trim()) errors.neighborhood = 'Bairro é obrigatório';
                break;
            case 'city':
                if (!value.trim()) errors.city = 'Município é obrigatório';
                break;
            case 'zipCode':
                if (!value.trim()) errors.zipCode = 'CEP é obrigatório';
                else if (!/^\d{5}-?\d{3}$/.test(value.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2'))) {
                    errors.zipCode = 'CEP deve ter o formato 00000-000';
                }
                break;
            case 'leaderId':
                if (!value) errors.leaderId = 'Líder é obrigatório';
                break;
            case 'supervisorEmail':
                // supervisorEmail agora é um ID, não precisa validar formato de email
                break;
            case 'pastorEmail':
                // pastorEmail agora é um ID, não precisa validar formato de email
                break;
            default:
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
                if (field !== 'supervisorEmail' && field !== 'pastorEmail') { // supervisorEmail e pastorEmail são opcionais
                    const fieldError = validateField(field, formData[field]);
                    Object.assign(allErrors, fieldError);
                } else if (formData[field]) {
                    // Valida supervisorEmail e pastorEmail apenas se preenchidos
                    const fieldError = validateField(field, formData[field]);
                    Object.assign(allErrors, fieldError);
                }
            });
            
            // Validação específica do líder
            const leader = members.find(m => m.id === formData.leaderId);
            if (formData.leaderId && !leader) {
                allErrors.leaderId = 'Líder selecionado não encontrado';
            } else if (formData.leaderId && !leader?.email) {
                allErrors.leaderId = 'O líder selecionado precisa ter um e-mail cadastrado';
            }
            
            // Validação: cada membro pode pertencer a apenas 1 Connect
            const membersInOtherConnects = [];
            formData.memberIds.forEach(memberId => {
                const member = members.find(m => m.id === memberId);
                if (member && member.connectId && member.connectId !== editingConnect?.id) {
                    const existingConnect = connects.find(c => c.id === member.connectId);
                    membersInOtherConnects.push(`${member.name} já pertence ao Connect ${existingConnect?.number || 'desconhecido'}`);
                }
            });
            
            if (membersInOtherConnects.length > 0) {
                allErrors.memberIds = `Os seguintes membros já pertencem a outros Connects: ${membersInOtherConnects.join(', ')}`;
            }
            
            if (Object.keys(allErrors).length > 0) {
                setFieldErrors(allErrors);
                setError('Por favor, corrija os erros nos campos destacados.');
                return;
            }
            
            setError('');
            setFieldErrors({});
            
            // Buscar dados do supervisor e pastor
            const supervisor = formData.supervisorEmail ? members.find(m => m.id === formData.supervisorEmail) : null;
            const pastor = formData.pastorEmail ? members.find(m => m.id === formData.pastorEmail) : null;
            
            const saveData = {
                ...formData,
                leaderName: leader?.name || 'Não encontrado',
                leaderEmail: leader?.email,
                supervisorEmail: supervisor?.email || '',
                supervisorName: supervisor?.name || '',
                pastorEmail: pastor?.email || '',
                pastorName: pastor?.name || '',
                memberIds: formData.memberIds || []
            };
            
            await onSave(saveData);
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
                <PersonAutocomplete
                    value={formData.leaderId}
                    onChange={(value) => setFormData(prev => ({ ...prev, leaderId: value }))}
                    placeholder="Digite o nome do líder..."
                    options={members.map(member => ({ value: member.id, label: member.name }))}
                    className={fieldErrors.leaderId ? 'border-red-500' : ''}
                />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">Endereço (Rua e Número)</label>
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
                        placeholder="Ex: Rua das Flores, 123" 
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
                        placeholder="Ex: Centro" 
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
                        placeholder="Ex: São Paulo" 
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
                        maxLength="9"
                    />
                    {fieldErrors.zipCode && <p className="text-red-600 text-sm mt-1">{fieldErrors.zipCode}</p>}
                </div>
            </div>
            
            <div>
                <label htmlFor="supervisorEmail" className="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
                <PersonAutocomplete
                    value={formData.supervisorEmail}
                    onChange={(value) => setFormData(prev => ({ ...prev, supervisorEmail: value }))}
                    placeholder="Digite o nome do supervisor..."
                    options={members.filter(member => member.email).map(member => ({ value: member.id, label: member.name }))}
                    className={fieldErrors.supervisorEmail ? 'border-red-500' : ''}
                />
                {fieldErrors.supervisorEmail && <p className="text-red-600 text-sm mt-1">{fieldErrors.supervisorEmail}</p>}
            </div>
            
            <div>
                <label htmlFor="pastorEmail" className="block text-sm font-medium text-gray-700 mb-1">Pastor</label>
                <PersonAutocomplete
                    value={formData.pastorEmail}
                    onChange={(value) => setFormData(prev => ({ ...prev, pastorEmail: value }))}
                    placeholder="Digite o nome do pastor..."
                    options={members.filter(member => member.email).map(member => ({ value: member.id, label: member.name }))}
                    className={fieldErrors.pastorEmail ? 'border-red-500' : ''}
                />
                {fieldErrors.pastorEmail && <p className="text-red-600 text-sm mt-1">{fieldErrors.pastorEmail}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adicionar Membros ao Connect</label>
                <PersonAutocomplete
                    value=""
                    onChange={(value) => {
                        if (value && !formData.memberIds.includes(value)) {
                            setFormData(prev => ({
                                ...prev,
                                memberIds: [...prev.memberIds, value]
                            }));
                        }
                    }}
                    placeholder="Digite o nome do membro para adicionar..."
                    options={members
                        .filter(member => !formData.memberIds.includes(member.id))
                        .map(member => ({ value: member.id, label: member.name }))
                    }
                    className={fieldErrors.memberIds ? 'border-red-500' : ''}
                />
                {fieldErrors.memberIds && <p className="text-red-600 text-sm mt-1">{fieldErrors.memberIds}</p>}
                
                {formData.memberIds.length > 0 && (
                    <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Membros selecionados:</p>
                        <div className="bg-gray-50 border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
                            <div className="space-y-2">
                                {formData.memberIds.map(memberId => {
                                    const member = members.find(m => m.id === memberId);
                                    return member ? (
                                        <div key={memberId} className="flex items-center justify-between bg-white p-2 rounded border">
                                            <span className="text-sm text-gray-700">{member.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        memberIds: prev.memberIds.filter(id => id !== memberId)
                                                    }));
                                                }}
                                                className="text-red-500 hover:text-red-700 text-sm font-medium"
                                            >
                                                Remover
                                            </button>
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {formData.memberIds.length} membro(s) selecionado(s)
                        </p>
                    </div>
                )}
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