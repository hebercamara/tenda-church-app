import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react'; // Importa os ícones
import { auth, db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import ChurchSelectorModal from '../components/ChurchSelectorModal';
import { SUPER_ADMIN_EMAIL } from '../utils/tenantUtils';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [errorCode, setErrorCode] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false); // Novo estado para controlar a visibilidade
    const [showChurchSelector, setShowChurchSelector] = useState(false);
    const [userChurches, setUserChurches] = useState([]);
    const navigate = useNavigate();
    const { setTenant, setSuperAdmin, setAvailableTenants } = useAuthStore();

    const getFriendlyErrorMessage = (code) => {
        switch (code) {
            case 'auth/missing-email': return 'Por favor, informe o e-mail.';
            case 'auth/missing-password': return 'Por favor, informe a senha.';
            case 'auth/invalid-email': return 'O formato do e-mail é inválido.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential': return 'E-mail ou senha incorretos.';
            case 'auth/email-already-in-use': return 'Este e-mail já está a ser utilizado.';
            case 'auth/weak-password': return 'A senha deve ter pelo menos 6 caracteres.';
            case 'auth/operation-not-allowed': return 'Login por e-mail/senha está desativado no projeto. Por favor, peça ao administrador para habilitar em Firebase Authentication.';
            case 'auth/network-request-failed': return 'Falha de rede. Verifique sua conexão e tente novamente.';
            case 'auth/too-many-requests': return 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.';
            default: return 'Ocorreu um erro. Por favor, tente novamente.';
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setErrorCode('');
        setIsSubmitting(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            const userEmail = userCredential.user.email?.toLowerCase();
            
            // Verifica se é super admin
            const isSuper = userEmail === SUPER_ADMIN_EMAIL;
            setSuperAdmin(isSuper);

            // Busca os dados do usuário global
            const q = query(collection(db, 'global_users'), where('email', '==', userEmail));
            const querySnapshot = await getDocs(q);
            
            let userTenants = [];
            if (!querySnapshot.empty) {
                userTenants = querySnapshot.docs[0].data().tenants || [];
            }
            
            setAvailableTenants(userTenants);

            if (isSuper) {
                // Super admin pode acessar o dashboard mestre direto
                // Mas precisamos buscar a lista de igrejas se ele quiser logar em alguma específica
                // Para simplificar, o super admin loga no tenant principal (tenda-church-app) por padrão
                const defaultTenantRef = doc(db, 'tenants', 'tenda-church-app');
                const defaultTenantSnap = await getDoc(defaultTenantRef);
                if (defaultTenantSnap.exists()) {
                    setTenant('tenda-church-app', defaultTenantSnap.data());
                } else {
                    setTenant('tenda-church-app', { name: 'Tenda Church App' });
                }
                setIsSubmitting(false);
                return;
            }

            if (userTenants.length === 0) {
                // Usuário sem igreja associada - loga mas fica sem tenant
                setTenant(null, null);
                setIsSubmitting(false);
                return;
            }

            if (userTenants.length === 1) {
                // Apenas uma igreja - loga direto nela
                const tenantId = userTenants[0];
                const tenantRef = doc(db, 'tenants', tenantId);
                const tenantSnap = await getDoc(tenantRef);
                
                if (tenantSnap.exists() && tenantSnap.data().status === 'inactive') {
                    setError('O ambiente desta igreja está desativado.');
                    auth.signOut();
                    setIsSubmitting(false);
                    return;
                }
                
                setTenant(tenantId, tenantSnap.exists() ? tenantSnap.data() : { name: tenantId });
                setIsSubmitting(false);
            } else {
                // Múltiplas igrejas - abre o modal de seleção
                const churchDetails = [];
                for (const tId of userTenants) {
                    const tRef = doc(db, 'tenants', tId);
                    const tSnap = await getDoc(tRef);
                    if (tSnap.exists() && tSnap.data().status === 'active') {
                        churchDetails.push({ id: tId, ...tSnap.data() });
                    }
                }
                
                if (churchDetails.length === 0) {
                    setError('Nenhuma igreja ativa encontrada para o seu usuário.');
                    auth.signOut();
                    setIsSubmitting(false);
                    return;
                }
                
                if (churchDetails.length === 1) {
                    setTenant(churchDetails[0].id, churchDetails[0]);
                    setIsSubmitting(false);
                } else {
                    setUserChurches(churchDetails);
                    setShowChurchSelector(true);
                    setIsSubmitting(false);
                }
            }
        } catch (err) {
            console.error('Login error:', err.code, err.message);
            setError(getFriendlyErrorMessage(err.code));
            setErrorCode(err.code || 'unknown');
            setIsSubmitting(false);
        }
    };

    const handleSelectChurch = (tenantId, tenantData) => {
        setTenant(tenantId, tenantData);
        setShowChurchSelector(false);
    };

    const goToSignup = (e) => {
        e.preventDefault();
        navigate('/signup');
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!email) {
            setError('Por favor, digite seu e-mail para redefinir a senha.');
            setMessage('');
            return;
        }
        setError('');
        setIsSubmitting(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage('E-mail de redefinição de senha enviado com sucesso! Verifique sua caixa de entrada.');
        } catch (err) {
            setError(getFriendlyErrorMessage(err.code));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-200">
            <div className="w-full max-w-md p-8 space-y-8 bg-[#991B1B] rounded-2xl shadow-lg">
                <div className="flex flex-col items-center">
                    <img
                        src="/logo512.png"
                        onError={(e) => {
                            if (e.target.src.includes('logo512.png')) {
                                e.target.src = 'https://firebasestorage.googleapis.com/v0/b/tenda-church-app.firebasestorage.app/o/LOGO%20TENDA%20BRANCO.png?alt=media&token=ed7c6ad0-de20-46a3-bb4c-552934e3d3ca';
                            } else {
                                e.target.onerror = null;
                                e.target.src = 'https://placehold.co/200x50/991B1B/FFFFFF?text=Logo+Tenda+Church';
                            }
                        }}
                        alt="Logo Tenda Church"
                        className="h-16 mb-6"
                    />
                </div>
                <form className="mt-8 space-y-6">
                    <div className="space-y-4 rounded-md">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email</label>
                            <input id="email-address" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="relative block w-full px-3 py-3 text-white placeholder-gray-300 bg-white/20 border border-transparent rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-white sm:text-sm" placeholder="E-mail" />
                        </div>
                        {/* --- CAMPO DE SENHA ATUALIZADO --- */}
                        <div className="relative">
                            <label htmlFor="password" className="sr-only">Senha</label>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'} // Altera o tipo dinamicamente
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="relative block w-full px-3 py-3 text-white placeholder-gray-300 bg-white/20 border border-transparent rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-white sm:text-sm pr-10"
                                placeholder="Senha"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5 text-gray-300" />
                                ) : (
                                    <Eye className="h-5 w-5 text-gray-300" />
                                )}
                            </button>
                        </div>
                    </div>
                    {error && (
                        <p className="text-sm text-center text-white bg-red-500/50 p-2 rounded-md">
                            {error}
                            {errorCode && (
                                <span className="block text-xs mt-1 text-white/80">Detalhes: {errorCode}</span>
                            )}
                        </p>
                    )}
                    {message && <p className="text-sm text-center text-white bg-green-500/50 p-2 rounded-md">{message}</p>}
                    <div className="space-y-3">
                        <button onClick={handleLogin} disabled={isSubmitting} className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-[#991B1B] bg-white border border-transparent rounded-md group hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#991B1B] focus:ring-white disabled:bg-gray-300 disabled:text-gray-500">
                            {isSubmitting ? 'Aguarde...' : 'Entrar'}
                        </button>
                        <button onClick={goToSignup} className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-white bg-white/20 border border-transparent rounded-md group hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#991B1B] focus:ring-white">
                            Criar Conta
                        </button>
                        <button onClick={handlePasswordReset} disabled={isSubmitting} className="w-full text-center text-sm text-white/70 hover:text-white transition-colors">
                            Esqueci minha senha
                        </button>
                    </div>
                </form>
            </div>
            
            <ChurchSelectorModal 
                isOpen={showChurchSelector} 
                churches={userChurches} 
                onSelect={handleSelectChurch} 
                onClose={() => {
                    setShowChurchSelector(false);
                    auth.signOut();
                }} 
            />
        </div>
    );
};

export default LoginPage;
