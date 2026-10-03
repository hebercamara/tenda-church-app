import React, { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, LogIn, Baby } from "lucide-react";

export default function KidsLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/kids/painel");
    } catch (err) {
      const codes = {
        "auth/invalid-credential": "E-mail ou senha incorretos.",
        "auth/user-not-found": "E-mail ou senha incorretos.",
        "auth/wrong-password": "E-mail ou senha incorretos.",
        "auth/too-many-requests": "Muitas tentativas. Aguarde e tente novamente.",
        "auth/network-request-failed": "Erro de rede. Verifique sua conexao.",
      };
      setError(codes[err.code] || "Erro ao fazer login. Tente novamente.");
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) { setError("Digite seu e-mail para redefinir a senha."); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("E-mail de redefinicao enviado! Verifique sua caixa de entrada.");
    } catch {
      setError("Nao foi possivel enviar o e-mail. Verifique o endereco.");
    }
  };

  return (
    <div className="kids-min-h-screen kids-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-lg mb-4">
            <Baby size={40} className="text-kids-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-kids-primary">Ministerio Infantil</h1>
          <p className="text-gray-500 mt-1">Faca login para continuar</p>
        </div>

        <div className="kids-card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="kids-input" placeholder="seu@email.com" required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="kids-input pr-10" placeholder="Sua senha" required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
            {message && <p className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">{message}</p>}

            <button type="submit" disabled={loading} className="kids-btn-primary w-full flex items-center justify-center gap-2">
              <LogIn size={18} />
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <button onClick={handleResetPassword} className="text-sm text-kids-primary hover:underline">
              Esqueci minha senha
            </button>
            <p className="text-sm text-gray-500">
              Primeira vez?{" "}
              <Link to="/kids/cadastro" className="text-kids-primary font-semibold hover:underline">
                Cadastre-se aqui
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
