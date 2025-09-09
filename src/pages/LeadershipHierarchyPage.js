import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Users, Mail, MapPin, Calendar, Clock, User, Crown, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const LeadershipHierarchyPage = ({ connects, allMembers }) => {
  const { isAdmin } = useAuthStore();
  const [expandedSupervisors, setExpandedSupervisors] = useState(new Set());
  const [expandedLeaders, setExpandedLeaders] = useState(new Set());

  // Processar dados para criar hierarquia
  const hierarchyData = useMemo(() => {
    if (!connects || !allMembers) return [];

    // Agrupar connects por supervisor
    const supervisorGroups = {};
    const leaderGroups = {};
    const orphanConnects = [];

    connects.forEach(connect => {
      if (connect.supervisorEmail) {
        // Tem supervisor
        if (!supervisorGroups[connect.supervisorEmail]) {
          supervisorGroups[connect.supervisorEmail] = {
            email: connect.supervisorEmail,
            connects: [],
            leaders: new Set()
          };
        }
        supervisorGroups[connect.supervisorEmail].connects.push(connect);
        if (connect.leaderEmail) {
          supervisorGroups[connect.supervisorEmail].leaders.add(connect.leaderEmail);
        }
      } else if (connect.leaderEmail) {
        // Tem líder mas não supervisor
        if (!leaderGroups[connect.leaderEmail]) {
          leaderGroups[connect.leaderEmail] = {
            email: connect.leaderEmail,
            name: connect.leaderName,
            connects: []
          };
        }
        leaderGroups[connect.leaderEmail].connects.push(connect);
      } else {
        // Não tem nem supervisor nem líder
        orphanConnects.push(connect);
      }
    });

    // Converter para array e organizar
    const hierarchy = [];

    // Adicionar supervisores
    Object.values(supervisorGroups).forEach(supervisor => {
      const supervisorMember = allMembers.find(m => m.email?.toLowerCase() === supervisor.email?.toLowerCase());
      
      const supervisorData = {
        type: 'supervisor',
        email: supervisor.email,
        name: supervisorMember?.name || 'Nome não encontrado',
        phone: supervisorMember?.phone || '',
        leaders: []
      };

      // Agrupar connects por líder dentro deste supervisor
      const leaderConnects = {};
      supervisor.connects.forEach(connect => {
        if (connect.leaderEmail) {
          if (!leaderConnects[connect.leaderEmail]) {
            leaderConnects[connect.leaderEmail] = {
              email: connect.leaderEmail,
              name: connect.leaderName,
              connects: []
            };
          }
          leaderConnects[connect.leaderEmail].connects.push(connect);
        }
      });

      // Adicionar líderes ao supervisor
      Object.values(leaderConnects).forEach(leader => {
        const leaderMember = allMembers.find(m => m.email?.toLowerCase() === leader.email?.toLowerCase());
        supervisorData.leaders.push({
          type: 'leader',
          email: leader.email,
          name: leader.name || leaderMember?.name || 'Nome não encontrado',
          phone: leaderMember?.phone || '',
          connects: leader.connects
        });
      });

      hierarchy.push(supervisorData);
    });

    // Adicionar líderes sem supervisor
    Object.values(leaderGroups).forEach(leader => {
      const leaderMember = allMembers.find(m => m.email?.toLowerCase() === leader.email?.toLowerCase());
      hierarchy.push({
        type: 'leader',
        email: leader.email,
        name: leader.name || leaderMember?.name || 'Nome não encontrado',
        phone: leaderMember?.phone || '',
        connects: leader.connects
      });
    });

    // Adicionar connects órfãos
    if (orphanConnects.length > 0) {
      hierarchy.push({
        type: 'orphan',
        name: 'Connects sem Líder/Supervisor',
        connects: orphanConnects
      });
    }

    return hierarchy;
  }, [connects, allMembers]);

  const toggleSupervisor = (email) => {
    const newExpanded = new Set(expandedSupervisors);
    if (newExpanded.has(email)) {
      newExpanded.delete(email);
    } else {
      newExpanded.add(email);
    }
    setExpandedSupervisors(newExpanded);
  };

  const toggleLeader = (email) => {
    const newExpanded = new Set(expandedLeaders);
    if (newExpanded.has(email)) {
      newExpanded.delete(email);
    } else {
      newExpanded.add(email);
    }
    setExpandedLeaders(newExpanded);
  };

  const ConnectCard = ({ connect, level = 0 }) => (
    <div className={`ml-${level * 8} bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <Users size={16} className="text-red-500" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">Connect {connect.number}</h4>
            <p className="text-sm text-gray-600">{connect.name}</p>
          </div>
        </div>
        <div className="text-right text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Calendar size={12} />
            <span>{connect.weekday}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock size={12} />
            <span>{connect.time}</span>
          </div>
        </div>
      </div>
      {connect.address && (
        <div className="mt-2 flex items-center space-x-1 text-sm text-gray-600">
          <MapPin size={12} />
          <span>{connect.address}</span>
        </div>
      )}
    </div>
  );

  const LeaderCard = ({ leader, level = 0 }) => {
    const isExpanded = expandedLeaders.has(leader.email);
    const hasConnects = leader.connects && leader.connects.length > 0;

    return (
      <div className={`ml-${level * 4}`}>
        <div 
          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3 cursor-pointer hover:bg-red-100 transition-colors"
          onClick={() => hasConnects && toggleLeader(leader.email)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {hasConnects && (
                <div className="text-red-600">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              )}
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Crown size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{leader.name}</h3>
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Mail size={12} />
                  <span>{leader.email}</span>
                </div>
                {leader.phone && (
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <User size={12} />
                    <span>{leader.phone}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-red-700">
                {hasConnects ? `${leader.connects.length} Connect${leader.connects.length !== 1 ? 's' : ''}` : 'Sem Connects'}
              </div>
              <div className="text-xs text-gray-500">Líder</div>
            </div>
          </div>
        </div>
        
        {isExpanded && hasConnects && (
          <div className="ml-6 space-y-2">
            {leader.connects.map(connect => (
              <ConnectCard key={connect.id} connect={connect} level={1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const SupervisorCard = ({ supervisor }) => {
    const isExpanded = expandedSupervisors.has(supervisor.email);
    const hasLeaders = supervisor.leaders && supervisor.leaders.length > 0;

    return (
      <div className="mb-6">
        <div 
          className="bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer hover:bg-red-100 transition-colors"
          onClick={() => hasLeaders && toggleSupervisor(supervisor.email)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {hasLeaders && (
                <div className="text-red-800">
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              )}
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Shield size={24} className="text-red-800" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{supervisor.name}</h2>
                <div className="flex items-center space-x-1 text-gray-600">
                  <Mail size={14} />
                  <span>{supervisor.email}</span>
                </div>
                {supervisor.phone && (
                  <div className="flex items-center space-x-1 text-gray-600">
                    <User size={14} />
                    <span>{supervisor.phone}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-red-800">
                {hasLeaders ? `${supervisor.leaders.length} Líder${supervisor.leaders.length !== 1 ? 'es' : ''}` : 'Sem Líderes'}
              </div>
              <div className="text-sm text-gray-500">Supervisor</div>
            </div>
          </div>
        </div>
        
        {isExpanded && hasLeaders && (
          <div className="mt-4 ml-4 space-y-3">
            {supervisor.leaders.map(leader => (
              <LeaderCard key={leader.email} leader={leader} level={1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">⚠️ Acesso Restrito</h3>
        <p className="text-red-700">Esta página é acessível apenas para administradores.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Hierarquia de Liderança</h1>
        <p className="text-gray-600">Visualização da estrutura organizacional de supervisores e líderes</p>
      </div>

      {hierarchyData.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg text-center">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhuma hierarquia encontrada</h3>
          <p className="text-gray-500">Não há connects com líderes ou supervisores cadastrados.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {hierarchyData.map((item, index) => {
            if (item.type === 'supervisor') {
              return <SupervisorCard key={item.email} supervisor={item} />;
            } else if (item.type === 'leader') {
              return <LeaderCard key={item.email} leader={item} />;
            } else if (item.type === 'orphan') {
              return (
                <div key="orphan" className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
                    <Users size={20} className="mr-2" />
                    {item.name}
                  </h3>
                  <div className="space-y-2">
                    {item.connects.map(connect => (
                      <ConnectCard key={connect.id} connect={connect} />
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      <div className="mt-8 bg-white p-4 rounded-xl shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Como usar
        </h3>
        <ul className="text-gray-600 space-y-2 text-sm">
          <li className="flex items-start space-x-2">
            <Shield size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
            <span><strong className="text-gray-800">Supervisores</strong> aparecem no topo da hierarquia</span>
          </li>
          <li className="flex items-start space-x-2">
            <Crown size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
            <span><strong className="text-gray-800">Líderes</strong> aparecem organizados sob seus supervisores</span>
          </li>
          <li className="flex items-start space-x-2">
            <Users size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
            <span><strong className="text-gray-800">Connects</strong> são listados sob cada líder responsável</span>
          </li>
          <li className="flex items-start space-x-2">
            <ChevronRight size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <span>Clique nos cards para <strong className="text-gray-800">expandir/colapsar</strong> a visualização</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default LeadershipHierarchyPage;