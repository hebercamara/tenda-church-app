// Dados de exemplo para desenvolvimento e testes
export const sampleMembers = [
  // Pastor
  {
    id: '1',
    name: 'Pastor Roberto Silva',
    email: 'pastor.roberto@email.com',
    phone: '(11) 99999-1111',
    birthDate: new Date('1975-05-15'),
    address: 'Rua das Flores, 123',
    role: 'Pastor',
    connectId: null,
    status: 'Ativo',
    joinDate: new Date('2020-01-15')
  },
  // Supervisores
  {
    id: '2',
    name: 'Supervisor Maria Santos',
    email: 'supervisor.maria@email.com',
    phone: '(11) 99999-2222',
    birthDate: new Date('1985-08-22'),
    address: 'Av. Principal, 456',
    role: 'Supervisor',
    connectId: null,
    status: 'Ativo',
    joinDate: new Date('2021-03-10')
  },
  {
    id: '3',
    name: 'Supervisor Pedro Oliveira',
    email: 'supervisor.pedro@email.com',
    phone: '(11) 99999-3333',
    birthDate: new Date('1982-12-03'),
    address: 'Rua da Paz, 789',
    role: 'Supervisor',
    connectId: null,
    status: 'Ativo',
    joinDate: new Date('2021-06-20')
  },
  // Líderes
  {
    id: '4',
    name: 'Líder Ana Costa',
    email: 'lider.ana@email.com',
    phone: '(11) 99999-4444',
    birthDate: new Date('1988-03-18'),
    address: 'Rua da Esperança, 321',
    role: 'Líder',
    connectId: 'connect1',
    status: 'Ativo',
    joinDate: new Date('2022-02-28')
  },
  {
    id: '5',
    name: 'Líder Carlos Ferreira',
    email: 'lider.carlos@email.com',
    phone: '(11) 99999-5555',
    birthDate: new Date('1990-07-11'),
    address: 'Av. da Liberdade, 654',
    role: 'Líder',
    connectId: 'connect2',
    status: 'Ativo',
    joinDate: new Date('2022-01-05')
  },
  {
    id: '6',
    name: 'Líder Fernanda Lima',
    email: 'lider.fernanda@email.com',
    phone: '(11) 99999-6666',
    birthDate: new Date('1992-04-25'),
    address: 'Rua da Alegria, 987',
    role: 'Líder',
    connectId: 'connect3',
    status: 'Ativo',
    joinDate: new Date('2022-05-15')
  },
  {
    id: '7',
    name: 'Líder João Mendes',
    email: 'lider.joao@email.com',
    phone: '(11) 99999-7777',
    birthDate: new Date('1987-09-12'),
    address: 'Av. da Esperança, 456',
    role: 'Líder',
    connectId: 'connect4',
    status: 'Ativo',
    joinDate: new Date('2022-08-20')
  },
  // Membros
  {
    id: '8',
    name: 'João Silva',
    email: 'joao.silva@email.com',
    phone: '(11) 99999-8888',
    birthDate: new Date('1995-05-15'),
    address: 'Rua das Flores, 123',
    role: 'Membro',
    connectId: 'connect1',
    status: 'Ativo',
    joinDate: new Date('2023-01-15')
  },
  {
    id: '9',
    name: 'Mariana Souza',
    email: 'mariana.souza@email.com',
    phone: '(11) 99999-9999',
    birthDate: new Date('1993-11-08'),
    address: 'Rua da Paz, 789',
    role: 'Membro',
    connectId: 'connect2',
    status: 'Ativo',
    joinDate: new Date('2023-03-20')
  },
  {
    id: '10',
    name: 'Admin Sistema',
    email: 'admin@email.com',
    phone: '(11) 99999-0000',
    birthDate: new Date('1980-01-01'),
    address: 'Endereço Admin',
    role: 'Admin',
    connectId: null,
    status: 'Ativo',
    joinDate: new Date('2020-01-01')
  }
];

export const sampleConnects = [
  {
    id: 'connect1',
    name: 'Connect Jovens',
    description: 'Grupo de jovens da igreja',
    leaderId: '4', // Líder Ana Costa
    leaderEmail: 'lider.ana@email.com',
    supervisorEmail: 'supervisor.maria@email.com',
    pastorEmail: 'pastor.roberto@email.com',
    location: 'Sala 1',
    schedule: 'Sábados 19h',
    status: 'Ativo',
    createdDate: new Date('2022-01-01')
  },
  {
    id: 'connect2',
    name: 'Connect Famílias',
    description: 'Grupo para famílias',
    leaderId: '5', // Líder Carlos Ferreira
    leaderEmail: 'lider.carlos@email.com',
    supervisorEmail: 'supervisor.maria@email.com',
    pastorEmail: 'pastor.roberto@email.com',
    location: 'Sala 2',
    schedule: 'Domingos 18h',
    status: 'Ativo',
    createdDate: new Date('2022-02-01')
  },
  {
    id: 'connect3',
    name: 'Connect Mulheres',
    description: 'Grupo de mulheres',
    leaderId: '6', // Líder Fernanda Lima
    leaderEmail: 'lider.fernanda@email.com',
    supervisorEmail: 'supervisor.pedro@email.com',
    pastorEmail: 'pastor.roberto@email.com',
    location: 'Sala 3',
    schedule: 'Quartas 20h',
    status: 'Ativo',
    createdDate: new Date('2022-03-01')
  },
  {
    id: 'connect4',
    name: 'Connect Homens',
    description: 'Grupo de homens da igreja',
    leaderId: '7', // Líder João Mendes
    leaderEmail: 'lider.joao@email.com',
    supervisorEmail: 'supervisor.pedro@email.com',
    pastorEmail: 'pastor.roberto@email.com',
    location: 'Sala 4',
    schedule: 'Sextas 20h',
    status: 'Ativo',
    createdDate: new Date('2022-04-01')
  },
  {
    id: 'connect5',
    name: 'Connect Sem Supervisor',
    description: 'Connect direto com líder (sem supervisor)',
    leaderId: '4', // Líder Ana Costa
    leaderEmail: 'lider.ana@email.com',
    supervisorEmail: null,
    pastorEmail: null,
    location: 'Sala 5',
    schedule: 'Terças 19h',
    status: 'Ativo',
    createdDate: new Date('2022-05-01')
  },
  {
    id: 'connect6',
    name: 'Connect Órfão',
    description: 'Connect sem hierarquia definida',
    leaderId: null,
    leaderEmail: null,
    supervisorEmail: null,
    pastorEmail: null,
    location: 'Sala 6',
    schedule: 'Quintas 20h',
    status: 'Ativo',
    createdDate: new Date('2022-06-01')
  }
];

export const sampleCourses = [
  {
    id: 'course1',
    name: 'Fundamentos da Fé',
    description: 'Curso básico sobre os fundamentos da fé cristã',
    instructorId: '4',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-03-15'),
    schedule: 'Terças 19h30',
    location: 'Auditório',
    maxStudents: 30,
    status: 'Em Andamento',
    category: 'Discipulado'
  },
  {
    id: 'course2',
    name: 'Liderança Cristã',
    description: 'Desenvolvimento de líderes cristãos',
    instructorId: '2',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-04-01'),
    schedule: 'Quintas 20h',
    location: 'Sala de Reuniões',
    maxStudents: 20,
    status: 'Em Andamento',
    category: 'Liderança'
  },
  {
    id: 'course3',
    name: 'Evangelismo Pessoal',
    description: 'Como compartilhar o evangelho',
    instructorId: '3',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-05-01'),
    schedule: 'Sábados 16h',
    location: 'Sala 1',
    maxStudents: 25,
    status: 'Planejado',
    category: 'Evangelismo'
  }
];

export const sampleConnectReports = [
  {
    id: 'report1',
    connectId: 'connect1',
    reportDate: new Date('2024-01-20'),
    attendance: {
      '1': 'presente',
      '2': 'presente',
      '5': 'ausente'
    },
    guests: 2,
    offering: 150.00,
    notes: 'Ótima reunião, muita participação',
    reportedBy: '2'
  },
  {
    id: 'report2',
    connectId: 'connect2',
    reportDate: new Date('2024-01-21'),
    attendance: {
      '3': 'presente',
      '4': 'presente'
    },
    guests: 1,
    offering: 200.00,
    notes: 'Discussão produtiva sobre família',
    reportedBy: '3'
  },
  {
    id: 'report3',
    connectId: 'connect1',
    reportDate: new Date('2024-01-27'),
    attendance: {
      '1': 'presente',
      '2': 'presente',
      '5': 'presente'
    },
    guests: 3,
    offering: 180.00,
    notes: 'Novos visitantes interessados',
    reportedBy: '2'
  }
];

export const sampleCourseTemplates = [
  {
    id: 'template1',
    name: 'Template Discipulado Básico',
    description: 'Template para cursos de discipulado básico',
    duration: '8 semanas',
    category: 'Discipulado',
    lessons: [
      'Salvação',
      'Batismo',
      'Oração',
      'Leitura Bíblica',
      'Comunhão',
      'Serviço',
      'Evangelismo',
      'Crescimento Espiritual'
    ]
  },
  {
    id: 'template2',
    name: 'Template Liderança',
    description: 'Template para desenvolvimento de líderes',
    duration: '12 semanas',
    category: 'Liderança',
    lessons: [
      'Chamado para Liderar',
      'Caráter do Líder',
      'Visão e Propósito',
      'Comunicação Eficaz',
      'Trabalho em Equipe',
      'Resolução de Conflitos',
      'Mentoria',
      'Delegação',
      'Tomada de Decisões',
      'Gestão do Tempo',
      'Desenvolvimento de Pessoas',
      'Legado de Liderança'
    ]
  }
];

export const sampleLeadershipTracks = [
  {
    id: 'track1',
    name: 'Trilha de Liderança Jovem',
    description: 'Desenvolvimento de líderes jovens',
    level: 'Iniciante',
    courses: ['course1', 'course2'],
    prerequisites: [],
    estimatedDuration: '6 meses'
  },
  {
    id: 'track2',
    name: 'Trilha de Supervisão',
    description: 'Formação de supervisores',
    level: 'Intermediário',
    courses: ['course2', 'course3'],
    prerequisites: ['track1'],
    estimatedDuration: '4 meses'
  }
];

export const sampleOperationStatus = [
  {
    id: 'status1',
    area: 'Connects',
    status: 'Operacional',
    lastUpdate: new Date(),
    issues: []
  },
  {
    id: 'status2',
    area: 'Cursos',
    status: 'Operacional',
    lastUpdate: new Date(),
    issues: []
  },
  {
    id: 'status3',
    area: 'Membros',
    status: 'Operacional',
    lastUpdate: new Date(),
    issues: []
  }
];