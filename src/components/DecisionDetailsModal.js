import React, { useState } from 'react';
import Modal from './Modal';
import { User, Phone, Mail, MapPin, FileText, CheckCircle } from 'lucide-react';

const DecisionDetailsModal = ({ isOpen, onClose, decision, onContacted, getConnectName }) => {
    const [updating, setUpdating] = useState(false);

    if (!decision) return null;

    const handleMarkAsContacted = async () => {
        setUpdating(true);
        await onContacted(decision.id, 'contatado');
        setUpdating(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" title="Detalhes da Nova Decisão">
            <div className="p-4 space-y-4">
                <div className="flex bg-red-50 p-3 rounded-md mb-4 border border-red-100">
                    <User className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-gray-800">{decision.name}</p>
                        <p className="text-sm text-gray-600">Aceitou a Jesus recentemente</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex">
                        <Phone className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">WhatsApp/Telefone</p>
                            <p className="text-gray-800">{decision.phone}</p>
                            <a href={`https://wa.me/55${decision.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:text-green-700 font-medium inline-block mt-0.5">
                                Abrir no WhatsApp
                            </a>
                        </div>
                    </div>

                    {decision.email && (
                        <div className="flex">
                            <Mail className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">E-mail</p>
                                <p className="text-gray-800">{decision.email}</p>
                            </div>
                        </div>
                    )}

                    {decision.address && (
                        <div className="flex">
                            <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Endereço</p>
                                <p className="text-gray-800">{decision.address}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex">
                        <User className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Connect Selecionado</p>
                            <p className="text-gray-800">{getConnectName(decision.connectId)}</p>
                        </div>
                    </div>

                    {decision.observations && (
                        <div className="flex bg-gray-50 p-3 rounded-md border border-gray-200 mt-2">
                            <FileText className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Observações</p>
                                <p className="text-gray-800 text-sm whitespace-pre-wrap">{decision.observations}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition">
                        Fechar
                    </button>
                    <button
                        onClick={handleMarkAsContacted}
                        disabled={updating}
                        className={`flex items-center px-4 py-2 bg-[#991B1B] text-white rounded-md hover:bg-red-800 transition ${updating ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {updating ? 'Marcando...' : (
                            <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marcar como Contatado
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DecisionDetailsModal;
