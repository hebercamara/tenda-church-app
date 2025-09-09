import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, Users, Mail, MapPin, Calendar, Clock, User, Crown, Shield, Search, Filter } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionLineType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Componente customizado para nó de Supervisor
const SupervisorNode = ({ data }) => {
  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 min-w-[200px] shadow-lg">
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <Shield size={20} className="text-red-800" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-sm">{data.name}</h3>
          <div className="text-xs text-gray-600">Supervisor</div>
        </div>
      </div>
      <div className="text-xs text-gray-600">
        <div className="flex items-center space-x-1 mb-1">
          <Mail size={10} />
          <span className="truncate">{data.email}</span>
        </div>
        {data.phone && (
          <div className="flex items-center space-x-1">
            <User size={10} />
            <span>{data.phone}</span>
          </div>
        )}
      </div>
      <div className="mt-2 text-xs font-semibold text-red-800">
        {data.leaderCount} Líder{data.leaderCount !== 1 ? 'es' : ''}
      </div>
    </div>
  );
};

// Componente customizado para nó de Líder
const LeaderNode = ({ data }) => {
  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 min-w-[180px] shadow-md">
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
          <Crown size={16} className="text-red-600" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-800 text-sm">{data.name}</h4>
          <div className="text-xs text-gray-600">Líder</div>
        </div>
      </div>
      <div className="text-xs text-gray-600">
        <div className="flex items-center space-x-1 mb-1">
          <Mail size={10} />
          <span className="truncate">{data.email}</span>
        </div>
        {data.phone && (
          <div className="flex items-center space-x-1">
            <User size={10} />
            <span>{data.phone}</span>
          </div>
        )}
      </div>
      <div className="mt-2 text-xs font-semibold text-red-700">
        {data.connectCount} Connect{data.connectCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

// Componente customizado para nó de Connect
const ConnectNode = ({ data }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-2 min-w-[160px] shadow-sm">
      <div className="flex items-center space-x-2 mb-1">
        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
          <Users size={12} className="text-red-500" />
        </div>
        <div>
          <h5 className="font-medium text-gray-800 text-xs">Connect {data.number}</h5>
          <div className="text-xs text-gray-600">{data.name}</div>
        </div>
      </div>
      <div className="text-xs text-gray-600">
        <div className="flex items-center space-x-1 mb-1">
          <Calendar size={8} />
          <span>{data.weekday}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock size={8} />
          <span>{data.time}</span>
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  supervisor: SupervisorNode,
  leader: LeaderNode,
  connect: ConnectNode,
};

const LeadershipHierarchyPage = ({ connects, allMembers }) => {
  const { isAdmin } = useAuthStore();
  const [viewMode, setViewMode] = useState('flow'); // 'list' ou 'flow'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'supervisor', 'leader', 'connect'

  // Processar dados para criar hierarquia
  const hierarchyData = useMemo(() => {
    if (!connects || !allMembers) return { supervisors: [], leadersWithoutSupervisor: [], orphanConnects: [] };

    // Agrupar connects por supervisor e líder
    const connectsBySupervisor = {};
    const connectsByLeader = {};
    const orphanConnects = [];

    connects.forEach(connect => {
       if (connect.supervisorEmail) {
         if (!connectsBySupervisor[connect.supervisorEmail]) {
           connectsBySupervisor[connect.supervisorEmail] = [];
         }
         connectsBySupervisor[connect.supervisorEmail].push(connect);
       } else if (connect.leaderEmail) {
         if (!connectsByLeader[connect.leaderEmail]) {
           connectsByLeader[connect.leaderEmail] = [];
         }
         connectsByLeader[connect.leaderEmail].push(connect);
       } else {
         orphanConnects.push(connect);
       }
     });

    // Criar estrutura de supervisores
    const supervisors = Object.keys(connectsBySupervisor).map(supervisorEmail => {
      const supervisorMember = allMembers.find(member => member.email === supervisorEmail);
      const supervisorConnects = connectsBySupervisor[supervisorEmail];
      
      // Agrupar connects do supervisor por líder
       const leaderGroups = {};
       supervisorConnects.forEach(connect => {
         if (connect.leaderEmail) {
           if (!leaderGroups[connect.leaderEmail]) {
             leaderGroups[connect.leaderEmail] = [];
           }
           leaderGroups[connect.leaderEmail].push(connect);
         }
       });

      const leaders = Object.keys(leaderGroups).map(leaderEmail => {
        const leaderMember = allMembers.find(member => member.email === leaderEmail);
        return {
          email: leaderEmail,
          member: leaderMember,
          connects: leaderGroups[leaderEmail]
        };
      });

      return {
        email: supervisorEmail,
        member: supervisorMember,
        leaders,
        totalConnects: supervisorConnects.length
      };
    });

    // Líderes sem supervisor
    const leadersWithoutSupervisor = Object.keys(connectsByLeader).map(leaderEmail => {
      const leaderMember = allMembers.find(member => member.email === leaderEmail);
      return {
        email: leaderEmail,
        member: leaderMember,
        connects: connectsByLeader[leaderEmail]
      };
    });

    return { supervisors, leadersWithoutSupervisor, orphanConnects };
  }, [connects, allMembers]);

  // Converter dados hierárquicos em nós e arestas do React Flow
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes = [];
    const edges = [];
    let yPosition = 0;
    const levelHeight = 200;
    const nodeSpacing = 300;

    // Filtrar dados baseado na busca e filtro
    const filteredData = {
      supervisors: hierarchyData.supervisors.filter(supervisor => {
        if (filterType !== 'all' && filterType !== 'supervisor') return false;
        if (searchTerm && !supervisor.member?.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      }),
      leadersWithoutSupervisor: hierarchyData.leadersWithoutSupervisor.filter(leader => {
        if (filterType !== 'all' && filterType !== 'leader') return false;
        if (searchTerm && !leader.member?.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      }),
      orphanConnects: hierarchyData.orphanConnects.filter(connect => {
        if (filterType !== 'all' && filterType !== 'connect') return false;
        if (searchTerm && !connect.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      })
    };

    // Adicionar nós de supervisores
    filteredData.supervisors.forEach((supervisor, supervisorIndex) => {
      const supervisorId = `supervisor-${supervisor.email}`;
      
      nodes.push({
        id: supervisorId,
        type: 'supervisor',
        position: { x: supervisorIndex * nodeSpacing, y: yPosition },
        data: {
          name: supervisor.member?.name || supervisor.email,
          email: supervisor.email,
          phone: supervisor.member?.phone,
          leaderCount: supervisor.leaders.length
        }
      });

      // Adicionar nós de líderes do supervisor
      supervisor.leaders.forEach((leader, leaderIndex) => {
        const leaderId = `leader-${supervisor.email}-${leader.email}`;
        const leaderX = supervisorIndex * nodeSpacing + (leaderIndex - (supervisor.leaders.length - 1) / 2) * 250;
        const leaderY = yPosition + levelHeight;

        nodes.push({
          id: leaderId,
          type: 'leader',
          position: { x: leaderX, y: leaderY },
          data: {
            name: leader.member?.name || leader.email,
            email: leader.email,
            phone: leader.member?.phone,
            connectCount: leader.connects.length
          }
        });

        // Conectar supervisor ao líder
        edges.push({
          id: `edge-${supervisorId}-${leaderId}`,
          source: supervisorId,
          target: leaderId,
          type: 'smoothstep',
          style: { stroke: '#dc2626', strokeWidth: 2 }
        });

        // Adicionar nós de connects do líder
        leader.connects.forEach((connect, connectIndex) => {
          const connectId = `connect-${leader.email}-${connect.id}`;
          const connectX = leaderX + (connectIndex - (leader.connects.length - 1) / 2) * 180;
          const connectY = leaderY + levelHeight;

          nodes.push({
            id: connectId,
            type: 'connect',
            position: { x: connectX, y: connectY },
            data: {
              name: connect.name,
              number: connect.number,
              weekday: connect.weekday,
              time: connect.time
            }
          });

          // Conectar líder ao connect
          edges.push({
            id: `edge-${leaderId}-${connectId}`,
            source: leaderId,
            target: connectId,
            type: 'smoothstep',
            style: { stroke: '#dc2626', strokeWidth: 1 }
          });
        });
      });
    });

    // Calcular posição Y para líderes sem supervisor
    const maxSupervisorY = Math.max(...nodes.map(node => node.position.y), -levelHeight) + levelHeight * 3;

    // Adicionar líderes sem supervisor
    filteredData.leadersWithoutSupervisor.forEach((leader, leaderIndex) => {
      const leaderId = `leader-orphan-${leader.email}`;
      
      nodes.push({
        id: leaderId,
        type: 'leader',
        position: { x: leaderIndex * nodeSpacing, y: maxSupervisorY },
        data: {
          name: leader.member?.name || leader.email,
          email: leader.email,
          phone: leader.member?.phone,
          connectCount: leader.connects.length
        }
      });

      // Adicionar connects do líder
      leader.connects.forEach((connect, connectIndex) => {
        const connectId = `connect-orphan-${leader.email}-${connect.id}`;
        const connectX = leaderIndex * nodeSpacing + (connectIndex - (leader.connects.length - 1) / 2) * 180;
        const connectY = maxSupervisorY + levelHeight;

        nodes.push({
          id: connectId,
          type: 'connect',
          position: { x: connectX, y: connectY },
          data: {
            name: connect.name,
            number: connect.number,
            weekday: connect.weekday,
            time: connect.time
          }
        });

        edges.push({
          id: `edge-${leaderId}-${connectId}`,
          source: leaderId,
          target: connectId,
          type: 'smoothstep',
          style: { stroke: '#dc2626', strokeWidth: 1 }
        });
      });
    });

    // Adicionar connects órfãos
    const maxLeaderY = Math.max(...nodes.map(node => node.position.y), maxSupervisorY) + levelHeight * 2;
    filteredData.orphanConnects.forEach((connect, connectIndex) => {
      const connectId = `connect-orphan-${connect.id}`;
      
      nodes.push({
        id: connectId,
        type: 'connect',
        position: { x: connectIndex * 200, y: maxLeaderY },
        data: {
          name: connect.name,
          number: connect.number,
          weekday: connect.weekday,
          time: connect.time
        }
      });
    });

    return { nodes, edges };
  }, [hierarchyData, searchTerm, filterType]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Atualizar nós quando os dados mudarem
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const [expandedSupervisors, setExpandedSupervisors] = useState(new Set());
  const [expandedLeaders, setExpandedLeaders] = useState(new Set());

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
                <h3 className="font-bold text-gray-800">{leader.member?.name || leader.email}</h3>
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Mail size={12} />
                  <span>{leader.email}</span>
                </div>
                {leader.member?.phone && (
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <User size={12} />
                    <span>{leader.member.phone}</span>
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
                <h2 className="text-xl font-bold text-gray-800">{supervisor.member?.name || supervisor.email}</h2>
                <div className="flex items-center space-x-1 text-gray-600">
                  <Mail size={14} />
                  <span>{supervisor.email}</span>
                </div>
                {supervisor.member?.phone && (
                  <div className="flex items-center space-x-1 text-gray-600">
                    <User size={14} />
                    <span>{supervisor.member.phone}</span>
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

      {/* Controles de visualização */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          {/* Modo de visualização */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Visualização:</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="list">Lista</option>
              <option value="flow">Fluxograma</option>
            </select>
          </div>

          {/* Busca */}
          <div className="flex items-center space-x-2">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Filtro */}
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">Todos</option>
              <option value="supervisor">Supervisores</option>
              <option value="leader">Líderes</option>
              <option value="connect">Connects</option>
            </select>
          </div>
        </div>
      </div>

      {viewMode === 'flow' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ height: '600px' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case 'supervisor': return '#dc2626';
                  case 'leader': return '#dc2626';
                  case 'connect': return '#dc2626';
                  default: return '#6b7280';
                }
              }}
            />
            <Background variant="dots" gap={12} size={1} />
            <Panel position="top-right">
              <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">Legenda</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <Shield size={12} className="text-red-800" />
                    <span>Supervisor</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Crown size={12} className="text-red-600" />
                    <span>Líder</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users size={12} className="text-red-500" />
                    <span>Connect</span>
                  </div>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      ) : (
        hierarchyData.supervisors.length === 0 && hierarchyData.leadersWithoutSupervisor.length === 0 && hierarchyData.orphanConnects.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg text-center">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhuma hierarquia encontrada</h3>
            <p className="text-gray-500">Não há connects com líderes ou supervisores cadastrados.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {hierarchyData.supervisors.map((supervisor) => (
              <SupervisorCard key={supervisor.email} supervisor={supervisor} />
            ))}
            {hierarchyData.leadersWithoutSupervisor.map((leader) => (
              <LeaderCard key={leader.email} leader={leader} />
            ))}
            {hierarchyData.orphanConnects.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
                  <Users size={20} className="mr-2" />
                  Connects sem Líder/Supervisor
                </h3>
                <div className="space-y-2">
                  {hierarchyData.orphanConnects.map(connect => (
                    <ConnectCard key={connect.id} connect={connect} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
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