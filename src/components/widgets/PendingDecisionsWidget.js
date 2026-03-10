import React, { useState } from 'react';
import { UserPlus, ChevronRight, ChevronLeft, CheckCircle, Clock } from 'lucide-react';
import DecisionDetailsModal from '../DecisionDetailsModal';

const PendingDecisionsWidget = ({ decisions, onContacted, getConnectName }) => {
    const [selectedDecision, setSelectedDecision] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // if (!decisions || decisions.length === 0) return null; // Removing early return to always show card

    const totalPages = Math.ceil((decisions?.length || 0) / itemsPerPage);
    const currentDecisions = (decisions || []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <>
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-red-100">
                <div className="bg-gradient-to-r from-[#991B1B] to-red-800 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center text-white">
                        <UserPlus className="h-5 w-5 mr-2" />
                        <h3 className="font-semibold text-lg">Novas Decisões</h3>
                    </div>
                    <span className="bg-white text-[#991B1B] text-xs font-bold px-2 py-1 rounded-full">
                        {decisions?.length || 0}
                    </span>
                </div>

                <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto w-full">
                    {!decisions || decisions.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            Não há registros de novas decisões no momento.
                        </div>
                    ) : (
                        currentDecisions.map(decision => {
                            const date = decision.createdAt?.toDate ? decision.createdAt.toDate() : new Date();
                            const dateStr = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);

                            return (
                                <div
                                    key={decision.id}
                                    onClick={() => setSelectedDecision(decision)}
                                    className="p-3 hover:bg-red-50 cursor-pointer transition flex items-center justify-between group"
                                >
                                    <div className="flex flex-col">
                                        <div className="flex items-center">
                                            <span className="font-medium text-gray-800 group-hover:text-red-800 mr-2">{decision.name}</span>
                                            {decision.status === 'contatado' ? (
                                                <span className="flex items-center text-[10px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Contatado
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-[10px] text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Pendente
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500">Registrou em {dateStr}</span>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-red-700" />
                                </div>
                            );
                        }))}
                </div>

                {totalPages > 1 && (
                    <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-t border-gray-100 text-sm">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-gray-600">Página {currentPage} de {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {selectedDecision && (
                <DecisionDetailsModal
                    isOpen={!!selectedDecision}
                    onClose={() => setSelectedDecision(null)}
                    decision={selectedDecision}
                    onContacted={onContacted}
                    getConnectName={getConnectName}
                />
            )}
        </>
    );
};

export default PendingDecisionsWidget;
