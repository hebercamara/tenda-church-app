import React from 'react';
import { UserX, MessageCircle, AlertTriangle } from 'lucide-react';

const FollowUpWidget = ({ alerts, getConnectName }) => {
  // Filtra apenas os alertas de 4 e 5 faltas, ignorando os inativos por enquanto
  const membersToFollowUp = alerts.filter(a => a.status === 'alert');

  if (!membersToFollowUp || membersToFollowUp.length === 0) {
    return null; // Não mostra o widget se não houver alertas
  }

  const buildWhatsAppLink = (rawPhone, message) => {
    if (!rawPhone) return null;
    let digits = String(rawPhone).replace(/\D/g, '');
    if (!digits) return null;

    // Remover código do país se já estiver presente
    if (digits.startsWith('55')) digits = digits.slice(2);
    // Remover zeros iniciais (DDI/DDD com 0)
    while (digits.startsWith('0')) digits = digits.slice(1);

    // Se vier com 10 dígitos (DDD + 8), presumimos celular sem o dígito 9 e o inserimos
    if (digits.length === 10) {
      digits = `${digits.slice(0, 2)}9${digits.slice(2)}`;
    }

    // Após normalização, esperamos 11 dígitos (DDD + 9 + número)
    if (digits.length !== 11) return null;

    const withCountry = `55${digits}`;
    const encodedMsg = encodeURIComponent(message);
    return `https://wa.me/${withCountry}?text=${encodedMsg}`;
  };

  const defaultMessage = 'Estes membros faltaram a 4 ou mais reuniões consecutivas. Que tal enviar uma mensagem?';

  return (
    <div className="relative overflow-hidden rounded-xl shadow-lg h-full border border-orange-300 bg-gradient-to-br from-orange-50 via-amber-50 to-white">
      {/* Header chamativo */}
      <div className="flex items-start space-x-3 p-4 bg-gradient-to-r from-orange-100 to-amber-100 border-b border-orange-200">
        <AlertTriangle size={22} className="text-orange-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xl font-extrabold text-orange-900 leading-tight">Membros para Acompanhamento</h3>
          <p className="text-sm text-orange-800 mt-1">{defaultMessage}</p>
        </div>
      </div>

      {/* Lista de membros */}
      <div className="p-4 space-y-3 max-h-52 overflow-y-auto">
        {membersToFollowUp.map(alert => {
          const msg = `Olá! Percebemos que você faltou a ${alert.absences} reuniões consecutivas do Connect ${getConnectName(alert.connectId)}. Está tudo bem? Podemos ajudar em algo?`;
          const waLink = buildWhatsAppLink(alert.memberPhone, msg);
          return (
            <div key={alert.memberId} className="bg-white p-3 rounded-lg border border-orange-200 hover:border-orange-300 transition-shadow shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-orange-900 text-base">{alert.memberName}</p>
                  <p className="text-xs text-orange-700">Connect: {getConnectName(alert.connectId)} ({alert.absences} faltas)</p>
                </div>
                {waLink ? (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                    title="Enviar mensagem no WhatsApp"
                  >
                    <MessageCircle size={14} className="mr-1" /> Enviar WhatsApp
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">Sem telefone</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(FollowUpWidget);