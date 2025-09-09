import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
// NOVO: Importando o store para buscar os dados do usuário
import { useAuthStore } from '../store/authStore';

// ALTERADO: O componente agora recebe apenas as funções de atualização via props
const ProfilePage = ({ onUpdateProfile, onUpdateEmail, onUpdatePassword }) => {
    // NOVO: Buscando os dados do usuário diretamente do store
    const { currentUserData } = useAuthStore();

    const [profileData, setProfileData] = useState({ name: '', phone: '', address: '' });
    const [emailData, setEmailData] = useState({ newEmail: '' });
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (currentUserData) {
            setProfileData({
                name: currentUserData.name || '',
                phone: currentUserData.phone || '',
                address: currentUserData.address || ''
            });
            setEmailData({ newEmail: currentUserData.email || '' });
        }
    }, [currentUserData]);

    const handleProfileChange = (e) => setProfileData({ ...profileData, [e.target.name]: e.target.value });
    const handleEmailChange = (e) => setEmailData({ ...emailData, [e.target.name]: e.target.value });
    const handlePasswordChange = (e) => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            await onUpdateProfile(profileData);
            setMessage('Dados pessoais atualizados com sucesso!');
        } catch (err) {
            setError('Erro ao atualizar dados. Tente novamente.');
        }
    };
    
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (emailData.newEmail === currentUserData.email) {
            setError('O novo e-mail deve ser diferente do atual.');
            return;
        }
        try {
            await onUpdateEmail(emailData.newEmail);
            setMessage('E-mail atualizado com sucesso! Você talvez precise fazer login novamente.');
        } catch (err) {
            setError('Erro ao atualizar e-mail. Pode ser necessário fazer login novamente para realizar esta operação.');
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (passwordData.newPassword.length < 6) {
            setError('A nova senha deve ter no mínimo 6 caracteres.');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        try {
            await onUpdatePassword(passwordData.newPassword);
            setPasswordData({ newPassword: '', confirmPassword: '' });
            setMessage('Senha atualizada com sucesso!');
        } catch (err) {
            setError('Erro ao atualizar a senha. Tente novamente.');
        }
    };

    if (!currentUserData) {
        return <div>Carregando dados do perfil...</div>;
    }

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-800">Meu Perfil</h2>

            {message && <div className="p-3 bg-green-100 text-green-800 rounded-md">{message}</div>}
            {error && <div className="p-3 bg-red-100 text-red-800 rounded-md">{error}</div>}

            <form onSubmit={handleProfileSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
                <h3 className="text-xl font-semibold text-gray-700">Dados Pessoais</h3>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                    <input type="text" name="name" id="name" value={profileData.name} onChange={handleProfileChange} className="mt-1 w-full max-w-lg bg-gray-50 rounded-md p-2 border border-gray-300"/>
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefone</label>
                    <input type="tel" name="phone" id="phone" value={profileData.phone} onChange={handleProfileChange} className="mt-1 w-full max-w-lg bg-gray-50 rounded-md p-2 border border-gray-300"/>
                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">Endereço</label>
                    <input type="text" name="address" id="address" value={profileData.address} onChange={handleProfileChange} className="mt-1 w-full max-w-lg bg-gray-50 rounded-md p-2 border border-gray-300"/>
                </div>
                <button type="submit" className="px-4 py-2 rounded-md bg-[#DC2626] text-white font-semibold">Salvar Dados</button>
            </form>

            <form onSubmit={handleEmailSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
                <h3 className="text-xl font-semibold text-gray-700">Alterar E-mail</h3>
                <div>
                    <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700">E-mail</label>
                    <input type="email" name="newEmail" id="newEmail" value={emailData.newEmail} onChange={handleEmailChange} className="mt-1 w-full max-w-lg bg-gray-50 rounded-md p-2 border border-gray-300"/>
                </div>
                <button type="submit" className="px-4 py-2 rounded-md bg-gray-600 text-white font-semibold">Alterar E-mail</button>
            </form>

            <form onSubmit={handlePasswordSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
                <h3 className="text-xl font-semibold text-gray-700">Alterar Senha</h3>
                <div className="relative">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nova Senha</label>
                    <input 
                        type={showNewPassword ? 'text' : 'password'} 
                        name="newPassword" 
                        id="newPassword" 
                        value={passwordData.newPassword} 
                        onChange={handlePasswordChange} 
                        className="mt-1 w-full max-w-lg bg-gray-50 rounded-md p-2 border border-gray-300 pr-10"
                    />
                    <button type="button" className="absolute inset-y-0 right-0 top-5 pr-3 flex items-center" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff className="h-5 w-5 text-gray-400"/> : <Eye className="h-5 w-5 text-gray-400"/>}
                    </button>
                </div>
                 <div className="relative">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                    <input 
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword" 
                        id="confirmPassword" 
                        value={passwordData.confirmPassword} 
                        onChange={handlePasswordChange} 
                        className="mt-1 w-full max-w-lg bg-gray-50 rounded-md p-2 border border-gray-300 pr-10"
                    />
                    <button type="button" className="absolute inset-y-0 right-0 top-5 pr-3 flex items-center" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400"/> : <Eye className="h-5 w-5 text-gray-400"/>}
                    </button>
                </div>
                <button type="submit" className="px-4 py-2 rounded-md bg-gray-600 text-white font-semibold">Alterar Senha</button>
            </form>
        </div>
    );
};

export default ProfilePage;
