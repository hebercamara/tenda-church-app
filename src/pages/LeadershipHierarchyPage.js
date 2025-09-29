import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Users, Mail, MapPin, Calendar, Clock, User, Crown, Shield, Search, Filter, Star } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { formatFullAddress, hasAddressData } from '../utils/addressUtils';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionLineType,
  Panel,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Componente customizado para nó de Pastor
const PastorNode = ({ data }) => {
  return (
    <>
      <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 min-w-[220px] shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
            <Star size={24} className="text-red-900" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-base">{data.name}</h3>
            <div className="text-sm text-gray-700 font-semibold">Pastor</div>
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
        <div className="mt-2 text-sm font-bold text-red-900">
          {data.supervisorCount} Supervisor{data.supervisorCount !== 1 ? 'es' : ''}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#7f1d1d' }} />
    </>
  );
};

// Componente customizado para nó de Supervisor
const SupervisorNode = ({ data }) => {
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: '#7f1d1d' }} />
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
      <Handle type="source" position={Position.Bottom} style={{ background: '#dc2626' }} />
    </>
  );
};

// Componente customizado para nó de Líder
const LeaderNode = ({ data }) => {
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: '#991b1b' }} />
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 min-w-[180px] shadow-md">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <Crown size={16} className="text-red-700" />
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
        <div className="mt-2 text-xs font-semibold text-red-800">
          {data.connectCount} Connect{data.connectCount !== 1 ? 's' : ''}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#991b1b' }} />
    </>
  );
};

// Componente customizado para nó de Connect
const ConnectNode = ({ data }) => {
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: '#7f1d1d' }} />
      <div className="bg-red-50 border border-red-200 rounded-lg p-2 min-w-[160px] shadow-sm">
        <div className="flex items-center space-x-2 mb-1">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <Users size={12} className="text-red-600" />
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
    </>
  );
};

// Definir nodeTypes fora do componente para evitar recriação
const nodeTypes = {
  pastor: PastorNode,
  supervisor: SupervisorNode,
  leader: LeaderNode,
  connect: ConnectNode,
};

const LeadershipHierarchyPage = ({ connects, allMembers }) => {
  const { isAdmin } = useAuthStore();
  

  const [viewMode, setViewMode] = useState('flow'); // 'list' ou 'flow'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'pastor', 'supervisor', 'leader', 'connect'

  // Ref para controlar o ReactFlow e evitar ResizeObserver warnings
  const reactFlowWrapper = useRef(null);
  const resizeTimeoutRef = useRef(null);

  // Função de debouncing para redimensionamento
  const debouncedResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(() => {
      // Força uma atualização suave do layout
      if (reactFlowWrapper.current) {
        const reactFlowInstance = reactFlowWrapper.current;
        if (reactFlowInstance.fitView) {
          reactFlowInstance.fitView({ padding: 0.2, duration: 200 });
        }
      }
    }, 100);
  }, []);

  // Cleanup do timeout de redimensionamento
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);





  // Processar dados para criar hierarquia
  const hierarchyData = useMemo(() => {
    if (!connects || !allMembers) {
      return { pastors: [], supervisors: [], leadersWithoutSupervisor: [], orphanConnects: [] };
    }

    // Agrupar connects por pastor, supervisor e líder
    const connectsByPastor = {};
    const connectsBySupervisor = {};
    const connectsByLeader = {};
    const orphanConnects = [];

    connects.forEach(connect => {
       if (connect.pastorEmail) {
         if (!connectsByPastor[connect.pastorEmail]) {
           connectsByPastor[connect.pastorEmail] = [];
         }
         connectsByPastor[connect.pastorEmail].push(connect);
       } else if (connect.supervisorEmail) {
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

    // Criar estrutura de pastores
    const pastors = Object.keys(connectsByPastor).map(pastorEmail => {
      const pastorMember = allMembers.find(member => member.email === pastorEmail);
      const pastorConnects = connectsByPastor[pastorEmail];
      
      // Agrupar connects do pastor por supervisor
      const supervisorGroups = {};
      pastorConnects.forEach(connect => {
        if (connect.supervisorEmail) {
          if (!supervisorGroups[connect.supervisorEmail]) {
            supervisorGroups[connect.supervisorEmail] = [];
          }
          supervisorGroups[connect.supervisorEmail].push(connect);
        }
      });

      const supervisors = Object.keys(supervisorGroups).map(supervisorEmail => {
        const supervisorMember = allMembers.find(member => member.email === supervisorEmail);
        const supervisorConnects = supervisorGroups[supervisorEmail];
        
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

      return {
        email: pastorEmail,
        member: pastorMember,
        supervisors,
        totalConnects: pastorConnects.length
      };
    });

    // Criar estrutura de supervisores sem pastor
    const supervisorsWithoutPastor = Object.keys(connectsBySupervisor).map(supervisorEmail => {
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

    return { pastors, supervisors: supervisorsWithoutPastor, leadersWithoutSupervisor, orphanConnects };
  }, [connects, allMembers]);

  // Filtrar dados baseado na busca e filtro (usado tanto para ReactFlow quanto para visualização em lista)
  const filteredData = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    // Função auxiliar para verificar se um item corresponde à busca
    const matchesSearch = (item, type) => {
      if (!searchTerm) return true;
      
      switch (type) {
        case 'supervisor':
        case 'leader':
          return item.member?.name?.toLowerCase().includes(searchLower) || 
                 item.email?.toLowerCase().includes(searchLower);
        case 'connect':
          return item.name?.toLowerCase().includes(searchLower) ||
                 item.number?.toString().includes(searchTerm);
        default:
          return true;
      }
    };

    return {
      pastors: hierarchyData.pastors.filter(pastor => {
        if (filterType !== 'all' && filterType !== 'pastor') return false;
        return matchesSearch(pastor, 'supervisor');
      }),
      supervisors: hierarchyData.supervisors.filter(supervisor => {
        if (filterType !== 'all' && filterType !== 'supervisor') return false;
        
        // Se está buscando, incluir supervisor se ele ou seus líderes/connects correspondem
        if (searchTerm) {
          const supervisorMatches = matchesSearch(supervisor, 'supervisor');
          const hasMatchingLeader = supervisor.leaders?.some(leader => 
            matchesSearch(leader, 'leader') || 
            leader.connects?.some(connect => matchesSearch(connect, 'connect'))
          );
          return supervisorMatches || hasMatchingLeader;
        }
        
        return true;
      }).map(supervisor => {
        // Filtrar líderes do supervisor se necessário
        if (searchTerm || filterType === 'leader' || filterType === 'connect') {
          return {
            ...supervisor,
            leaders: supervisor.leaders?.filter(leader => {
              if (filterType === 'connect') return false; // Se filtrando só connects, não mostrar líderes
              if (filterType === 'leader' || filterType === 'all') {
                if (searchTerm) {
                  const leaderMatches = matchesSearch(leader, 'leader');
                  const hasMatchingConnect = leader.connects?.some(connect => matchesSearch(connect, 'connect'));
                  return leaderMatches || hasMatchingConnect;
                }
                return true;
              }
              return false;
            }).map(leader => ({
              ...leader,
              connects: leader.connects?.filter(connect => {
                if (filterType === 'connect' || filterType === 'all') {
                  return matchesSearch(connect, 'connect');
                }
                return searchTerm ? matchesSearch(connect, 'connect') : true;
              })
            }))
          };
        }
        return supervisor;
      }),
      leadersWithoutSupervisor: hierarchyData.leadersWithoutSupervisor.filter(leader => {
        if (filterType !== 'all' && filterType !== 'leader') return false;
        
        if (searchTerm) {
          const leaderMatches = matchesSearch(leader, 'leader');
          const hasMatchingConnect = leader.connects?.some(connect => matchesSearch(connect, 'connect'));
          return leaderMatches || hasMatchingConnect;
        }
        
        return true;
      }).map(leader => ({
        ...leader,
        connects: leader.connects?.filter(connect => {
          if (filterType === 'connect' || filterType === 'all') {
            return matchesSearch(connect, 'connect');
          }
          return searchTerm ? matchesSearch(connect, 'connect') : true;
        })
      })),
      orphanConnects: hierarchyData.orphanConnects.filter(connect => {
        if (filterType !== 'all' && filterType !== 'connect') return false;
        return matchesSearch(connect, 'connect');
      })
    };
  }, [hierarchyData, searchTerm, filterType]);

  // Converter dados hierárquicos em nós e arestas do React Flow
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes = [];
    const edges = [];
    let yPosition = 0;
    const levelHeight = 200;
    const nodeSpacing = 300;

    // Adicionar nós de pastores
    filteredData.pastors.forEach((pastor, pastorIndex) => {
      const pastorId = `pastor-${pastor.email}`;
      
      nodes.push({
        id: pastorId,
        type: 'pastor',
        position: { x: pastorIndex * nodeSpacing, y: yPosition },
        data: {
          name: pastor.member?.name || pastor.email,
          email: pastor.email,
          phone: pastor.member?.phone,
          supervisorCount: pastor.supervisors.length
        }
      });

      // Adicionar nós de supervisores do pastor
      pastor.supervisors.forEach((supervisor, supervisorIndex) => {
        const supervisorId = `supervisor-${pastor.email}-${supervisor.email}`;
        const supervisorX = pastorIndex * nodeSpacing + (supervisorIndex - (pastor.supervisors.length - 1) / 2) * 250;
        const supervisorY = yPosition + levelHeight;

        nodes.push({
          id: supervisorId,
          type: 'supervisor',
          position: { x: supervisorX, y: supervisorY },
          data: {
            name: supervisor.member?.name || supervisor.email,
            email: supervisor.email,
            phone: supervisor.member?.phone,
            leaderCount: supervisor.leaders.length
          }
        });

        // Conectar pastor ao supervisor
        edges.push({
          id: `edge-${pastorId}-${supervisorId}`,
          source: pastorId,
          target: supervisorId,
          type: 'smoothstep',
          style: { 
            stroke: '#7c3aed', 
            strokeWidth: 3,
            strokeDasharray: '0'
          },
          markerEnd: {
            type: 'arrowclosed',
            color: '#7c3aed'
          }
        });

        // Adicionar nós de líderes do supervisor
        supervisor.leaders.forEach((leader, leaderIndex) => {
          const leaderId = `leader-${pastor.email}-${supervisor.email}-${leader.email}`;
          const leaderX = supervisorX + (leaderIndex - (supervisor.leaders.length - 1) / 2) * 200;
          const leaderY = supervisorY + levelHeight;

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
            style: { 
              stroke: '#dc2626', 
              strokeWidth: 3,
              strokeDasharray: '0'
            },
            markerEnd: {
              type: 'arrowclosed',
              color: '#dc2626'
            }
          });

          // Adicionar nós de connects do líder
          leader.connects.forEach((connect, connectIndex) => {
            const connectId = `connect-${pastor.email}-${supervisor.email}-${leader.email}-${connect.id}`;
            const connectX = leaderX + (connectIndex - (leader.connects.length - 1) / 2) * 150;
            const connectY = leaderY + levelHeight;

            nodes.push({
              id: connectId,
              type: 'connect',
              position: { x: connectX, y: connectY },
              data: {
                name: connect.name,
                number: connect.number,
                weekday: connect.weekday,
                time: connect.time,
                address: connect.address,
                memberCount: connect.members?.length || 0
              }
            });

            // Conectar líder ao connect
            edges.push({
              id: `edge-${leaderId}-${connectId}`,
              source: leaderId,
              target: connectId,
              type: 'smoothstep',
              style: { 
                stroke: '#059669', 
                strokeWidth: 2,
                strokeDasharray: '0'
              },
              markerEnd: {
                type: 'arrowclosed',
                color: '#059669'
              }
            });
          });
        });
      });
    });

    // Atualizar posição Y para supervisores sem pastor
    yPosition = filteredData.pastors.length > 0 ? yPosition + (levelHeight * 4) : yPosition;

    // Adicionar nós de supervisores sem pastor
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
          style: { 
            stroke: '#dc2626', 
            strokeWidth: 3,
            strokeDasharray: '0'
          },
          markerEnd: {
            type: 'arrowclosed',
            color: '#dc2626'
          }
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
            style: { 
              stroke: '#dc2626', 
              strokeWidth: 2,
              strokeDasharray: '0'
            },
            markerEnd: {
              type: 'arrowclosed',
              color: '#dc2626'
            }
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
           style: { 
             stroke: '#dc2626', 
             strokeWidth: 2,
             strokeDasharray: '0'
           },
           markerEnd: {
             type: 'arrowclosed',
             color: '#dc2626'
           }
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
  }, [filteredData, hierarchyData]);

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

  // Estilos customizados para as arestas
  const edgeStyles = `
    .react-flow__edge-path {
      stroke: #991b1b !important;
      stroke-width: 2px !important;
    }
    .react-flow__edge {
      pointer-events: all !important;
    }
    .react-flow__arrowhead {
      fill: #991b1b !important;
    }
  `;

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
      {hasAddressData(connect) && (
        <div className="mt-2 flex items-center space-x-1 text-sm text-gray-600">
          <MapPin size={12} />
          <span>{formatFullAddress(connect)}</span>
        </div>
      )}
      {!hasAddressData(connect) && connect.address && (
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
              <option value="pastor">Pastores</option>
              <option value="supervisor">Supervisores</option>
              <option value="leader">Líderes</option>
              <option value="connect">Connects</option>
            </select>
          </div>
        </div>
      </div>

      {viewMode === 'flow' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ height: '600px' }}>
          <style>{edgeStyles}</style>
          <ReactFlow
            ref={reactFlowWrapper}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultEdgeOptions={{
              type: 'smoothstep',
              style: { stroke: '#991b1b', strokeWidth: 2 },
              markerEnd: { type: 'arrowclosed', color: '#991b1b' }
            }}
            fitView
            fitViewOptions={{ padding: 0.2, duration: 200 }}
            elementsSelectable={true}
            nodesConnectable={false}
            nodesDraggable={true}
            onResize={debouncedResize}
            preventScrolling={false}
            attributionPosition="bottom-left"
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
          >
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case 'supervisor': return '#991b1b';
                  case 'leader': return '#7f1d1d';
                  case 'connect': return '#450a0a';
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
        filteredData.supervisors.length === 0 && filteredData.leadersWithoutSupervisor.length === 0 && filteredData.orphanConnects.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg text-center">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhuma hierarquia encontrada</h3>
            <p className="text-gray-500">
              {searchTerm || filterType !== 'all' 
                ? 'Nenhum resultado encontrado para os filtros aplicados.' 
                : 'Não há connects com líderes ou supervisores cadastrados.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredData.supervisors.map((supervisor) => (
              <SupervisorCard key={supervisor.email} supervisor={supervisor} />
            ))}
            {filteredData.leadersWithoutSupervisor.map((leader) => (
              <LeaderCard key={leader.email} leader={leader} />
            ))}
            {filteredData.orphanConnects.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
                  <Users size={20} className="mr-2" />
                  Connects sem Líder/Supervisor
                </h3>
                <div className="space-y-2">
                  {filteredData.orphanConnects.map(connect => (
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