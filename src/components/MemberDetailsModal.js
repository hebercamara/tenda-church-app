import React from 'react';
import {
  getMembershipType,
  getMembershipTypeBadge,
  hasBaptismCompleted,
  hasMembershipCompleted
} from '../utils/memberUtils';

// Utilitário simples para formatar datas brasileiras e idade
const formatBrazilianDate = (isoDate) => {
  if (!isoDate) return '—';
  try {
    const d = typeof isoDate === 'string' ? new Date(isoDate + 'T12:00:00') : (isoDate?.toDate ? isoDate.toDate() : new Date(isoDate));
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
};

const calculateAge = (isoDate) => {
  if (!isoDate) return null;
  try {
    const birth = typeof isoDate === 'string' ? new Date(isoDate + 'T12:00:00') : (isoDate?.toDate ? isoDate.toDate() : new Date(isoDate));
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
};

const MemberDetailsModal = ({ member, allConnects = [], allMembers = [] }) => {
  if (!member) return null;

  const connect = allConnects.find(c => c.id === member.connectId);
  const leader = connect ? allMembers.find(m => m.id === connect.leaderId) : null;

  const age = calculateAge(member.birthdate);

  const InfoRow = ({ label, value }) => (
    <div className="flex items-start justify-between py-1">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-gray-800 text-sm font-medium text-right ml-4 break-words">{value || '—'}</span>
    </div>
  );

  const membershipType = getMembershipType(member);
  const membershipBadge = getMembershipTypeBadge(membershipType);
  const isBaptized = hasBaptismCompleted(member);
  const isMemberCourseDone = hasMembershipCompleted(member);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-lg">
          {(member.knownBy || member.name || 'M')[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-800">{member.knownBy || member.name}</h2>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded border ${membershipBadge.bg} ${membershipBadge.color} ${membershipBadge.border}`}
              title={membershipBadge.title}
            >
              {membershipBadge.label}
            </span>
          </div>
          {member.name && member.knownBy && (
            <p className="text-xs text-gray-500">Nome completo: {member.name}</p>
          )}
        </div>
      </div>

      {/* Card de Classificação Eclesiástica / Connect */}
      <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <span>Classificação:</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded border ${membershipBadge.bg} ${membershipBadge.color} ${membershipBadge.border}`}
            >
              {membershipBadge.label}
            </span>
            <span className="text-xs text-gray-600 font-medium">({membershipBadge.name})</span>
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
            <span className="w-4 h-4 rounded flex items-center justify-center text-[11px] font-bold bg-gray-100 text-gray-700">
              {isBaptized ? '✓' : '—'}
            </span>
            <span className="text-gray-700">
              Batismo: <strong className="text-gray-800">{isBaptized ? 'Concluído' : 'Não registrado'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
            <span className="w-4 h-4 rounded flex items-center justify-center text-[11px] font-bold bg-gray-100 text-gray-700">
              {isMemberCourseDone ? '✓' : '—'}
            </span>
            <span className="text-gray-700">
              Aliança de Membresia: <strong className="text-gray-800">{isMemberCourseDone ? 'Concluído' : 'Não registrado'}</strong>
            </span>
          </div>
        </div>
        <p className="text-[11px] text-gray-500 mt-2">
          * Para ser <strong>MI (Membro de Igreja)</strong>, a pessoa precisa ter Batismo e Aliança de Membresia anotados no Trilho de Liderança. Demais cadastrados são <strong>MC (Membro de Connect)</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-md p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Contato</h3>
          <InfoRow label="E-mail" value={member.email} />
          <InfoRow label="Telefone" value={member.phone} />
        </div>

        <div className="bg-gray-50 rounded-md p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Dados Pessoais</h3>
          <InfoRow label="Nascimento" value={formatBrazilianDate(member.birthdate)} />
          <InfoRow label="Idade" value={age !== null ? `${age} anos` : '—'} />
          <InfoRow label="Sexo" value={member.gender} />
          <InfoRow label="Estado Civil" value={member.maritalStatus} />
        </div>

        <div className="bg-gray-50 rounded-md p-3 md:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Endereço</h3>
          <InfoRow label="Rua" value={member.address?.street} />
          <InfoRow label="Número" value={member.address?.number} />
          <InfoRow label="Bairro" value={member.address?.neighborhood} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
            <InfoRow label="Cidade" value={member.city} />
            <InfoRow label="Estado" value={member.state} />
            <InfoRow label="CEP" value={member.zipCode} />
          </div>
        </div>

        <div className="bg-gray-50 rounded-md p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Connect</h3>
          <InfoRow label="Connect" value={connect ? `${connect.number} - ${connect.name}` : '—'} />
          <InfoRow label="Dia" value={connect?.weekday} />
          <InfoRow label="Horário" value={connect?.time} />
        </div>

        <div className="bg-gray-50 rounded-md p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Líder</h3>
          <InfoRow label="Nome" value={leader?.name || connect?.leaderName} />
          <InfoRow label="E-mail" value={leader?.email || connect?.leaderEmail} />
          <InfoRow label="Telefone" value={leader?.phone} />
        </div>
      </div>

      <div className="bg-gray-50 rounded-md p-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Observações</h3>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{member.notes || '—'}</p>
      </div>
    </div>
  );
};

export default MemberDetailsModal;