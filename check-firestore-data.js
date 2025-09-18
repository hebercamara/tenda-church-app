// Script para verificar dados no Firestore sem autenticação
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, getDocs } from 'firebase/firestore';

// Configuração mínima do Firebase (sem auth)
const firebaseConfig = {
  projectId: "your_project_id_here", // Mesmo valor do .env
  // Removemos apiKey para evitar erro de autenticação
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = "your_app_id_here"; // Mesmo valor do .env

console.log('🔍 Verificando dados no Firestore...');
console.log('📋 Configuração:', { projectId: firebaseConfig.projectId, appId });

async function checkFirestoreData() {
  try {
    // Verificar caminho de importação
    console.log('\n🔍 Verificando caminho de importação...');
    const importPath = `artifacts/${appId}/public/data/members`;
    console.log('📂 Caminho:', importPath);
    
    try {
      const importCollection = collection(db, importPath);
      const importSnapshot = await getDocs(importCollection);
      console.log('📊 Membros encontrados no caminho de importação:', importSnapshot.size);
      
      if (importSnapshot.size > 0) {
        console.log('✅ Dados encontrados no caminho de importação!');
        importSnapshot.docs.slice(0, 3).forEach((doc, index) => {
          console.log(`👤 Membro ${index + 1}:`, { id: doc.id, name: doc.data().name });
        });
      }
    } catch (importError) {
      console.log('❌ Erro no caminho de importação:', importError.message);
    }
    
    // Verificar caminho do app
    console.log('\n🔍 Verificando caminho do app...');
    const appPath = `apps/${appId}/members`;
    console.log('📂 Caminho:', appPath);
    
    try {
      const appCollection = collection(db, appPath);
      const appSnapshot = await getDocs(appCollection);
      console.log('📊 Membros encontrados no caminho do app:', appSnapshot.size);
      
      if (appSnapshot.size > 0) {
        console.log('✅ Dados encontrados no caminho do app!');
        appSnapshot.docs.slice(0, 3).forEach((doc, index) => {
          console.log(`👤 Membro ${index + 1}:`, { id: doc.id, name: doc.data().name });
        });
      }
    } catch (appError) {
      console.log('❌ Erro no caminho do app:', appError.message);
    }
    
    // Verificar outros caminhos possíveis
    console.log('\n🔍 Verificando outros caminhos possíveis...');
    const otherPaths = [
      'members',
      `${appId}/members`,
      `projects/${appId}/members`
    ];
    
    for (const path of otherPaths) {
      try {
        console.log(`📂 Verificando: ${path}`);
        const collection_ref = collection(db, path);
        const snapshot = await getDocs(collection_ref);
        console.log(`📊 Documentos encontrados em ${path}:`, snapshot.size);
        
        if (snapshot.size > 0) {
          console.log(`✅ Dados encontrados em ${path}!`);
          snapshot.docs.slice(0, 2).forEach((doc, index) => {
            console.log(`👤 Documento ${index + 1}:`, { id: doc.id, data: doc.data() });
          });
        }
      } catch (error) {
        console.log(`❌ Erro em ${path}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkFirestoreData().then(() => {
  console.log('\n🏁 Verificação concluída.');
}).catch(error => {
  console.error('❌ Erro na verificação:', error);
});