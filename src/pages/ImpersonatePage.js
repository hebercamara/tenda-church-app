import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { Search, Eye, Users, Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ImpersonatePage = ({ allMembers }) => {
  const { isSuperAdmin, impersonatedUser, setImpersonatedUser, clearImpersonation, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Segurança extra: a rota não deveria estar acessível se não for admin real.
  // Na montagem real do App.js, o admin perde a flag "isAdmin" se estiver visualizando um usuário não-admin.
  // Portanto, para chegar aqui, ou ele é superAdmin, ou nós precisamos verificar o store interno original.
  // Mas como a rota /visualizar-como pode ser restrita no AppRouter, apenas administradores chegam aqui.

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return allMembers.filter(m => 
      (m.name?.toLowerCase().includes(term)) ||
      (m.email?.toLowerCase().includes(term))
    ).slice(0, 20); // limita a 20 resultados
  }, [allMembers, searchTerm]);

  const handleImpersonate = (member) => {
    setImpersonatedUser(member);
    navigate('/');
  };

  const handleClear = () => {
    clearImpersonation();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 sm:p-8 text-white relative">
            <button 
                onClick={() => navigate(-1)} 
                className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
                <ArrowLeft size={20} />
            </button>
            <div className="text-center mt-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4">
                <Eye className="h-8 w-8 text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold">Visualizar como Usuário</h1>
              <p className="text-slate-300 mt-2 text-sm sm:text-base max-w-xl mx-auto">
                Selecione qualquer membro da igreja para navegar pelo sistema exatamente como ele veria. 
                Isso afetará os menus, listagens de turmas e acessos.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {impersonatedUser && (
              <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-amber-800">Visualização Ativa</h3>
                  <p className="text-amber-700 text-sm mt-1">Você está atualmente navegando como <strong className="font-bold">{impersonatedUser.name}</strong></p>
                </div>
                <button
                  onClick={handleClear}
                  className="mt-3 sm:mt-0 px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-semibold"
                >
                  Restaurar meu perfil
                </button>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-[#991B1B] focus:border-transparent transition-all sm:text-sm"
                placeholder="Busque pelo nome ou e-mail do membro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>

            <div className="mt-6">
              {searchTerm.trim().length > 0 ? (
                filteredMembers.length > 0 ? (
                  <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                    {filteredMembers.map((member) => (
                      <li key={member.id} className="hover:bg-slate-50 transition-colors">
                        <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-[#991B1B]/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[#991B1B] font-bold text-sm">
                                {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                              </span>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{member.email || 'Sem e-mail'}</p>
                            </div>
                          </div>
                          
                          {/* Verifica se não está tentando personificar a si mesmo */}
                          {user?.email?.toLowerCase() === member.email?.toLowerCase() ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Você mesmo
                            </span>
                          ) : (
                            <button
                              onClick={() => handleImpersonate(member)}
                              className="ml-2 bg-[#991B1B] hover:bg-red-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                              Visualizar
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Users className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Nenhum membro encontrado</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Não encontramos ninguém com esse nome ou e-mail na sua igreja.
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-400 text-sm">Digite o nome ou e-mail de um membro para começar.</p>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpersonatePage;
