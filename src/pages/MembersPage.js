import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, Route, Filter, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
// NOVO: Importações do Firebase e do Spinner de Carregamento
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, appId } from '../firebaseConfig';
import LoadingSpinner from '../components/LoadingSpinner';

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
  allConnects // Ainda precisamos disso para a lógica de filtro do líder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConnect, setSelectedConnect] = useState(''); // NOVO: Filtro por Connect
  const [currentPage, setCurrentPage] = useState(1); // NOVO: Página atual
  const [itemsPerPage, setItemsPerPage] = useState(20); // NOVO: Itens por página
  // NOVO: Estados locais para gerenciar os membros e o carregamento
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // NOVO: Efeito que busca os membros do Firebase quando o componente é montado
  useEffect(() => {
    // Check both possible collection paths for members
    const fetchMembers = async () => {
      console.log('🔍 DEBUG: Starting fetchMembers - checking for existing data');
      console.log('🔍 DEBUG: appId:', appId);
      
      setLoading(true);
      try {
        let membersList = [];
        
        // Try the import path first (where bulk import saves)
        try {
          const importCollection = collection(db, `artifacts/${appId}/public/data/members`);
          console.log('🔍 DEBUG: Checking import path:', `artifacts/${appId}/public/data/members`);
          
          const importSnapshot = await getDocs(importCollection);
          console.log('🔍 DEBUG: Import collection size:', importSnapshot.size);
          
          if (importSnapshot.size > 0) {
            membersList = importSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            console.log('🔍 DEBUG: Found members in import path:', membersList.length);
          }
        } catch (importError) {
          console.error('🔍 DEBUG: Error checking import path:', importError);
        }
        
        // If no members found in import path, try the app path
        if (membersList.length === 0) {
          try {
            const appCollection = collection(db, `apps/${appId}/members`);
            console.log('🔍 DEBUG: Checking app path:', `apps/${appId}/members`);
            
            const appSnapshot = await getDocs(appCollection);
            console.log('🔍 DEBUG: App collection size:', appSnapshot.size);
            
            if (appSnapshot.size > 0) {
              membersList = appSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              console.log('🔍 DEBUG: Found members in app path:', membersList.length);
            }
          } catch (appError) {
            console.error('🔍 DEBUG: Error checking app path:', appError);
          }
        }
        
        console.log('🔍 DEBUG: Total members found:', membersList.length);
        setMembers(membersList);
        
      } catch (error) {
        console.error("Erro ao buscar membros:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []); // Removendo dependências temporariamente para debug

  // NOVO: Filtros combinados (busca por nome e Connect)
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesConnect = selectedConnect === '' || member.connectId === selectedConnect;
    return matchesSearch && matchesConnect;
  });

  // NOVO: Cálculos de paginação
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMembers = filteredMembers.slice(startIndex, endIndex);

  // NOVO: Função para resetar página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedConnect, itemsPerPage]);

  // NOVO: Função para lidar com clique na linha
  const handleRowClick = (member, event) => {
    // Evita abrir edição se clicou em um botão
    if (event.target.closest('button')) {
      return;
    }
    onEditMember(member);
  };

  // NOVO: Obter lista única de Connects para o filtro
  const availableConnects = [...new Set(members.map(member => member.connectId))]
    .filter(connectId => connectId) // Remove valores vazios
    .map(connectId => ({
      id: connectId,
      name: getConnectName(connectId)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // NOVO: Renderiza um spinner enquanto os dados são carregados
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Gerenciar Membros</h2>
        <div className="flex flex-col space-y-3">
          <button
            onClick={() => onAddMember()}
            className="bg-[#DC2626] hover:bg-[#991B1B] text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-all"
          >
            <Plus size={20} />
            <span>Adicionar Membro</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => onBulkImport()}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-all"
            >
              <Upload size={20} />
              <span>Importação em Massa</span>
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
              placeholder="Buscar membro pelo nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-white text-gray-900 rounded-md p-3 border border-gray-300 focus:ring-2 focus:ring-[#DC2626] focus:border-transparent"
            />
            
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
          </div>
        </div>
        
        {/* NOVO: Informações de resultados e paginação */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 pt-4 border-t border-gray-200 gap-4">
          <div className="text-gray-600 font-medium">
            Total: {members.length} membros | Filtrados: {filteredMembers.length} | 
            Exibindo: {Math.min(startIndex + 1, filteredMembers.length)}-{Math.min(endIndex, filteredMembers.length)}
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
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
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          currentPage === pageNum
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
    </div>
  );
};

export default MembersPage;