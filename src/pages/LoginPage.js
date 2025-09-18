import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react'; // Importa os ícones

import { firebaseConfig } from '../firebaseConfig'; 
import { initializeApp } from 'firebase/app';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false); // Novo estado para controlar a visibilidade

    const getFriendlyErrorMessage = (code) => {
        switch (code) {
            case 'auth/invalid-email': return 'O formato do e-mail é inválido.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential': return 'E-mail ou senha incorretos.';
            case 'auth/email-already-in-use': return 'Este e-mail já está a ser utilizado.';
            case 'auth/weak-password': return 'A senha deve ter pelo menos 6 caracteres.';
            default: return 'Ocorreu um erro. Por favor, tente novamente.';
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsSubmitting(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(getFriendlyErrorMessage(err.code));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsSubmitting(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(getFriendlyErrorMessage(err.code));
        } finally {
            setIsSubmitting(false);
        }
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
                        src="/logo192.png"
                        onError={(e) => { 
                          if (e.target.src.includes('logo192.png')) {
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
                    {error && <p className="text-sm text-center text-white bg-red-500/50 p-2 rounded-md">{error}</p>}
                    {message && <p className="text-sm text-center text-white bg-green-500/50 p-2 rounded-md">{message}</p>}
                    <div className="space-y-3">
                        <button onClick={handleLogin} disabled={isSubmitting} className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-[#991B1B] bg-white border border-transparent rounded-md group hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#991B1B] focus:ring-white disabled:bg-gray-300 disabled:text-gray-500">
                            {isSubmitting ? 'Aguarde...' : 'Entrar'}
                        </button>
                        <button onClick={handleCreateAccount} disabled={isSubmitting} className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-white bg-white/20 border border-transparent rounded-md group hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#991B1B] focus:ring-white disabled:bg-opacity-50">
                            {isSubmitting ? 'Aguarde...' : 'Criar Conta'}
                        </button>
                        <button onClick={handlePasswordReset} disabled={isSubmitting} className="w-full text-center text-sm text-white/70 hover:text-white transition-colors">
                            Esqueci minha senha
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;