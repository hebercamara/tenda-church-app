import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Edit, Trash2, Plus, MapPin, Clock, Mail, FileText, BarChartHorizontal, CopyPlus } from 'lucide-react';
import { formatFullAddress, hasAddressData } from '../utils/addressUtils';
// NOVO: Importando o store para buscar o status de admin
import { useAuthStore } from '../store/authStore';
import Modal from '../components/Modal';
import PersonAutocomplete from '../components/PersonAutocomplete';


// ALTERADO: O componente não recebe mais `isAdmin`
const ConnectsPage = ({
  connects = [],
  onAddConnect,
  onEditConnect,
  onDeleteConnect,
  onReport,
  onGenerateReport,
  onViewTrack,
  allMembers = [],
  onSetAuxLeader,
  onRemoveAuxLeader,
}) => {
  // NOVO: Buscando o status de admin diretamente do store
  const { isAdmin, currentUserData } = useAuthStore();
  const navigate = useNavigate();
  const [auxModalConnect, setAuxModalConnect] = useState(null);
  const [selectedAuxMemberId, setSelectedAuxMemberId] = useState('');

  // Filtragem por perfil: Admin vê todos; Líder vê seus connects; Supervisor vê conects supervisionados
  const userEmail = (currentUserData?.email || '').toLowerCase();
  const filteredConnects = Array.isArray(connects) ? connects.filter(c => {
    if (isAdmin) return true;
    const leaderMatch = c.leaderId === currentUserData?.id || (c.leaderEmail || '').toLowerCase() === userEmail;
    const supervisorMatch = (c.supervisorEmail || '').toLowerCase() === userEmail;
    const auxMatch = (
      Array.isArray(c.auxLeaders) && c.auxLeaders.some(l => l.id === currentUserData?.id || (l.email || '').toLowerCase() === userEmail)
    ) || c.auxLeaderId === currentUserData?.id || (c.auxLeaderEmail || '').toLowerCase() === userEmail;
    return leaderMatch || supervisorMatch || auxMatch;
  }) : [];

  const handleCardClick = (connect, event) => {
    // Previne o clique se foi em um botão de ação
    if (event.target.closest('button')) {
      return;
    }
    onReport(connect);
  };

  const handleButtonClick = (event, action) => {
    event.stopPropagation();
    action();
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gerenciar Connects</h2>
          {!isAdmin && (
            <p className="text-sm text-gray-600 mt-1">
              Você está vendo apenas os Connects sob sua liderança/supervisão.
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => onAddConnect()}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-all"
          >
            <Plus size={20} />
            <span>Adicionar Connect</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredConnects.sort((a, b) => a.number - b.number).map(c => (
          <div
            key={c.id}
            className="bg-white rounded-lg p-4 shadow-md cursor-pointer hover:shadow-lg hover:bg-gray-50 transition-all duration-200"
            onClick={(e) => handleCardClick(c, e)}
            title="Clique para abrir o relatório de presença"
          >
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-lg text-[#DC2626]">Connect {c.number}</h4>
              <div className="flex space-x-2">
                {(isAdmin || c.leaderId === currentUserData?.id || (c.leaderEmail || '').toLowerCase() === userEmail || (c.supervisorEmail || '').toLowerCase() === userEmail) && (
                  <>
                    <button
                      onClick={(e) => handleButtonClick(e, () => onViewTrack(c))}
                      className="text-gray-500 hover:text-purple-600 p-1 rounded hover:bg-gray-200 transition-colors"
                      title="Ver Trilho de Liderança do Connect"
                    >
                      <BarChartHorizontal size={16} />
                    </button>
                    <button
                      onClick={(e) => handleButtonClick(e, () => onGenerateReport(c))}
                      className="text-gray-500 hover:text-green-600 p-1 rounded hover:bg-gray-200 transition-colors"
                      title="Gerar Relatório Completo"
                    >
                      <FileText size={16} />
                    </button>
                  </>
                )}
                {(isAdmin || c.leaderId === currentUserData?.id || (c.leaderEmail || '').toLowerCase() === userEmail || (c.supervisorEmail || '').toLowerCase() === userEmail) && (
                  <>
                    <button
                      onClick={(e) => handleButtonClick(e, () => onEditConnect(c))}
                      className="text-gray-500 hover:text-[#DC2626] p-1 rounded hover:bg-gray-200 transition-colors"
                      title="Editar Connect"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/multiplicar-connect/${c.id}`);
                      }}
                      className="text-gray-500 hover:text-blue-600 p-1 rounded hover:bg-gray-200 transition-colors"
                      title="Multiplicar Connect"
                    >
                      <CopyPlus size={16} />
                    </button>
                  </>
                )}
                {isAdmin && (
                  <button
                    onClick={(e) => handleButtonClick(e, () => onDeleteConnect('connect', c.id))}
                    className="text-gray-500 hover:text-red-600 p-1 rounded hover:bg-gray-200 transition-colors"
                    title="Excluir Connect"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-gray-800 text-xl font-semibold">{c.name}</p>
            <p className="text-gray-600 mt-2"><User size={14} className="inline mr-2" />Líder: {c.leaderName}</p>
            <p className="text-gray-600"><Mail size={14} className="inline mr-2" />{c.leaderEmail}</p>
            <div className="text-gray-600 flex items-center">
              <User size={14} className="inline mr-2" />
              {(Array.isArray(c.auxLeaders) && c.auxLeaders.length > 0) ? (
                <span>
                  {(() => {
                    const firstNames = c.auxLeaders
                      .map(l => (l?.name || '').split(' ')[0])
                      .filter(Boolean);
                    const shown = firstNames.slice(0, 3);
                    const suffix = firstNames.length > 3 ? '...' : '';
                    return `Líderes Auxiliares: ${shown.join(', ')}${suffix}`;
                  })()}
                </span>
              ) : (
                <span>
                  {(() => {
                    const firstName = (c.auxLeaderName || '').split(' ')[0];
                    return `Líderes Auxiliares: ${firstName || '—'}`;
                  })()}
                </span>
              )}
              {(isAdmin || c.leaderId === currentUserData?.id || (c.leaderEmail || '').toLowerCase() === userEmail || (c.supervisorEmail || '').toLowerCase() === userEmail) && (
                <button
                  onClick={(e) => handleButtonClick(e, () => { setAuxModalConnect(c); setSelectedAuxMemberId(''); })}
                  className="ml-2 text-gray-500 hover:text-[#DC2626] p-1 rounded hover:bg-gray-200 transition-colors"
                  title="Editar Líderes Auxiliares"
                >
                  <Edit size={14} />
                </button>
              )}
            </div>
            <p className="text-gray-600"><Calendar size={14} className="inline mr-2" />{c.weekday}</p>
            <p className="text-gray-600"><Clock size={14} className="inline mr-2" />{c.time}</p>
            {hasAddressData(c) && (
              <p className="text-gray-600"><MapPin size={14} className="inline mr-2" />{formatFullAddress(c)}</p>
            )}
            {!hasAddressData(c) && c.address && (
              <p className="text-gray-600"><MapPin size={14} className="inline mr-2" />{c.address}</p>
            )}
            {/* Removido botão antigo de "Definir Líder Auxiliar" em favor do editar inline */}
          </div>
        ))}
      </div>

      {/* Modal para editar Líderes Auxiliares (adicionar/remover) */}
      <Modal
        isOpen={!!auxModalConnect}
        onClose={() => { setAuxModalConnect(null); setSelectedAuxMemberId(''); }}
        title={auxModalConnect ? `Editar Líderes Auxiliares - Connect ${auxModalConnect.number}` : ''}
        size="lg"
      >
        {auxModalConnect && (
          <div className="space-y-4">
            {/* Lista atual de auxiliares com ação de remover */}
            <div>
              <p className="text-sm text-gray-700 mb-2">Líderes Auxiliares atuais:</p>
              {(() => {
                // Usa auxLeaders se estiver definido (mesmo que vazio). Só faz fallback
                // para campos legados quando auxLeaders não existe.
                const auxList = Array.isArray(auxModalConnect.auxLeaders)
                  ? auxModalConnect.auxLeaders
                  : (auxModalConnect.auxLeaderId ? [{ id: auxModalConnect.auxLeaderId, email: auxModalConnect.auxLeaderEmail, name: auxModalConnect.auxLeaderName }] : []);
                if (auxList.length === 0) {
                  return <p className="text-sm text-gray-500">Nenhum auxiliar definido.</p>;
                }
                return (
                  <ul className="divide-y divide-gray-200 border rounded">
                    {auxList.map(l => (
                      <li key={l.id} className="flex items-center justify-between px-3 py-2">
                        <span className="text-gray-800">{l.name}</span>
                        <button
                          className="text-gray-500 hover:text-red-600 p-1 rounded hover:bg-gray-100"
                          title="Remover auxiliar"
                          onClick={async () => {
                            await onRemoveAuxLeader(auxModalConnect, l.id);
                            // Atualização local para feedback imediato
                            const nextList = auxList.filter(x => x.id !== l.id);
                            setAuxModalConnect(prev => ({
                              ...prev,
                              auxLeaders: nextList,
                              // Se o auxiliar legado removido corresponde ao atual, atualiza/limpa os campos legados
                              ...(prev.auxLeaderId === l.id
                                ? {
                                  auxLeaderId: nextList[0]?.id || '',
                                  auxLeaderEmail: nextList[0]?.email || '',
                                  auxLeaderName: nextList[0]?.name || '',
                                }
                                : {})
                            }));
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>

            {/* Inclusão de novo auxiliar */}
            <div>
              <p className="text-sm text-gray-700 mb-2">Adicionar Líder Auxiliar:</p>
              {(() => {
                const auxIds = (Array.isArray(auxModalConnect.auxLeaders) ? auxModalConnect.auxLeaders : []).map(a => a.id);
                const options = allMembers
                  .filter(m => m.connectId === auxModalConnect.id && m.email && !auxIds.includes(m.id))
                  .map(m => ({ value: m.id, label: m.name }));
                return (
                  <div className="flex items-center space-x-2">
                    <PersonAutocomplete
                      value={selectedAuxMemberId}
                      onChange={setSelectedAuxMemberId}
                      placeholder="Selecione o membro..."
                      options={options}
                    />
                    <button
                      className="px-3 py-2 rounded bg-[#DC2626] text-white hover:bg-[#991B1B]"
                      onClick={async () => {
                        if (!selectedAuxMemberId) return;
                        await onSetAuxLeader(auxModalConnect, selectedAuxMemberId);
                        // Atualizar lista local
                        const member = allMembers.find(m => m.id === selectedAuxMemberId);
                        const newItem = member ? { id: member.id, email: member.email, name: member.name } : null;
                        setAuxModalConnect(prev => ({ ...prev, auxLeaders: [...(prev.auxLeaders || []), ...(newItem ? [newItem] : [])] }));
                        setSelectedAuxMemberId('');
                      }}
                    >
                      Adicionar
                    </button>
                  </div>
                );
              })()}
              <p className="text-xs text-gray-500 mt-1">Apenas membros deste Connect com e-mail podem ser auxiliares.</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => { setAuxModalConnect(null); setSelectedAuxMemberId(''); }}
                className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ConnectsPage;
