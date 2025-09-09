import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, Route } from 'lucide-react';
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
  getConnectName,
  isAdmin,
  currentUserData,
  allConnects // Ainda precisamos disso para a lógica de filtro do líder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  // NOVO: Estados locais para gerenciar os membros e o carregamento
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // NOVO: Efeito que busca os membros do Firebase quando o componente é montado
  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const membersCollection = collection(db, `artifacts/${appId}/public/data/members`);
        let membersQuery;

        if (isAdmin) {
          // Se for admin, busca todos os membros
          membersQuery = query(membersCollection, orderBy('name'));
        } else {
          // Se não for admin (líder), busca apenas os membros dos connects que ele lidera/supervisiona
          const ledConnects = allConnects.filter(c => c.leaderEmail?.toLowerCase() === currentUserData.email?.toLowerCase());
          const supervisedConnects = allConnects.filter(c => c.supervisorEmail?.toLowerCase() === currentUserData.email?.toLowerCase());
          const visibleConnectIds = [...new Set([...ledConnects, ...supervisedConnects].map(c => c.id))];

          if (visibleConnectIds.length > 0) {
            // Firestore tem um limite de 30 itens para o operador 'in'. Para mais, seria necessária outra abordagem.
            membersQuery = query(membersCollection, where('connectId', 'in', visibleConnectIds), orderBy('name'));
          } else {
            // Se o líder não lidera nenhum connect, não busca nenhum membro.
            setMembers([]);
            setLoading(false);
            return;
          }
        }
        
        const querySnapshot = await getDocs(membersQuery);
        const membersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMembers(membersList);
      } catch (error) {
        console.error("Erro ao buscar membros:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [isAdmin, currentUserData, allConnects]); // Roda o efeito se o status do usuário mudar

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // NOVO: Renderiza um spinner enquanto os dados são carregados
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Gerenciar Membros</h2>
        <button
          onClick={() => onAddMember()}
          className="bg-[#DC2626] hover:bg-[#991B1B] text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-all"
        >
          <Plus size={20} />
          <span>Adicionar Membro</span>
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar membro pelo nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md bg-white text-gray-900 rounded-md p-3 border border-gray-300 focus:ring-2 focus:ring-[#DC2626]"
        />
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
              {filteredMembers.map(member => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-gray-800">{member.name}</div>
                    <div className="text-gray-500 text-sm md:hidden">{member.email}</div>
                  </td>
                  <td className="p-3 text-gray-600 hidden md:table-cell">{member.email}</td>
                  <td className="p-3 text-gray-600 hidden lg:table-cell">{getConnectName(member.connectId)}</td>
                  <td className="p-3">
                    <div className="flex items-center space-x-3">
                      <button onClick={() => onViewTrack(member)} className="text-gray-500 hover:text-blue-600" title="Ver Trilho de Liderança">
                        <Route size={18} />
                      </button>
                      <button onClick={() => onEditMember(member)} className="text-gray-500 hover:text-[#DC2626]" title="Editar Membro">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => onDeleteMember('member', member.id)} className="text-gray-500 hover:text-red-600" title="Excluir Membro">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MembersPage;