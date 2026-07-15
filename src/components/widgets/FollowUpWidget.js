import React, { useMemo } from 'react';
import { MessageCircle, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const FollowUpWidget = ({ alerts, getConnectName, visibleConnectIds }) => {
    const { isAdmin, currentUserData } = useAuthStore();
    const userEmail = (currentUserData?.email || '').toLowerCase();

    // Filtra alertas apenas para os Connects do líder logado
    const membersToFollowUp = useMemo(() => {
        const raw = (alerts || []).filter(a => a.status === 'alert');
        if (isAdmin || visibleConnectIds === null) return raw;

        if (!visibleConnectIds) return [];

        return raw.filter(a => visibleConnectIds.includes(a.connectId));
    }, [alerts, visibleConnectIds, isAdmin]);

    if (!membersToFollowUp || membersToFollowUp.length === 0) return null;

    const buildWhatsAppLink = (rawPhone, message) => {
        if (!rawPhone) return null;
        let digits = String(rawPhone).replace(/\D/g, '');
        if (!digits) return null;
        if (digits.startsWith('55')) digits = digits.slice(2);
        while (digits.startsWith('0')) digits = digits.slice(1);
        if (digits.length === 10) digits = `${digits.slice(0, 2)}9${digits.slice(2)}`;
        if (digits.length !== 11) return null;
        return `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
    };

    return (
        <div className="rounded-xl shadow-md overflow-hidden border border-stone-700">
            {/* Header — chumbo avermelhado (stone-800), igual ao Portal Pessoal */}
            <div className="bg-stone-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center text-white">
                    <Users className="h-5 w-5 mr-2 text-red-400" />
                    <h3 className="font-semibold text-lg text-white">Acompanhamento</h3>
                </div>
                <span className="bg-[#991B1B] text-white text-xs font-bold px-2 py-1 rounded-full">
                    {membersToFollowUp.length}
                </span>
            </div>

            {/* Subtítulo */}
            <div className="px-4 py-2 bg-[#7f1d1d] border-b border-red-900">
                <p className="text-xs text-red-200">
                    Membros com 4 ou mais faltas consecutivas no seu Connect
                </p>
            </div>

            {/* Corpo vermelho escuro — chama atenção em relação aos outros widgets */}
            <div className="bg-[#991B1B] divide-y divide-red-800 max-h-64 overflow-y-auto">
                {membersToFollowUp.map(alert => {
                    const msg = `Olá! Percebemos que você faltou a ${alert.absences} reuniões consecutivas do Connect ${getConnectName(alert.connectId)}. Está tudo bem? Podemos ajudar em algo?`;
                    const waLink = buildWhatsAppLink(alert.memberPhone, msg);

                    return (
                        <div
                            key={alert.memberId}
                            className="p-3 flex items-center justify-between hover:bg-[#7f1d1d] transition"
                        >
                            <div className="flex flex-col min-w-0">
                                <p className="font-semibold text-white text-sm truncate">
                                    {alert.memberName}
                                </p>
                                <p className="text-xs text-red-200">
                                    {alert.absences} falta{alert.absences !== 1 ? 's' : ''} consecutiva{alert.absences !== 1 ? 's' : ''}
                                </p>
                            </div>
                            {waLink ? (
                                <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 ml-3 inline-flex items-center gap-1 px-3 py-1.5 bg-white text-[#991B1B] rounded-md hover:bg-red-50 transition text-xs font-bold shadow"
                                >
                                    <MessageCircle size={12} />
                                    WhatsApp
                                </a>
                            ) : (
                                <span className="flex-shrink-0 ml-3 text-xs text-red-300">Sem telefone</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(FollowUpWidget);