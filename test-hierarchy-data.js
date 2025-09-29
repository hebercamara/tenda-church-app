// Script para testar os dados de hierarquia
const { sampleMembers, sampleConnects } = require('./src/data/sampleData.js');

console.log('=== TESTE DOS DADOS DE HIERARQUIA ===\n');

console.log('Membros carregados:', sampleMembers.length);
console.log('Connects carregados:', sampleConnects.length);

console.log('\n=== MEMBROS POR ROLE ===');
const membersByRole = sampleMembers.reduce((acc, member) => {
  acc[member.role] = (acc[member.role] || 0) + 1;
  return acc;
}, {});
console.log(membersByRole);

console.log('\n=== CONNECTS COM HIERARQUIA ===');
sampleConnects.forEach(connect => {
  console.log(`${connect.name}:`);
  console.log(`  Pastor: ${connect.pastorEmail || 'N/A'}`);
  console.log(`  Supervisor: ${connect.supervisorEmail || 'N/A'}`);
  console.log(`  Líder: ${connect.leaderEmail || 'N/A'}`);
  console.log('');
});

console.log('\n=== VERIFICAÇÃO DE EMAILS ===');
const allEmails = sampleMembers.map(m => m.email);
sampleConnects.forEach(connect => {
  if (connect.pastorEmail && !allEmails.includes(connect.pastorEmail)) {
    console.log(`❌ Pastor não encontrado: ${connect.pastorEmail} (Connect: ${connect.name})`);
  }
  if (connect.supervisorEmail && !allEmails.includes(connect.supervisorEmail)) {
    console.log(`❌ Supervisor não encontrado: ${connect.supervisorEmail} (Connect: ${connect.name})`);
  }
  if (connect.leaderEmail && !allEmails.includes(connect.leaderEmail)) {
    console.log(`❌ Líder não encontrado: ${connect.leaderEmail} (Connect: ${connect.name})`);
  }
});

console.log('\n=== ESTRUTURA DE HIERARQUIA ESPERADA ===');
const connectsByPastor = {};
const connectsBySupervisor = {};
const connectsByLeader = {};
const orphanConnects = [];

sampleConnects.forEach(connect => {
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

console.log('Pastores com connects:', Object.keys(connectsByPastor).length);
console.log('Supervisores sem pastor:', Object.keys(connectsBySupervisor).length);
console.log('Líderes sem supervisor:', Object.keys(connectsByLeader).length);
console.log('Connects órfãos:', orphanConnects.length);