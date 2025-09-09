import React from 'react';
import { UserX } from 'lucide-react';

const FollowUpWidget = ({ alerts, getConnectName }) => {
  // Filtra apenas os alertas de 4 e 5 faltas, ignorando os inativos por enquanto
  const membersToFollowUp = alerts.filter(a => a.status === 'alert');

  if (!membersToFollowUp || membersToFollowUp.length === 0) {
    return null; // Não mostra o widget se não houver alertas
  }

  return (
    <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-md h-full">
      <div className="flex items-start space-x-2 sm:space-x-3 mb-3 sm:mb-4">
        <UserX size={20} className="sm:w-6 sm:h-6 text-orange-500 flex-shrink-0 mt-0.5" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Membros para Acompanhamento</h3>
      </div>
      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
        Estes membros faltaram a 4 ou mais reuniões consecutivas. Que tal enviar uma mensagem?
      </p>
      <div className="space-y-2 sm:space-y-3 max-h-40 sm:max-h-48 overflow-y-auto pr-1 sm:pr-2">
        {membersToFollowUp.map(alert => (
          <div key={alert.memberId} className="bg-orange-50 p-2 sm:p-3 rounded-md border border-orange-200">
            <p className="font-semibold text-orange-800 text-sm sm:text-base truncate">{alert.memberName}</p>
            <p className="text-xs text-orange-700">
              Connect: {getConnectName(alert.connectId)} ({alert.absences} faltas)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(FollowUpWidget);