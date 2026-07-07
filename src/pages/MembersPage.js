import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Route, Filter, ChevronLeft, ChevronRight, Upload, Table } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import BatchSimpleMemberModal from '../components/BatchSimpleMemberModal';

// ALTERADO: O componente agora recebe props de usuário para fazer sua própria filtragem
const MembersPage = ({
  onAddMember,
  onEditMember,
  onDeleteMember,
  onViewTrack,
  onBulkImport,
  getConnectName,
  isAdmin,
  currentUserData,
  allConnects, // Ainda precisamos disso para a lógica de filtro do líder
  allMembers,
  allSimpleMembers,
  onSaveSimpleMember,
  onDeleteSimpleMember,
  areNamesSimilar
}) => {
  const [activeTab, setActiveTab] = useState('full');
  const [isBatchModalOpen, setBatchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConnect, setSelectedConnect] = useState(''); // NOVO: Filtro por Connect
  const [currentPage, setCurrentPage] = useState(1); // NOVO: Página atual
  const [itemsPerPage, setItemsPerPage] = useState(20); // NOVO: Itens por página
  // NOVO: Estados locais para gerenciar os membros e o carregamento
  // NOVO: Em vez de buscar do Firestore, usamos os dados já carregados e filtramos por perfil
  const userEmail = (currentUserData?.email || '').toLowerCase();
  const leaderConnectIds = Array.isArray(allConnects) ? allConnects
    .filter(c => {
      const isLeader = c.leaderId === currentUserData?.id || (c.leaderEmail || '').toLowerCase() === userEmail;
      const isSupervisor = (c.supervisorEmail || '').toLowerCase() === userEmail;
      const isAux = (
        Array.isArray(c.auxLeaders) && c.auxLeaders.some(l => l.id === currentUserData?.id || (l.email || '').toLowerCase() === userEmail)
      ) || c.auxLeaderId === currentUserData?.id || (c.auxLeaderEmail || '').toLowerCase() === userEmail;
      return isLeader || isSupervisor || isAux;
    })
    .map(c => c.id) : [];

  const members = Array.isArray(allMembers)
    ? (isAdmin ? allMembers : allMembers.filter(m => leaderConnectIds.includes(m.connectId)))
    : [];

  // NOVO: Filtros combinados (busca por nome e Connect)
  const filteredMembers = members.filter(member => {
    const matchesSearch = (member.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesConnect = selectedConnect === '' || member.connectId === selectedConnect;
    return matchesSearch && matchesConnect;
  });

  // NOVO: Filtro para cadastros simples
  const filteredSimpleMembers = (allSimpleMembers || []).filter(member => {
    return (member.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (member.lastName || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  // NOVO: Selecionar a lista atual com base na aba ativa
  const currentList = activeTab === 'full' ? filteredMembers : filteredSimpleMembers;

  // NOVO: Cálculos de paginação baseados na lista atual
  const totalPages = Math.ceil(currentList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMembers = currentList.slice(startIndex, endIndex);

  // NOVO: Função para resetar página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedConnect, itemsPerPage, activeTab]);

  // NOVO: Função para lidar com clique na linha (somente na aba de membros completos)
  const handleRowClick = (member, event) => {
    if (activeTab !== 'full') return;
    // Evita abrir edição se clicou em um botão
    if (event.target.closest('button')) {
      return;
    }
    onEditMember(member);
  };

  const handleDeleteSimple = (id, name, lastName) => {
    if (window.confirm(`Deseja realmente excluir o cadastro simplificado de "${name} ${lastName}"?`)) {
      onDeleteSimpleMember(id);
    }
  };

  // NOVO: Obter lista única de Connects para o filtro
  const availableConnects = [...new Set(members.map(member => member.connectId))]
    .filter(Boolean)
    .map(connectId => ({ id: connectId, name: getConnectName(connectId) }));

  // NOVO: Renderiza um spinner enquanto os dados são carregados via props
  if (!Array.isArray(allMembers)) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gerenciar Membros</h2>
          
          {/* Tabs para alternar entre membros normais e simplificados */}
          <div className="flex space-x-4 mt-3 border-b pb-2">
            <button
              onClick={() => setActiveTab('full')}
              className={`pb-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'full' ? 'border-[#DC2626] text-[#DC2626]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Membros Completos
            </button>
            <button
              onClick={() => setActiveTab('simple')}
              className={`pb-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'simple' ? 'border-[#DC2626] text-[#DC2626]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Alunos Simplificados (Cursos)
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {activeTab === 'full' ? (
            <>
              <button
                onClick={() => onAddMember()}
                className="bg-[#DC2626] hover:bg-[#991B1B] text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-all shadow"
              >
                <Plus size={20} />
                <span>Adicionar Membro</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => onBulkImport()}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-all shadow"
                >
                  <Upload size={20} />
                  <span>Importação em Massa</span>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setBatchModalOpen(true)}
              className="bg-[#DC2626] hover:bg-[#991B1B] text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-all shadow"
            >
              <Table size={20} />
              <span>Cadastrar em Lote (Excel)</span>
            </button>
          )}
        </div>
      </div>

      {/* NOVO: Seção de filtros aprimorada */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex items-center space-x-2 text-gray-700">
            <Filter size={20} />
            <span className="font-medium">Filtros:</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <input
              type="text"
              placeholder={activeTab === 'full' ? "Buscar membro pelo nome..." : "Buscar aluno pelo nome ou sobrenome..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-white text-gray-900 rounded-md p-3 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
            />

            {activeTab === 'full' && (
              <select
                value={selectedConnect}
                onChange={(e) => setSelectedConnect(e.target.value)}
                className="bg-white text-gray-900 rounded-md p-3 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-transparent min-w-[200px]"
              >
                <option value="">Todos os Connects</option>
                {availableConnects.map(connect => (
                  <option key={connect.id} value={connect.id}>
                    {connect.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* NOVO: Informações de resultados e paginação */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 pt-4 border-t border-gray-200 gap-4">
          <div className="text-gray-600 font-medium">
            Total: {currentList.length} registros | Filtrados: {currentList.length} |
            Exibindo: {Math.min(startIndex + 1, currentList.length)}-{Math.min(endIndex, currentList.length)}
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Itens por página:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-white text-gray-900 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] text-sm"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            {activeTab === 'full' ? (
              <>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-3 text-sm font-semibold text-gray-600">Nome</th>
                    <th className="p-3 text-sm font-semibold text-gray-600 hidden md:table-cell">E-mail</th>
                    <th className="p-3 text-sm font-semibold text-gray-600 hidden lg:table-cell">Connect</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentMembers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-500">
                        {members.length === 0 ? (
                          <div>
                            <p className="text-lg font-medium mb-2">Nenhum membro encontrado</p>
                            <p className="text-sm">Importe membros ou adicione manualmente para começar.</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-lg font-medium mb-2">Nenhum resultado encontrado</p>
                            <p className="text-sm">Tente ajustar os filtros de busca.</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    currentMembers.map(member => (
                      <tr
                        key={member.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={(e) => handleRowClick(member, e)}
                        title="Clique para editar este membro"
                      >
                        <td className="p-3">
                          <div className="font-bold text-gray-800">{member.name}</div>
                          <div className="text-gray-500 text-sm md:hidden">{member.email}</div>
                        </td>
                        <td className="p-3 text-gray-600 hidden md:table-cell">{member.email}</td>
                        <td className="p-3 text-gray-600 hidden lg:table-cell">{getConnectName(member.connectId)}</td>
                        <td className="p-3">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  onViewTrack(member);
                              }}
                              className="text-gray-500 hover:text-blue-600 transition-colors"
                              title="Ver Trilho de Liderança"
                            >
                              <Route size={18} />
                            </button>
                            {(isAdmin || leaderConnectIds.includes(member.connectId)) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteMember('member', member.id);
                                }}
                                className="text-gray-500 hover:text-red-600 transition-colors"
                                title="Excluir Membro"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            ) : (
              <>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-3 text-sm font-semibold text-gray-600">Nome</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">Sobrenome</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">Tipo de Registro</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentMembers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-500">
                        <div>
                          <p className="text-lg font-medium mb-2">Nenhum aluno simplificado encontrado</p>
                          <p className="text-sm">Clique em "Cadastrar em Lote (Excel)" para cadastrar novos alunos de curso.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentMembers.map(member => (
                      <tr
                        key={member.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-3 font-bold text-gray-800">{member.name}</td>
                        <td className="p-3 text-gray-600">{member.lastName}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-[#DC2626]">
                            Somente Curso
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleDeleteSimple(member.id, member.name, member.lastName)}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Excluir Cadastro"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>

        {/* NOVO: Controles de paginação */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Anterior
                </button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentPage === pageNum
                            ? 'bg-[#DC2626] text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                  <ChevronRight size={16} className="ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BatchSimpleMemberModal
        isOpen={isBatchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        onSave={onSaveSimpleMember}
        allMembers={allMembers}
        allSimpleMembers={allSimpleMembers}
        areNamesSimilar={areNamesSimilar}
      />
    </div>
  );
};

export default MembersPage;