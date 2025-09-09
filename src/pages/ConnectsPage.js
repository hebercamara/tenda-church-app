import React from 'react';
import { User, Home, Calendar, Edit, Trash2, Plus, ClipboardList, MapPin, Clock, Mail, FileText, BarChartHorizontal } from 'lucide-react';
// NOVO: Importando o store para buscar o status de admin
import { useAuthStore } from '../store/authStore';

// ALTERADO: O componente não recebe mais `isAdmin`
const ConnectsPage = ({
  connects,
  onAddConnect,
  onEditConnect,
  onDeleteConnect,
  onReport,
  onGenerateReport,
  onViewTrack,
}) => {
  // NOVO: Buscando o status de admin diretamente do store
  const { isAdmin } = useAuthStore();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Gerenciar Connects</h2>
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
        {connects.sort((a, b) => a.number - b.number).map(c => (
          <div key={c.id} className="bg-white rounded-lg p-4 shadow-md">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-lg text-[#DC2626]">Connect {c.number}</h4>
              <div className="flex space-x-2">
                <button onClick={() => onViewTrack(c)} className="text-gray-500 hover:text-purple-600" title="Ver Trilho de Liderança do Connect">
                    <BarChartHorizontal size={16} />
                </button>
                <button onClick={() => onGenerateReport(c)} className="text-gray-500 hover:text-green-600" title="Gerar Relatório Completo">
                    <FileText size={16} />
                </button>
                <button onClick={() => onReport(c)} className="text-gray-500 hover:text-blue-600" title="Relatório de Presença">
                  <ClipboardList size={16} />
                </button>
                <button onClick={() => onEditConnect(c)} className="text-gray-500 hover:text-[#DC2626]">
                  <Edit size={16} />
                </button>
                {isAdmin && (
                  <button onClick={() => onDeleteConnect('connect', c.id)} className="text-gray-500 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-gray-800 text-xl font-semibold">{c.name}</p>
            <p className="text-gray-600 mt-2"><User size={14} className="inline mr-2" />Líder: {c.leaderName}</p>
            <p className="text-gray-600"><Mail size={14} className="inline mr-2" />{c.leaderEmail}</p>
            <p className="text-gray-600"><Calendar size={14} className="inline mr-2" />{c.weekday}</p>
            <p className="text-gray-600"><Clock size={14} className="inline mr-2" />{c.time}</p>
            <p className="text-gray-600"><MapPin size={14} className="inline mr-2" />{c.address}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConnectsPage;