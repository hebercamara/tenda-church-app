import React from 'react';
import { User, Mail, Phone, Calendar, Users, AlertTriangle } from 'lucide-react';

const DuplicateMemberModal = React.memo(({ isOpen, onClose, onConfirm, onReject, existingMember, newMemberData }) => {
    if (!isOpen) return null;

    const renderField = (icon, label, existingValue, newValue) => (
        <div className="flex items-start text-sm">
            <div className="w-5 mr-2 text-gray-500">{icon}</div>
            <div className="flex-1">
                <strong className="font-semibold text-gray-800">{label}:</strong>
                <p className={`text-gray-600 ${existingValue !== newValue && newValue ? 'text-red-600 font-bold' : ''}`}>
                    {existingValue || <span className="italic text-gray-400">Não informado</span>}
                </p>
                {existingValue !== newValue && newValue && (
                    <p className="text-blue-600 font-bold">Novo: {newValue}</p>
                )}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl text-left">
                <div className="flex items-center text-orange-600 mb-4">
                    <AlertTriangle className="h-8 w-8 mr-3" />
                    <h3 className="text-xl font-bold">Possível Duplicidade Encontrada</h3>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                    Encontramos um membro no sistema com dados muito parecidos. Por favor, verifique se não se trata da mesma pessoa antes de continuar.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <h4 className="font-bold text-lg text-gray-800 mb-3">Cadastro Existente</h4>
                        <div className="space-y-2">
                            {renderField(<User size={16} />, "Nome", existingMember.name)}
                            {renderField(<Mail size={16} />, "E-mail", existingMember.email)}
                            {renderField(<Phone size={16} />, "Telefone", existingMember.phone)}
                            {renderField(<Calendar size={16} />, "Nascimento", existingMember.dob)}
                        </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-lg text-blue-800 mb-3">Novo Cadastro</h4>
                        <div className="space-y-2">
                            {renderField(<User size={16} />, "Nome", existingMember.name, newMemberData.name)}
                            {renderField(<Mail size={16} />, "E-mail", existingMember.email, newMemberData.email)}
                            {renderField(<Phone size={16} />, "Telefone", existingMember.phone, newMemberData.phone)}
                            {renderField(<Calendar size={16} />, "Nascimento", existingMember.dob, newMemberData.dob)}
                        </div>
                    </div>
                </div>

                <p className="text-center font-semibold text-gray-800 mt-6 mb-4">Os registros acima são da mesma pessoa?</p>

                <div className="mt-6 flex justify-center gap-4">
                    <button onClick={() => onReject()} className="px-6 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">
                        Não, são pessoas diferentes
                    </button>
                    <button onClick={() => onConfirm()} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700">
                        Sim, é a mesma pessoa
                    </button>
                </div>
            </div>
        </div>
    );
});

export default DuplicateMemberModal;