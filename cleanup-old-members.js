// Script para limpar membros do caminho antigo
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, doc } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = process.env.REACT_APP_FIREBASE_PROJECT_ID;

async function cleanupOldMembers() {
  try {
    console.log('🔍 Verificando membros no caminho antigo...');
    
    // Verificar caminho antigo
    const oldPath = `apps/${appId}/members`;
    const oldCollection = collection(db, oldPath);
    const oldSnapshot = await getDocs(oldCollection);
    
    console.log(`📊 Encontrados ${oldSnapshot.size} membros no caminho antigo: ${oldPath}`);
    
    if (oldSnapshot.size === 0) {
      console.log('✅ Nenhum membro encontrado no caminho antigo. Nada para limpar.');
      return;
    }
    
    // Verificar caminho novo para comparação
    const newPath = `artifacts/${appId}/public/data/members`;
    const newCollection = collection(db, newPath);
    const newSnapshot = await getDocs(newCollection);
    
    console.log(`📊 Encontrados ${newSnapshot.size} membros no caminho novo: ${newPath}`);
    
    // Listar membros do caminho antigo
    console.log('\n📋 Membros no caminho antigo:');
    oldSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.name || 'Nome não definido'} (ID: ${doc.id})`);
    });
    
    // Confirmar exclusão
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise((resolve) => {
      rl.question('\n❓ Deseja excluir TODOS os membros do caminho antigo? (digite "SIM" para confirmar): ', resolve);
    });
    
    rl.close();
    
    if (answer !== 'SIM') {
      console.log('❌ Operação cancelada pelo usuário.');
      return;
    }
    
    // Executar exclusão em lotes
    console.log('🗑️ Iniciando exclusão dos membros do caminho antigo...');
    
    const batch = writeBatch(db);
    let deleteCount = 0;
    
    oldSnapshot.docs.forEach((docSnapshot) => {
      const docRef = doc(db, oldPath, docSnapshot.id);
      batch.delete(docRef);
      deleteCount++;
    });
    
    await batch.commit();
    
    console.log(`✅ Exclusão concluída! ${deleteCount} membros removidos do caminho antigo.`);
    console.log('💾 Economia de armazenamento: dados duplicados removidos.');
    console.log(`📍 Membros continuam disponíveis no caminho correto: ${newPath}`);
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  }
}

// Executar limpeza
cleanupOldMembers().then(() => {
  console.log('\n🏁 Script finalizado.');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});