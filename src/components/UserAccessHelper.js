import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId } from '../firebaseConfig';

const UserAccessHelper = ({ allMembers, allConnects }) => {
  const { user, isAdmin, currentUserData } = useAuthStore();
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');

  if (!user || isAdmin || currentUserData) return null;

  const handleCreateMemberRecord = async () => {
    setIsCreating(true);
    setMessage('');
    
    try {
      const memberData = {
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        phone: '',
        address: '',
        connectId: '', // Será definido pelo admin posteriormente
        createdAt: new Date(),
        isActive: true
      };
      
      const memberRef = doc(db, `artifacts/${appId}/public/data/members`, user.uid);
      await setDoc(memberRef, memberData);
      
      setMessage('Registro criado com sucesso! Aguarde um administrador associar você a um Connect.');
    } catch (error) {
      console.error('Erro ao criar registro:', error);
      setMessage('Erro ao criar registro. Tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-red-50 border border-red-200 p-6 rounded-lg mb-6">
      <h3 className="text-lg font-semibold text-red-800 mb-3">⚠️ Acesso Limitado</h3>
      <div className="text-red-700 space-y-2">
        <p>Você está logado como: <strong>{user.email}</strong></p>
        <p>Para acessar os dados do sistema, você precisa:</p>
        <ol className="list-decimal list-inside ml-4 space-y-1">
          <li>Ter um registro na base de membros</li>
          <li>Estar associado a um Connect como supervisor ou líder</li>
          <li>Ou ter cursos onde você é professor</li>
        </ol>
        
        {!currentUserData && (
          <div className="mt-4">
            <p className="mb-2">Você não possui um registro de membro. Deseja criar um?</p>
            <button
              onClick={handleCreateMemberRecord}
              disabled={isCreating}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded transition-colors"
            >
              {isCreating ? 'Criando...' : 'Criar Registro de Membro'}
            </button>
          </div>
        )}
        
        {currentUserData && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-yellow-800">
              <strong>Seu registro existe</strong>, mas você não está associado a nenhum Connect como supervisor/líder, 
              nem possui cursos como professor. Entre em contato com um administrador.
            </p>
          </div>
        )}
        
        {message && (
          <div className={`mt-3 p-3 rounded ${
            message.includes('sucesso') 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAccessHelper;