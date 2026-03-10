import React, { useState } from 'react';
import { UserPlus, ChevronRight } from 'lucide-react';
import DecisionDetailsModal from '../DecisionDetailsModal';

const PendingDecisionsWidget = ({ decisions, onContacted, getConnectName }) => {
    const [selectedDecision, setSelectedDecision] = useState(null);

    if (!decisions || decisions.length === 0) return null;

    return (
        <>
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-red-100">
                <div className="bg-gradient-to-r from-[#991B1B] to-red-800 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center text-white">
                        <UserPlus className="h-5 w-5 mr-2" />
                        <h3 className="font-semibold text-lg">Novas Decisões</h3>
                    </div>
                    <span className="bg-white text-[#991B1B] text-xs font-bold px-2 py-1 rounded-full">
                        {decisions.length}
                    </span>
                </div>

                <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto w-full">
                    {decisions.map(decision => {
                        const date = decision.createdAt?.toDate ? decision.createdAt.toDate() : new Date();
                        const dateStr = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);

                        return (
                            <div
                                key={decision.id}
                                onClick={() => setSelectedDecision(decision)}
                                className="p-3 hover:bg-red-50 cursor-pointer transition flex items-center justify-between group"
                            >
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-800 group-hover:text-red-800">{decision.name}</span>
                                    <span className="text-xs text-gray-500">Registrou em {dateStr}</span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-red-700" />
                            </div>
                        );
                    })}
                </div>
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
