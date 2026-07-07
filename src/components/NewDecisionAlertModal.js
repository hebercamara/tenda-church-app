import React, { useState } from 'react';
import Modal from './Modal';
import { Bell, Phone, CheckCircle, X, Clock, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Modal de alerta que aparece ao logar para líderes de Connect.
 * Exibe apenas as decisões pendentes do seu Connect.
 * Usa sessionStorage para não reaparecer ao navegar entre páginas.
 */
const NewDecisionAlertModal = ({ isOpen, onClose, decisions = [], onContacted, getConnectName }) => {
    const [updatingId, setUpdatingId] = useState(null);
    const navigate = useNavigate();

    if (!isOpen || decisions.length === 0) return null;

    const handleMarkContacted = async (decision) => {
        setUpdatingId(decision.id);
        await onContacted(decision.id, 'contatado');
        setUpdatingId(null);
    };

    const handleViewHistory = () => {
        onClose();
        navigate('/decisoes');
    };

    const pendingCount = decisions.filter(d => d.status === 'pendente').length;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title={
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100">
                        <Bell className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-base leading-tight">Novas Decisões</p>
                        <p className="text-xs text-gray-500 font-normal">
                            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''} no seu Connect
                        </p>
                    </div>
                </div>
            }
        >
            <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
                {decisions.map(decision => {
                    const date = decision.createdAt?.toDate
                        ? decision.createdAt.toDate()
                        : new Date(decision.createdAt || 0);
                    const dateStr = new Intl.DateTimeFormat('pt-BR', {
                        day: '2-digit', month: '2-digit', year: '2-digit'
                    }).format(date);
                    const isPending = decision.status === 'pendente';
                    const isUpdating = updatingId === decision.id;

                    return (
                        <div key={decision.id} className={`p-4 flex items-start justify-between gap-4 transition-colors ${isPending ? 'bg-white hover:bg-red-50' : 'bg-gray-50'}`}>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-gray-800">{decision.name}</span>
                                    {isPending ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                                            <Clock className="w-3 h-3" /> Pendente
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                            <CheckCircle className="w-3 h-3" /> Contatado
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <a
                                        href={`https://wa.me/55${decision.phone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-green-600 hover:underline"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {decision.phone}
                                    </a>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">Registrado em {dateStr}</p>
                            </div>

                            {/* Ação */}
                            {isPending && (
                                <button
                                    onClick={() => handleMarkContacted(decision)}
                                    disabled={isUpdating}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#991B1B] hover:bg-red-800 text-white text-xs font-semibold rounded-md transition disabled:opacity-60"
                                >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {isUpdating ? 'Salvando...' : 'Contatado'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-100">
                <button
                    onClick={handleViewHistory}
                    className="flex items-center gap-1.5 text-sm font-semibold text-[#991B1B] hover:text-red-800 transition"
                >
                    <BookOpen className="w-4 h-4" />
                    Ver histórico completo
                </button>
                <button
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-semibold rounded-md transition"
                >
                    <X className="w-4 h-4" />
                    Fechar
                </button>
            </div>
        </Modal>
    );
};

export default NewDecisionAlertModal;
