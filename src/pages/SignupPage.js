import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection } from 'firebase/firestore';
import { Eye, EyeOff } from 'lucide-react';
import { auth, db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const getFriendlyErrorMessage = (code) => {
    switch (code) {
      case 'auth/missing-email': return 'Por favor, informe o e-mail.';
      case 'auth/missing-password': return 'Por favor, informe a senha.';
      case 'auth/invalid-email': return 'O formato do e-mail é inválido.';
      case 'auth/email-already-in-use': return 'Este e-mail já está a ser utilizado.';
      case 'auth/weak-password': return 'A senha deve ter pelo menos 6 caracteres.';
      case 'auth/operation-not-allowed': return 'Login por e-mail/senha está desativado no projeto. Por favor, peça ao administrador para habilitar em Firebase Authentication.';
      case 'auth/network-request-failed': return 'Falha de rede. Verifique sua conexão e tente novamente.';
      case 'auth/too-many-requests': return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
      default: return 'Ocorreu um erro. Por favor, tente novamente.';
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setErrorCode('');
    setMessage('');
    
    if (!email || !password || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Tentar enviar um e-mail de confirmação via Firebase Extensions (Trigger Email)
      try {
        await addDoc(collection(db, 'mail'), {
          to: [email.trim()],
          message: {
            subject: 'Tenda Church - Conta criada com sucesso',
            text: 'Sua conta foi criada com sucesso. Você já pode acessar o sistema com seu e-mail e senha.',
            html: '<p>Sua conta foi criada com sucesso. Você já pode acessar o sistema com seu e-mail e senha.</p>'
          }
        });
      } catch (mailErr) {
        console.warn('Falha ao registrar e-mail de confirmação na coleção mail:', mailErr);
      }

      setMessage('Conta criada com sucesso! Enviamos um e-mail de confirmação.');
      // Redireciona para o dashboard após alguns segundos (já autenticado)
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      console.error('Signup error:', err.code, err.message);
      setError(getFriendlyErrorMessage(err.code));
      setErrorCode(err.code || 'unknown');
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
          <h1 className="text-white text-xl font-semibold">Criar Conta</h1>
        </div>
        <form className="mt-6 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="email-address" className="sr-only">Email</label>
              <input id="email-address" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="relative block w-full px-3 py-3 text-white placeholder-gray-300 bg-white/20 border border-transparent rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-white sm:text-sm" placeholder="E-mail" />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">Senha</label>
              <input 
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="relative block w-full px-3 py-3 text-white placeholder-gray-300 bg-white/20 border border-transparent rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-white sm:text-sm pr-10"
                placeholder="Senha"
              />
              <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-300" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-300" />
                )}
              </button>
            </div>
            <div className="relative">
              <label htmlFor="confirm-password" className="sr-only">Confirmar Senha</label>
              <input 
                id="confirm-password"
                name="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="relative block w-full px-3 py-3 text-white placeholder-gray-300 bg-white/20 border border-transparent rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-white sm:text-sm pr-10"
                placeholder="Confirmar Senha"
              />
              <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? (
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
          {message && (
            <p className="text-sm text-center text-white bg-green-500/50 p-2 rounded-md">{message}</p>
          )}

          <div className="space-y-3">
            <button type="submit" disabled={isSubmitting} className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-[#991B1B] bg-white border border-transparent rounded-md group hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#991B1B] focus:ring-white disabled:bg-gray-300 disabled:text-gray-500">
              {isSubmitting ? 'Aguarde...' : 'Criar Conta'}
            </button>
            <button type="button" onClick={() => navigate('/')} className="w-full text-center text-sm text-white/70 hover:text-white transition-colors">Voltar ao Login</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
