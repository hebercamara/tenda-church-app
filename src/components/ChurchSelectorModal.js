import React from 'react';
import { Building2 } from 'lucide-react';

const ChurchSelectorModal = ({ isOpen, churches, onSelect, onClose }) => {
  if (!isOpen || !churches || churches.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-fade-in">
        <div className="text-center mb-5">
          <Building2 size={36} className="mx-auto text-blue-600 mb-3" />
          <h2 className="text-xl font-bold text-gray-800">Selecione a Igreja</h2>
          <p className="text-sm text-gray-500 mt-1">Seu e-mail está vinculado a mais de uma igreja.</p>
        </div>
        <div className="space-y-2">
          {churches.map((church) => (
            <button
              key={church.id}
              onClick={() => onSelect(church.id, church)}
              className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center space-x-3 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {church.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-semibold text-gray-800 group-hover:text-blue-700">{church.name}</p>
                {church.adminEmail && (
                  <p className="text-xs text-gray-400">{church.adminEmail}</p>
                )}
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default ChurchSelectorModal;
